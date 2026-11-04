import { onRequestPost as contactHandler }        from './functions/api/contact.js';
import { onRequestPost as cloudinarySignPost }    from './functions/api/cloudinary-sign.js';
import { onRequestOptions as cloudinarySignOpts } from './functions/api/cloudinary-sign.js';
import { onRequestPost as setAdminClaimPost }     from './functions/api/set-admin-claim.js';
import { onRequestOptions as setAdminClaimOpts }  from './functions/api/set-admin-claim.js';
import { onRequestPost as publishPost }           from './functions/api/publish.js';
import { onRequestOptions as publishOpts }        from './functions/api/publish.js';

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url);
    const path   = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method;

    // ── API routes ────────────────────────────────────────────────────────
    if (path === '/api/contact') {
      if (method === 'POST')    return contactHandler({ request, env, ...ctx });
      return methodNotAllowed();
    }

    if (path === '/api/cloudinary-sign') {
      if (method === 'POST')    return cloudinarySignPost({ request, env, ...ctx });
      if (method === 'OPTIONS') return cloudinarySignOpts({ request, env, ...ctx });
      return methodNotAllowed();
    }

    if (path === '/api/set-admin-claim') {
      if (method === 'POST')    return setAdminClaimPost({ request, env, ...ctx });
      if (method === 'OPTIONS') return setAdminClaimOpts({ request, env, ...ctx });
      return methodNotAllowed();
    }

    if (path === '/api/publish') {
      if (method === 'POST')    return publishPost({ request, env, ...ctx });
      if (method === 'OPTIONS') return publishOpts({ request, env, ...ctx });
      return methodNotAllowed();
    }

    if (path === '/api/firebase-config') {
      if (method === 'GET') {
        const projectId = env.FIREBASE_PROJECT_ID || 'bluecube-49ae8';
        return new Response(JSON.stringify({
          apiKey: env.FIREBASE_API_KEY || '',
          authDomain: `${projectId}.firebaseapp.com`,
          projectId: projectId,
          storageBucket: `${projectId}.firebasestorage.app`,
          messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '1038722936154',
          appId: env.FIREBASE_APP_ID || '1:1038722936154:web:e62e47c75f8af93247d763',
          measurementId: env.FIREBASE_MEASUREMENT_ID || 'G-N4VS2WR5YK'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
          }
        });
      }
      return methodNotAllowed();
    }

    // ── Static assets ─────────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  }
};

function methodNotAllowed() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
