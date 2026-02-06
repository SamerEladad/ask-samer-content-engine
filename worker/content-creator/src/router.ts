import type { Env } from './index';
import { handleAuth } from './auth';
import { handleGenerate } from './generate';
import { handleScripts } from './scripts';

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = request.headers.get('Origin');

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  let response: Response;

  try {
    // Auth routes
    if (path === '/api/login' || path === '/api/logout' || path === '/api/me') {
      response = await handleAuth(request, env, path);
    }
    // Generate routes
    else if (path === '/api/generate-ideas' || path === '/api/generate-script') {
      response = await handleGenerate(request, env, path);
    }
    // Scripts CRUD routes
    else if (path.startsWith('/api/scripts')) {
      response = await handleScripts(request, env, path);
    }
    else {
      response = Response.json({ error: 'Not found' }, { status: 404 });
    }
  } catch (err: any) {
    console.error('Unhandled error:', err);
    response = Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }

  // Add CORS headers to all responses
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
