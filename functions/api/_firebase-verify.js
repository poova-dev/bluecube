/**
 * Shared Firebase ID Token Verifier for Cloudflare Workers / Pages Functions
 *
 * Verifies a Firebase ID token (RS256 JWT) using Google's public certs.
 * Caches the public keys in-memory within a single Worker invocation.
 *
 * Usage:
 *   import { verifyFirebaseToken } from './_firebase-verify.js';
 *   const payload = await verifyFirebaseToken(idToken, projectId);
 *   if (!payload) { // invalid token }
 *   if (!payload.admin) { // not an admin }
 *
 * Returns the decoded JWT payload object on success, or null on failure.
 */

const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

// In-module cache valid for the Worker lifetime
let _cachedCerts = null;
let _certsExpiry  = 0;

export async function verifyFirebaseToken(idToken, projectId) {
  if (!idToken || typeof idToken !== 'string') return null;

  // ── 1. Split and decode JWT parts ──────────────────────────────────────────
  const parts = idToken.split('.');
  if (parts.length !== 3) return null;

  let header, payload;
  try {
    header  = JSON.parse(base64urlDecode(parts[0]));
    payload = JSON.parse(base64urlDecode(parts[1]));
  } catch {
    return null;
  }

  // ── 2. Standard claims validation ──────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);

  if (header.alg !== 'RS256')                   return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (payload.aud !== projectId)                return null;
  if (!payload.sub || typeof payload.sub !== 'string') return null;
  if (payload.exp <= now)                       return null;  // expired
  if (payload.iat >  now + 60)                  return null;  // issued in the future (allow 60s clock skew)
  if (!payload.auth_time || payload.auth_time > now + 60) return null;

  // ── 3. Fetch and cache Google public certs ─────────────────────────────────
  const certs = await getGoogleCerts();
  if (!certs) return null;

  const cert = certs[header.kid];
  if (!cert) return null;

  // ── 4. Verify signature ────────────────────────────────────────────────────
  try {
    const cryptoKey = await importPublicKeyFromPem(cert);
    const signingInput  = `${parts[0]}.${parts[1]}`;
    const signatureBytes = base64urlToBuffer(parts[2]);

    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      new TextEncoder().encode(signingInput)
    );

    if (!valid) return null;
  } catch (err) {
    console.error('[firebase-verify] Signature verification error:', err);
    return null;
  }

  return payload;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getGoogleCerts() {
  const now = Date.now();
  if (_cachedCerts && now < _certsExpiry) return _cachedCerts;

  try {
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok) return null;

    // Parse Cache-Control max-age for expiry
    const cc = res.headers.get('Cache-Control') || '';
    const maxAge = parseInt((cc.match(/max-age=(\d+)/) || [])[1] || '3600', 10);
    _certsExpiry = Date.now() + maxAge * 1000;
    _cachedCerts = await res.json();
    return _cachedCerts;
  } catch {
    return null;
  }
}

async function importPublicKeyFromPem(pem) {
  // Strip PEM headers and decode base64
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);

  // importKey from SPKI (the public cert) for RS256 verification
  return crypto.subtle.importKey(
    'raw', buffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  ).catch(() =>
    // Fallback: try importing as X.509 certificate (spki wrapped)
    crypto.subtle.importKey(
      'spki', extractSpkiFromCert(buffer),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
  );
}

// Extract the SubjectPublicKeyInfo from an X.509 DER certificate.
// This is a simplified parser that works for the Google RSA-2048 certs.
function extractSpkiFromCert(certDer) {
  // X.509 structure: SEQUENCE { tbsCertificate SEQUENCE { ... subjectPublicKeyInfo SEQUENCE { ... } } }
  // We walk the DER to find the subjectPublicKeyInfo.
  const view = new DataView(certDer.buffer);
  let offset = 0;

  function readLength(offset) {
    const first = view.getUint8(offset++);
    if (first < 0x80) return { len: first, end: offset };
    const numBytes = first & 0x7f;
    let len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | view.getUint8(offset++);
    }
    return { len, end: offset };
  }

  // Outer SEQUENCE (Certificate)
  offset++; // tag 0x30
  let { end: outerEnd } = readLength(offset); offset = outerEnd;

  // tbsCertificate SEQUENCE
  offset++; // tag 0x30
  let { len: tbsLen, end: tbsStart } = readLength(offset); offset = tbsStart;
  const tbsEnd = offset + tbsLen;

  // Skip version [0], serialNumber INTEGER, signature AlgorithmIdentifier,
  // issuer Name, validity Validity, subject Name — until we hit SEQUENCE (spki)
  // The spki is the first SEQUENCE after subject Name.
  // Simple approach: find the bitString BIT STRING that holds the public key.
  // For Google certs we can search for the RSA OID 2a 86 48 86 f7 0d 01 01 01
  const rsaOid = new Uint8Array([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]);
  const certBytes = new Uint8Array(certDer.buffer);

  for (let i = offset; i < tbsEnd - rsaOid.length; i++) {
    let match = true;
    for (let j = 0; j < rsaOid.length; j++) {
      if (certBytes[i + j] !== rsaOid[j]) { match = false; break; }
    }
    if (match) {
      // The SEQUENCE containing this OID starts 2 bytes before (tag + length)
      // Walk back to the SEQUENCE tag
      let spkiStart = i - 2;
      while (spkiStart > 0 && certBytes[spkiStart] !== 0x30) spkiStart--;
      // Read length of this SEQUENCE
      const lenByte = certBytes[spkiStart + 1];
      const spkiLen = lenByte < 0x80
        ? lenByte + 2
        : (lenByte & 0x7f) === 1
          ? certBytes[spkiStart + 2] + 3
          : certBytes[spkiStart + 2] * 256 + certBytes[spkiStart + 3] + 4;
      return certBytes.slice(spkiStart, spkiStart + spkiLen).buffer;
    }
  }

  // Fallback: return whole cert buffer and let the browser engine decide
  return certDer.buffer;
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  return atob(pad ? padded + '='.repeat(4 - pad) : padded);
}

function base64urlToBuffer(str) {
  const decoded = base64urlDecode(str);
  const buffer = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) buffer[i] = decoded.charCodeAt(i);
  return buffer;
}

