/**
 * Cloudflare Pages Function: /api/publish
 *
 * Triggers a Cloudflare Pages production deploy hook so that the static site
 * is rebuilt (running build_portfolio.py from updated Firestore data) after
 * the admin saves content changes.
 *
 * Security: requires a valid Firebase ID token with admin: true custom claim.
 * Rate-limited to 1 publish per 60 seconds (via KV, if bound).
 *
 * Required environment variables:
 *   DEPLOY_HOOK_URL          - secret variable (Cloudflare Pages deploy hook URL)
 *   FIREBASE_PROJECT_ID      - plain variable (default: bluecube-49ae8)
 *
 * Optional:
 *   RATE_LIMIT_KV            - KV namespace binding for per-admin rate limiting
 *
 * Request: POST /api/publish
 *   Headers: Authorization: Bearer <Firebase-ID-Token>
 *   Body (JSON): { reason?: string }
 *
 * Response (JSON): { success: true, deployId?, triggeredAt } | { error: string }
 */

import { verifyFirebaseToken } from './_firebase-verify.js';

const PUBLISH_COOLDOWN_SECONDS = 60;

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://www.bluecube.co.in',
    'Vary': 'Origin',
  };

  // ── 1. Admin verification ───────────────────────────────────────────────────
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
    return jsonError(403, 'Admin privilege required to trigger a publish', corsHeaders);
  }

  const adminUid = tokenPayload.sub;

  // ── 2. Rate limiting (if KV is bound) ──────────────────────────────────────
  if (env.RATE_LIMIT_KV) {
    const rateLimitKey = `publish_cooldown:${adminUid}`;
    const existing = await env.RATE_LIMIT_KV.get(rateLimitKey);
    if (existing) {
      const remaining = Math.ceil(
        (parseInt(existing, 10) + PUBLISH_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
      );
      return jsonError(
        429,
        `Publish cooldown active. Try again in ${remaining}s.`,
        corsHeaders
      );
    }
    await env.RATE_LIMIT_KV.put(rateLimitKey, String(Date.now()), {
      expirationTtl: PUBLISH_COOLDOWN_SECONDS,
    });
  }

  // ── 3. Parse optional body ──────────────────────────────────────────────────
  let reason = 'Admin content update';
  try {
    const body = await request.json();
    if (body.reason && typeof body.reason === 'string') {
      reason = body.reason.slice(0, 200);
    }
  } catch { /* body is optional */ }

  // ── 4. Trigger Cloudflare Pages deploy hook ─────────────────────────────────
  const deployHookUrl = env.DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    console.warn('[publish] DEPLOY_HOOK_URL not configured — skipping deploy trigger');
    return new Response(JSON.stringify({
      success: true,
      warning: 'DEPLOY_HOOK_URL not configured. Content saved to Firestore but no rebuild was triggered.',
      triggeredAt: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  let deployId = null;
  try {
    const hookRes = await fetch(deployHookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (hookRes.ok) {
      const data = await hookRes.json().catch(() => ({}));
      deployId = data?.result?.id || null;
      console.info(`[publish] Deploy triggered by uid=${adminUid}. reason="${reason}" deployId=${deployId}`);
    } else {
      const errText = await hookRes.text();
      console.error('[publish] Deploy hook returned error:', hookRes.status, errText);
      return jsonError(502, `Deploy hook returned HTTP ${hookRes.status}`, corsHeaders);
    }
  } catch (err) {
    console.error('[publish] Deploy hook fetch failed:', err);
    return jsonError(502, 'Failed to reach deploy hook endpoint', corsHeaders);
  }

  return new Response(JSON.stringify({
    success: true,
    deployId,
    triggeredAt: new Date().toISOString(),
    message: 'Publish triggered. Changes will be live in ~60 seconds.',
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function jsonError(status, message, extraHeaders = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

