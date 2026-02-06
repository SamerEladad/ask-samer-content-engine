import type { Env } from './index';

interface GeminiSuccess {
  ok: true;
  data: any;
}

interface GeminiError {
  ok: false;
  error: string;
}

type GeminiResult = GeminiSuccess | GeminiError;

/**
 * Extract JSON from a Gemini response that may be wrapped in markdown code blocks
 */
function extractJson(text: string): any {
  let cleaned = text.trim();

  // Remove ```json ... ``` wrappers
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  return JSON.parse(cleaned);
}

/**
 * Call Gemini API with system + user prompt, return parsed JSON
 * If parsing fails, retry once with a stricter prompt
 */
export async function callGemini(
  env: Env,
  systemPrompt: string,
  userPrompt: string,
  expectArray: boolean
): Promise<GeminiResult> {
  let model = env.GEMINI_MODEL || 'gemini-2.5-pro';
  // Ensure model has "models/" prefix
  if (!model.startsWith('models/')) {
    model = `models/${model}`;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const makeRequest = async (userMsg: string): Promise<Response> => {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}\n\n${userMsg}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    });
  };

  // First attempt
  try {
    const res = await makeRequest(userPrompt);
    if (!res.ok) {
      const errBody = await res.text();
      console.error('Gemini API error:', res.status, errBody);
      return { ok: false, error: `Gemini API error: ${res.status}` };
    }

    const json = await res.json<any>();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: 'Gemini returned empty response' };
    }

    try {
      const data = extractJson(text);
      return { ok: true, data };
    } catch {
      // Parse failed, will retry
      console.warn('JSON parse failed on first attempt, retrying...');
    }
  } catch (err: any) {
    console.error('Gemini fetch error:', err);
    return { ok: false, error: 'Failed to connect to Gemini API' };
  }

  // Retry with stricter prompt
  try {
    const retryPrompt = `${userPrompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no text outside the JSON. ${
      expectArray ? 'Return a JSON array.' : 'Return a JSON object.'
    }`;

    const res = await makeRequest(retryPrompt);
    if (!res.ok) {
      return { ok: false, error: 'Gemini retry failed' };
    }

    const json = await res.json<any>();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: 'Gemini retry returned empty response' };
    }

    const data = extractJson(text);
    return { ok: true, data };
  } catch (err: any) {
    console.error('Gemini retry parse error:', err);
    return { ok: false, error: 'فشل في تحليل رد الذكاء الاصطناعي. حاول تاني.' };
  }
}
