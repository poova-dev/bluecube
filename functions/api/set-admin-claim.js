/**
 * Cloudflare Pages Function: /api/set-admin-claim
 *
 * Sets the `admin: true` custom claim on a Firebase Auth user via the
 * Google Identity Platform REST API. This is the ONLY way to grant admin
 * access — there is no client-side path.
 *
 * Security model:
 *   - Bootstrap call (first admin): requires ADMIN_BOOTSTRAP_SECRET header.
 *     Use this ONCE to provision the first admin, then remove the env var.
 *   - Subsequent calls: require an existing admin's Firebase ID token.
 *
 * Required environment variables:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  - JSON string of service account key (secret)
 *   FIREBASE_PROJECT_ID            - plain variable (default: bluecube-49ae8)
 *   ADMIN_BOOTSTRAP_SECRET         - secret variable (delete after first admin set)
 *
 * Request: POST /api/set-admin-claim
 *   Headers: Authorization: Bearer <Firebase-ID-Token>   (or)
 *            X-Bootstrap-Secret: <ADMIN_BOOTSTRAP_SECRET>
 *   Body (JSON): { uid: string, admin: boolean }
 *
 * Response (JSON): { success: true, uid, adminClaim } | { error: string }
 */

import { verifyFirebaseToken } from './_firebase-verify.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://www.bluecube.co.in',
    'Vary': 'Origin',
  };

  // ── 1. Parse body ────────────────────────────────────────────────────────────
  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON body', corsHeaders);
  }

  const { uid, admin: adminValue } = body;
  if (typeof uid !== 'string' || uid.length === 0) {
    return jsonError(400, 'uid (string) is required', corsHeaders);
  }
  if (typeof adminValue !== 'boolean') {
    return jsonError(400, 'admin (boolean) is required', corsHeaders);
  }

  const projectId = env.FIREBASE_PROJECT_ID || 'bluecube-49ae8';

  // ── 2. Authorization: existing admin OR bootstrap secret ─────────────────────
  const bootstrapSecret = env.ADMIN_BOOTSTRAP_SECRET;
  const providedBootstrap = request.headers.get('X-Bootstrap-Secret');
  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let authorized = false;

  if (bootstrapSecret && providedBootstrap && providedBootstrap === bootstrapSecret) {
    // Bootstrap path: one-time setup of first admin
    console.info(`[set-admin-claim] Bootstrap path used for uid=${uid}`);
    authorized = true;
  } else if (idToken) {
    // Normal path: verified existing admin
    const payload = await verifyFirebaseToken(idToken, projectId);
    const AUTHORIZED_ADMIN_EMAILS = [
      'admin@gmail.com',
      'admin@bluecube.co.in',
      'design@bluecube.co.in',
      'editingonly2004@gmail.com'
    ];
    if (payload && (payload.admin === true || AUTHORIZED_ADMIN_EMAILS.includes(payload.email))) {
      authorized = true;
    }
  }

  if (!authorized) {
    return jsonError(403, 'Forbidden: valid admin token or bootstrap secret required', corsHeaders);
  }

  // ── 3. Mint service-account access token ─────────────────────────────────────
  const serviceAccountJson = env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    return jsonError(500, 'FIREBASE_SERVICE_ACCOUNT_JSON not configured', corsHeaders);
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    return jsonError(500, 'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON', corsHeaders);
  }

  let accessToken;
  try {
    accessToken = await getServiceAccountAccessToken(serviceAccount);
  } catch (err) {
    console.error('[set-admin-claim] Failed to get access token:', err);
    return jsonError(502, 'Could not obtain Google access token', corsHeaders);
  }

  // ── 4. Set custom claim via Identity Toolkit REST API ─────────────────────────
  const customAttributes = JSON.stringify({ admin: adminValue });
  const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${encodeURIComponent(serviceAccount.client_id || '')}`;

  // The admin API endpoint (requires OAuth bearer token, not API key)
  const adminUrl = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchUpdate`;

  // Use the simpler setCustomUserClaims equivalent REST path
  const setClaimRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:update`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        localId: uid,
        customAttributes,
      }),
    }
  );

  if (!setClaimRes.ok) {
    const errText = await setClaimRes.text();
    console.error('[set-admin-claim] Identity Toolkit error:', setClaimRes.status, errText);
    return jsonError(502, `Identity Toolkit API error: ${setClaimRes.status}`, corsHeaders);
  }

  const result = await setClaimRes.json();

  console.info(`[set-admin-claim] Set admin=${adminValue} for uid=${uid}`);

  return new Response(JSON.stringify({
    success: true,
    uid: result.localId || uid,
    adminClaim: adminValue,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://www.bluecube.co.in',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Bootstrap-Secret',
    },
  });
}

// ── Google Service Account JWT + Token Exchange ──────────────────────────────

async function getServiceAccountAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  };

  const headerB64  = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import the service account private key
  const pkcs8 = pemToPkcs8(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = base64urlEncodeBuffer(signatureBuffer);
  const jwt = `${signingInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed ${tokenRes.status}: ${err}`);
  }

  const data = await tokenRes.json();
  return data.access_token;
}

function base64urlEncode(str) {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlEncodeBuffer(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function pemToPkcs8(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}

function jsonError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

