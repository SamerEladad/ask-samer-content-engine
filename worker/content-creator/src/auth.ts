import type { Env } from './index';

// --- HMAC-based session token signing ---

async function getSigningKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

async function createSessionToken(secret: string): Promise<string> {
  const payload = JSON.stringify({ role: 'admin', iat: Date.now() });
  const key = await getSigningKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const b64Payload = btoa(payload);
  const hexSig = bufToHex(sig);
  return `${b64Payload}.${hexSig}`;
}

async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const [b64Payload, hexSig] = token.split('.');
    if (!b64Payload || !hexSig) return false;
    const payload = atob(b64Payload);
    const key = await getSigningKey(secret);
    const enc = new TextEncoder();
    const sigBuf = hexToBuf(hexSig);
    return crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(payload));
  } catch {
    return false;
  }
}

// --- Cookie helpers ---

function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? match[1] : null;
}

function setSessionCookie(token: string, isSecure: boolean): string {
  const parts = [
    `session=${token}`,
    'HttpOnly',
    'Secure', // Required for SameSite=None
    'Path=/',
    'SameSite=None',
    'Max-Age=604800', // 7 days
  ];
  return parts.join('; ');
}

function clearSessionCookie(isSecure: boolean): string {
  const parts = [
    'session=deleted',
    'HttpOnly',
    'Secure', // Required for SameSite=None
    'Path=/',
    'SameSite=None',
    'Max-Age=0',
  ];
  return parts.join('; ');
}

// --- Public: check if request is authenticated ---

export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const cookie = request.headers.get('Cookie');
  const token = parseSessionCookie(cookie);
  if (!token) return false;
  return verifySessionToken(token, env.SESSION_SECRET);
}

// --- Auth route handler ---

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  const isSecure = new URL(request.url).protocol === 'https:';

  if (path === '/api/login' && request.method === 'POST') {
    const body = await request.json<{ password?: string }>();
    if (!body.password || body.password !== env.ADMIN_PASSWORD) {
      return Response.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
    }
    const token = await createSessionToken(env.SESSION_SECRET);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': setSessionCookie(token, isSecure),
      },
    });
  }

  if (path === '/api/logout' && request.method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearSessionCookie(isSecure),
      },
    });
  }

  if (path === '/api/me' && request.method === 'GET') {
    const authed = await isAuthenticated(request, env);
    return Response.json({ authenticated: authed });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
