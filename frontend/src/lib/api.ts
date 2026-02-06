// API base URL - empty for same-origin (uses Pages Function proxy)
const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

// --- Auth ---

export function login(password: string) {
  return request<{ ok: boolean }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function logout() {
  return request<{ ok: boolean }>('/api/logout', { method: 'POST' });
}

export function checkAuth() {
  return request<{ authenticated: boolean }>('/api/me');
}

// --- Generate ---

export interface Idea {
  title: string;
  explanation: string;
  angle: string;
}

export interface Script {
  hook: string;
  core_content: string;
  cta: string;
  visual_elements: string[];
  shot_style: string;
  editing_notes: string[];
  estimated_duration: string;
}

export interface SavedScript extends Script {
  id: string;
  idea_title: string;
  created_at: string;
}

export function generateIdeas(input: string, ideaType?: string) {
  return request<{ ideas: Idea[] }>('/api/generate-ideas', {
    method: 'POST',
    body: JSON.stringify({ input, ideaType }),
  });
}

export function generateScript(input: string) {
  return request<{ script: Script }>('/api/generate-script', {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

// --- Saved Scripts ---

export function saveScript(
  script: Script & { idea_title: string }
) {
  return request<{ id: string; created_at: string }>('/api/scripts', {
    method: 'POST',
    body: JSON.stringify(script),
  });
}

export function listScripts() {
  return request<{
    scripts: { id: string; idea_title: string; status: string; sort_order: number; created_at: string }[];
  }>('/api/scripts');
}

export function getScript(id: string) {
  return request<{ script: SavedScript }>(`/api/scripts/${id}`);
}

export function deleteScript(id: string) {
  return request<{ ok: boolean }>(`/api/scripts/${id}`, {
    method: 'DELETE',
  });
}

export function updateScript(
  id: string,
  script: Script & { idea_title: string }
) {
  return request<{ ok: boolean }>(`/api/scripts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(script),
  });
}

export function updateScriptStatus(id: string, status: 'none' | 'working' | 'done') {
  return request<{ ok: boolean }>(`/api/scripts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function reorderScripts(items: { id: string; sort_order: number }[]) {
  return request<{ ok: boolean }>('/api/scripts/reorder', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}
