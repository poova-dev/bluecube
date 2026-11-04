/**
 * Cloudflare Pages Function: /api/cloudinary-sign
 *
 * Signs Cloudinary upload parameters server-side so the API secret is never
 * exposed to the browser. Only authenticated Bluecube admins may request a
 * signature (verified by checking the caller's Firebase ID token custom claim).
 *
 * Required environment variables (set in Cloudflare Pages → Settings → Variables):
 *   CLOUDINARY_API_KEY     - plain variable
 *   CLOUDINARY_API_SECRET  - secret variable
 *   CLOUDINARY_CLOUD_NAME  - plain variable (default: jvdlk3j0)
 *   FIREBASE_PROJECT_ID    - plain variable (default: bluecube-49ae8)
 *
 * Request: POST /api/cloudinary-sign
 *   Headers: Authorization: Bearer <Firebase-ID-Token>
 *   Body (JSON): { folder?, tags?, transformation?, public_id?, overwrite? }
 *
 * Response (JSON):
 *   { signature, timestamp, apiKey, cloudName, folder }
 */

import { verifyFirebaseToken } from './_firebase-verify.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // ── 1. CORS pre-flight guard ────────────────────────────────────────────────
  const origin = request.headers.get('Origin') || '';
  const allowedOrigins = [
    'https://www.bluecube.co.in',
    'https://bluecube.co.in',
    'http://localhost:8788',
    'http://localhost:3000',
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };

  // ── 2. Admin verification ───────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    return jsonError(401, 'Firebase ID token required', corsHeaders);
  }

  const projectId = env.FIREBASE_PROJECT_ID || 'bluecube-49ae8';
  const tokenPayload = await verifyFirebaseToken(idToken, projectId);

  if (!tokenPayload) {
    return jsonError(401, 'Invalid or expired Firebase ID token', corsHeaders);
  }

  const AUTHORIZED_ADMIN_EMAILS = [
    'admin@gmail.com',
    'admin@bluecube.co.in',
    'design@bluecube.co.in',
    'editingonly2004@gmail.com'
  ];
  const isAdmin = tokenPayload.admin === true || AUTHORIZED_ADMIN_EMAILS.includes(tokenPayload.email);
  if (!isAdmin) {
    return jsonError(403, 'Admin privilege required', corsHeaders);
  }

  // ── 3. Parse request body ───────────────────────────────────────────────────
  let body = {};
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Invalid JSON body', corsHeaders);
  }

  // ── 4. Build Cloudinary signature ──────────────────────────────────────────
  const apiSecret = env.CLOUDINARY_API_SECRET;
  const apiKey    = env.CLOUDINARY_API_KEY;
  const cloudName = env.CLOUDINARY_CLOUD_NAME || 'jvdlk3j0';

  if (!apiSecret || !apiKey) {
    console.error('[cloudinary-sign] CLOUDINARY_API_SECRET or API_KEY not configured');
    return jsonError(500, 'Cloudinary credentials not configured on server', corsHeaders);
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Build the params to sign (only include truthy values)
  const paramsToSign = {
    timestamp,
    ...(body.folder      ? { folder: body.folder }           : { folder: 'bluecube' }),
    ...(body.public_id   ? { public_id: body.public_id }     : {}),
    ...(body.tags        ? { tags: body.tags }               : {}),
    ...(body.overwrite   ? { overwrite: body.overwrite }     : {}),
    ...(body.transformation ? { transformation: body.transformation } : {}),
  };

  // Cloudinary expects params sorted alphabetically, joined as key=value&...
  const sortedString = Object.keys(paramsToSign)
    .sort()
    .map(k => `${k}=${paramsToSign[k]}`)
    .join('&') + apiSecret;

  const signature = await sha1Hex(sortedString);

  return new Response(JSON.stringify({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder: paramsToSign.folder,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions(context) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function sha1Hex(str) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function jsonError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

