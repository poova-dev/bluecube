import { onRequestPost } from './functions/api/contact.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route /api/contact requests to the contact handler
    if (url.pathname === '/api/contact' || url.pathname === '/api/contact/') {
      if (request.method === 'POST') {
        return onRequestPost({ request, env, ...ctx });
      }
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Default fallback to serving static assets
    return env.ASSETS.fetch(request);
  }
};

