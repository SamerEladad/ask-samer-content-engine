// Pages Function: proxies all /api/* requests to the Worker.
// This keeps the API same-origin with the frontend, avoiding
// all cross-origin cookie and CORS issues.

const WORKER_URL = 'https://ask-samer-content-engine.asksamer-de.workers.dev';

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const target = `${WORKER_URL}${url.pathname}${url.search}`;

  // Forward the request to the Worker
  const init: RequestInit = {
    method: context.request.method,
    headers: new Headers(context.request.headers),
  };

  // Forward body for non-GET/HEAD requests
  if (context.request.method !== 'GET' && context.request.method !== 'HEAD') {
    init.body = context.request.body;
    // @ts-ignore – duplex needed for streaming body
    init.duplex = 'half';
  }

  const response = await fetch(target, init);

  // Return the Worker's response directly (including Set-Cookie headers)
  const headers = new Headers(response.headers);
  // Remove CORS headers — same-origin doesn't need them
  headers.delete('Access-Control-Allow-Origin');
  headers.delete('Access-Control-Allow-Credentials');
  headers.delete('Access-Control-Allow-Methods');
  headers.delete('Access-Control-Allow-Headers');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
