/**
 * Cloudflare Pages Function: /api/contact
 * Handles contact form submissions for Blue Cube Architects.
 * - Validates: honeypot, Turnstile, field constraints
 * - Persists validated enquiry to Firestore (inquiries collection) via REST API
 * - Dispatches studio email notification via Resend REST API
 *
 * Additional environment variables for Firestore persistence:
 *   FIREBASE_PROJECT_ID           - plain variable (default: bluecube-49ae8)
 *   FIREBASE_SERVICE_ACCOUNT_JSON - secret variable (service account JSON string)
 */

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1. Parse incoming payload (support JSON and multipart/urlencoded FormData)
  let data = {};
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('form') || contentType.includes('multipart')) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        data[key] = typeof value === 'string' ? value.trim() : value;
      }
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported Content-Type header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 2. Anti-spam Honeypot Check (Silently drop bots)
  const honeypot = data.company_website_url || data.honeypot || '';
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    console.warn('[Honeypot Triggered] Silent drop for bot inquiry');
    return new Response(JSON.stringify({ success: true, message: 'Enquiry received' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 3. Client IP Identification
  const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';

  // 4. Optional Workers KV Rate Limiting (active only if RATE_LIMIT_KV is bound)
  if (env && env.RATE_LIMIT_KV && typeof env.RATE_LIMIT_KV.get === 'function') {
    const rateLimitKey = `rate_limit:contact:${clientIp}`;
    const currentCount = parseInt((await env.RATE_LIMIT_KV.get(rateLimitKey)) || '0', 10);
    if (currentCount >= 5) {
      return new Response(JSON.stringify({ error: 'Too many submissions. Please wait 10 minutes.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    await env.RATE_LIMIT_KV.put(rateLimitKey, String(currentCount + 1), { expirationTtl: 600 });
  }

  // 5. Cloudflare Turnstile Verification (Required when TURNSTILE_SECRET is set)
  const turnstileSecret = env?.TURNSTILE_SECRET;
  if (turnstileSecret) {
    const token = data['cf-turnstile-response'] || data.turnstile_token;
    if (!token) {
      return new Response(JSON.stringify({ error: 'Cloudflare Turnstile verification token missing' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const verifyFormData = new FormData();
      verifyFormData.append('secret', turnstileSecret);
      verifyFormData.append('response', token);
      if (clientIp && clientIp !== 'unknown') {
        verifyFormData.append('remoteip', clientIp);
      }

      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: verifyFormData
      });

      const outcome = await verifyRes.json();
      if (!outcome.success) {
        console.warn('[Turnstile Failed]', outcome);
        return new Response(JSON.stringify({ error: 'Turnstile verification failed. Please try again.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (turnstileErr) {
      console.error('[Turnstile Error]', turnstileErr);
      return new Response(JSON.stringify({ error: 'Turnstile verification service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // 6. Strict Field Validation
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
  const type = typeof data.type === 'string' ? data.type.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  if (!name || name.length > 120) {
    return new Response(JSON.stringify({ error: 'Valid name required (max 120 characters)' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 160) {
    return new Response(JSON.stringify({ error: 'Valid email address required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!phone || phone.length > 30) {
    return new Response(JSON.stringify({ error: 'Valid telephone number required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!type || type.length > 100) {
    return new Response(JSON.stringify({ error: 'Project typology selection required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (message.length > 4000) {
    return new Response(JSON.stringify({ error: 'Message must not exceed 4000 characters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 7. Dispatch via Resend REST API (if RESEND_API_KEY is configured)
  const resendApiKey = env?.RESEND_API_KEY;
  let emailDispatched = false;
  let emailError = null;

  if (resendApiKey) {
    const contactTo = env?.CONTACT_TO || 'design@bluecube.co.in';
    const cleanDigits = phone.replace(/\D/g, '');
    const waLink = `https://wa.me/91${cleanDigits.startsWith('91') ? cleanDigits.slice(2) : cleanDigits}`;

    const textBody = `NEW PROJECT ENQUIRY — BLUE CUBE ARCHITECTS
--------------------------------------------
Name:      ${name}
Email:     ${email}
Phone:     ${phone}
WhatsApp:  ${waLink}
Typology:  ${type}
Message:   ${message || '(No site context provided)'}

Timestamp: ${new Date().toISOString()}
Client IP: ${clientIp}
`;

    const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Project Enquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1c1a17; background-color: #faf9f6; margin: 0; padding: 24px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e3de; padding: 32px;">
    <h2 style="font-family: Georgia, serif; font-size: 24px; margin-top: 0; color: #1c1a17; border-bottom: 2px solid #1c1a17; padding-bottom: 12px;">New Project Enquiry</h2>
    <p style="font-size: 14px; color: #6b675e; margin-bottom: 24px;">Received via bluecube.co.in studio portal</p>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 140px;">Client Name</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapeHTML(name)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Email</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHTML(email)}" style="color: #1c1a17;">${escapeHTML(email)}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Phone</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
          <a href="tel:${escapeHTML(phone)}" style="color: #1c1a17;">${escapeHTML(phone)}</a>
          &nbsp;&bull;&nbsp;
          <a href="${escapeHTML(waLink)}" style="color: #1c1a17; text-decoration: underline;" target="_blank">Direct WhatsApp</a>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">Project Typology</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escapeHTML(type)}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; vertical-align: top;">Details / Context</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #eee; white-space: pre-wrap; line-height: 1.6;">${escapeHTML(message || '(No additional details provided)')}</td>
      </tr>
    </table>
    <div style="margin-top: 32px; font-size: 12px; color: #999; text-align: center;">
      Blue Cube Architects &bull; K-95, 16th Street, Anna Nagar East, Chennai &ndash; 600102
    </div>
  </div>
</body>
</html>`;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env?.RESEND_FROM || 'Blue Cube Architects <onboarding@resend.dev>',
          to: [contactTo],
          reply_to: email,
          subject: `[Enquiry] ${name} — ${type}`,
          text: textBody,
          html: htmlBody
        })
      });

      if (resendRes.ok) {
        emailDispatched = true;
      } else {
        const errJson = await resendRes.text();
        console.error('[Resend Error]', resendRes.status, errJson);
        emailError = `Resend API returned status ${resendRes.status}`;
      }
    } catch (resendErr) {
      console.error('[Resend Fetch Exception]', resendErr);
      emailError = resendErr.message;
    }
  } else {
    console.info('[Notice] RESEND_API_KEY is not configured in environment. Skipping email dispatch.');
  }

  // 8. Persist to Firestore (non-blocking — do not fail the response if this errors)
  context.waitUntil
    ? context.waitUntil(persistEnquiryToFirestore(env, { name, email, phone, type, message, clientIp, timestamp: Date.now() }))
    : persistEnquiryToFirestore(env, { name, email, phone, type, message, clientIp, timestamp: Date.now() }).catch(() => {});

  return new Response(JSON.stringify({
    success: true,
    message: 'Thank you for contacting Blue Cube Architects. Your inquiry has been routed to our studio team.',
    emailDispatched,
    warning: emailError || undefined
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── Firestore persistence via REST API ────────────────────────────────────────
// Writes the validated enquiry to Firestore (inquiries collection).
// Requires FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_PROJECT_ID env vars.
async function persistEnquiryToFirestore(env, { name, email, phone, type, message, clientIp, timestamp }) {
  const serviceAccountJson = env?.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = env?.FIREBASE_PROJECT_ID || 'bluecube-49ae8';
  const apiKey = env?.FIREBASE_API_KEY;

  if (!serviceAccountJson && !apiKey) return;

  // Firestore REST document structure
  const doc = {
    fields: {
      name:        { stringValue: name },
      email:       { stringValue: email },
      phone:       { stringValue: phone },
      type:        { stringValue: type },
      message:     { stringValue: message || '' },
      status:      { stringValue: 'new' },
      clientIp:    { stringValue: clientIp || '' },
      submittedAt: { timestampValue: new Date(timestamp).toISOString() },
    }
  };

  let firestoreUrl =
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/inquiries`;
  const headers = { 'Content-Type': 'application/json' };

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      const accessToken = await getServiceAccountAccessToken(serviceAccount);
      headers['Authorization'] = `Bearer ${accessToken}`;
    } catch (err) {
      console.error('[contact] Failed to get Firebase access token from service account:', err);
      if (apiKey) {
        firestoreUrl += `?key=${apiKey}`;
      } else {
        return;
      }
    }
  } else if (apiKey) {
    firestoreUrl += `?key=${apiKey}`;
  }

  try {
    const res = await fetch(firestoreUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(doc),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[contact] Firestore write failed:', res.status, errText);
    } else {
      console.info('[contact] Enquiry persisted to Firestore inquiries collection');
    }
  } catch (err) {
    console.error('[contact] Firestore fetch error:', err);
  }
}

async function getServiceAccountAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const b64 = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const headerB64  = b64(JSON.stringify(header));
  const payloadB64 = b64(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const keyBinary = atob(pem);
  const keyBuffer = new Uint8Array(keyBinary.length);
  for (let i = 0; i < keyBinary.length; i++) keyBuffer[i] = keyBinary.charCodeAt(i);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBuffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput));
  const sigBytes = new Uint8Array(sigBuffer);
  let sigBinary = '';
  for (const byte of sigBytes) sigBinary += String.fromCharCode(byte);
  const sigB64 = b64(sigBinary);

  const jwt = `${signingInput}.${sigB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await tokenRes.json();
  return data.access_token;
}
