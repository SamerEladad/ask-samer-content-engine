import type { Env } from './index';
import { isAuthenticated } from './auth';

// --- Scripts CRUD handler (all protected) ---

export async function handleScripts(request: Request, env: Env, path: string): Promise<Response> {
  // All script routes require auth
  const authed = await isAuthenticated(request, env);
  if (!authed) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 });
  }

  // POST /api/scripts - save a script
  if (path === '/api/scripts' && request.method === 'POST') {
    return saveScript(request, env);
  }

  // GET /api/scripts - list all scripts
  if (path === '/api/scripts' && request.method === 'GET') {
    return listScripts(env);
  }

  // GET /api/scripts/:id
  const getMatch = path.match(/^\/api\/scripts\/([^/]+)$/);
  if (getMatch && request.method === 'GET') {
    return getScript(env, getMatch[1]);
  }

  // DELETE /api/scripts/:id
  if (getMatch && request.method === 'DELETE') {
    return deleteScript(env, getMatch[1]);
  }

  // PUT /api/scripts/:id - update a script
  if (getMatch && request.method === 'PUT') {
    return updateScript(request, env, getMatch[1]);
  }

  // PATCH /api/scripts/:id/status - update status
  const statusMatch = path.match(/^\/api\/scripts\/([^/]+)\/status$/);
  if (statusMatch && request.method === 'PATCH') {
    return updateStatus(request, env, statusMatch[1]);
  }

  // POST /api/scripts/reorder - reorder scripts
  if (path === '/api/scripts/reorder' && request.method === 'POST') {
    return reorderScripts(request, env);
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}

// --- Save ---

async function saveScript(request: Request, env: Env): Promise<Response> {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.hook || !body.core_content || !body.cta || !body.idea_title) {
    return Response.json(
      { error: 'بيانات ناقصة', received: Object.keys(body) },
      { status: 400 }
    );
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO saved_scripts (id, idea_title, hook, core_content, cta, visual_elements, shot_style, editing_notes, estimated_duration, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        String(body.idea_title),
        String(body.hook),
        String(body.core_content),
        String(body.cta),
        JSON.stringify(body.visual_elements || []),
        String(body.shot_style || ''),
        JSON.stringify(body.editing_notes || []),
        String(body.estimated_duration || ''),
        now
      )
      .run();
  } catch (err: any) {
    console.error('D1 INSERT error:', err.message, err.cause);
    return Response.json(
      { error: `فشل الحفظ في قاعدة البيانات: ${err.message}` },
      { status: 500 }
    );
  }

  return Response.json({ id, created_at: now }, { status: 201 });
}

// --- Update ---

async function updateScript(request: Request, env: Env, id: string): Promise<Response> {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.hook || !body.core_content || !body.cta || !body.idea_title) {
    return Response.json({ error: 'بيانات ناقصة' }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      `UPDATE saved_scripts
       SET idea_title = ?, hook = ?, core_content = ?, cta = ?, visual_elements = ?, shot_style = ?, editing_notes = ?, estimated_duration = ?
       WHERE id = ?`
    )
      .bind(
        String(body.idea_title),
        String(body.hook),
        String(body.core_content),
        String(body.cta),
        JSON.stringify(body.visual_elements || []),
        String(body.shot_style || ''),
        JSON.stringify(body.editing_notes || []),
        String(body.estimated_duration || ''),
        id
      )
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: 'مش موجود' }, { status: 404 });
    }
  } catch (err: any) {
    console.error('D1 UPDATE error:', err.message, err.cause);
    return Response.json(
      { error: `فشل التحديث: ${err.message}` },
      { status: 500 }
    );
  }

  return Response.json({ ok: true });
}

// --- List ---

async function listScripts(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, idea_title, status, sort_order, created_at FROM saved_scripts
     ORDER BY
       CASE status WHEN 'working' THEN 0 WHEN 'none' THEN 1 WHEN 'done' THEN 2 END,
       sort_order ASC,
       created_at DESC`
  ).all();

  return Response.json({ scripts: result.results });
}

// --- Get by ID ---

async function getScript(env: Env, id: string): Promise<Response> {
  const result = await env.DB.prepare(
    'SELECT * FROM saved_scripts WHERE id = ?'
  )
    .bind(id)
    .first();

  if (!result) {
    return Response.json({ error: 'مش موجود' }, { status: 404 });
  }

  // Parse JSON fields
  const script = {
    ...result,
    visual_elements: safeJsonParse(result.visual_elements as string, []),
    editing_notes: safeJsonParse(result.editing_notes as string, []),
  };

  return Response.json({ script });
}

// --- Delete ---

async function deleteScript(env: Env, id: string): Promise<Response> {
  const result = await env.DB.prepare('DELETE FROM saved_scripts WHERE id = ?')
    .bind(id)
    .run();

  if (result.meta.changes === 0) {
    return Response.json({ error: 'مش موجود' }, { status: 404 });
  }

  return Response.json({ ok: true });
}

// --- Helpers ---

async function updateStatus(request: Request, env: Env, id: string): Promise<Response> {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const status = body.status;
  if (!['none', 'working', 'done'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    const result = await env.DB.prepare(
      'UPDATE saved_scripts SET status = ? WHERE id = ?'
    )
      .bind(status, id)
      .run();

    if (result.meta.changes === 0) {
      return Response.json({ error: '\u0645\u0634 \u0645\u0648\u062c\u0648\u062f' }, { status: 404 });
    }
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

async function reorderScripts(request: Request, env: Env): Promise<Response> {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const items = body.items as { id: string; sort_order: number }[];
  if (!Array.isArray(items)) {
    return Response.json({ error: 'items array required' }, { status: 400 });
  }

  try {
    for (const item of items) {
      await env.DB.prepare('UPDATE saved_scripts SET sort_order = ? WHERE id = ?')
        .bind(item.sort_order, item.id)
        .run();
    }
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

function safeJsonParse(str: string, fallback: any): any {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
