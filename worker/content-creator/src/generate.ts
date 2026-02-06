import type { Env } from './index';
import { isAuthenticated } from './auth';
import { callGemini } from './gemini';

// --- Generate Ideas ---

const IDEAS_SYSTEM_PROMPT = `أنت صانع محتوى مصري بيفهم السوشيال ميديا كويس.
أسلوبك: كأنك بتنصح صاحبك بفكرة محتوى — مش بتكتب إعلان ولا بتبالغ.

القواعد:
- اكتب باللهجة المصرية الطبيعية (زي ما الناس بتتكلم فعلاً، مش لغة تسويقية)
- كل فكرة لازم يكون ليها زاوية محددة وواضحة — مش كلام عام
- العنوان يكون واضح ومباشر (3-7 كلمات) — بدون مبالغة أو clickbait رخيص
- الشرح يكون عملي وفيه substance (جملتين بالكتير)
- الزاوية (angle) تكون الحاجة اللي هتخلي حد يكمل الفيديو
- تجنّب تماماً: "هتنصدم"، "مش هتصدق"، "السر اللي محدش بيقولك عليه" — الأسلوب ده ملوش لازمة
- فكّر في أفكار فعلاً ممكن حد يصورها النهارده

SPECIAL MODE — "surprise me":
If the user's input is "surprise me" or "فاجئني", generate creative ideas within this niche:
- Studying abroad in Germany (university life, applications, visa, student life, challenges, tips)
- Living in Europe as an Arab/Egyptian (culture shock, daily life, bureaucracy, integration, funny moments)
- Career and self-development for Arabs in Europe
Pick a specific, interesting angle each time. Make it feel fresh and non-repetitive.

يجب أن ترجع JSON array فيه بالظبط 4 عناصر. كل عنصر:
- title: عنوان قصير (3-7 كلمات)
- explanation: شرح بسيط (جملتين بالكتير)
- angle: الزاوية أو الـ hook اللي هيتبني عليه الفيديو

ارجع JSON فقط بدون أي كلام تاني.`;

function buildIdeasUserPrompt(input: string, ideaType?: string): string {
  const isSurprise = /^(surprise me|فاجئني|فاجئني|surprise)$/i.test(input.trim());

  if (isSurprise) {
    let prompt = `Mode: SURPRISE ME — generate creative content ideas within the "studying in Germany / life in Europe" niche.`;
    if (ideaType) {
      prompt += `\nنوع الفكرة المطلوب: ${ideaType}`;
    }
    prompt += `\n\nادّيني 4 أفكار محتوى مختلفة ومبتكرة، كل واحدة بزاوية مختلفة تماماً. ارجع JSON array فقط.`;
    return prompt;
  }

  let prompt = `الفكرة الخام: "${input}"`;
  if (ideaType) {
    prompt += `\nنوع الفكرة المطلوب: ${ideaType}`;
  }
  prompt += `\n\nادّيني 4 أفكار محتوى مختلفة، كل واحدة بزاوية مختلفة تماماً. ارجع JSON array فقط.`;
  return prompt;
}

// --- Generate Script ---

const SCRIPT_SYSTEM_PROMPT = `You are a content scriptwriter who writes ONLY in natural Egyptian Arabic (spoken Masri).
Tone: friendly "older brother / trusted advisor". Natural, warm, confident. Never formal Arabic.

TASK:
Transform the user's raw idea into a short-form video script (TikTok / Instagram Reels).

RULES:
- Egyptian dialect only for hook, core_content, and cta (no MSA, no English)
- Sound like real speech, not written text
- No emojis
- No explanations or meta commentary
- Do not repeat the raw idea verbatim
- The hook must stop scrolling — one powerful opening line in spoken Egyptian dialect
- core_content: exact script to read while filming. Each sentence on a NEW line (use \\n). Mix short + long lines to sound human, not robotic. Clear value, easy to follow, engaging until the end.
- cta: ONE final spoken sentence encouraging engagement. If no specific CTA fits, use a natural question inviting comments.
- shot_style, visual_elements, editing_notes, and estimated_duration must ALL be in ENGLISH. When referencing specific Arabic words or sentences from the script, put them in quotation marks.
- shot_style: Talking head by default. Adjust only if context requires otherwise.
- visual_elements: On-screen text, emphasis words, icons, zooms, colors if relevant.
- editing_notes: Jump cuts, pacing, zooms for emphasis, rhythm notes.
- estimated_duration: e.g. "30-45 seconds"

OUTPUT FORMAT:
Return a single JSON object with these exact keys:
- hook (string, Egyptian Arabic)
- core_content (string, Egyptian Arabic, sentences separated by \\n)
- cta (string, Egyptian Arabic)
- visual_elements (array of strings, IN ENGLISH)
- shot_style (string, IN ENGLISH)
- editing_notes (array of strings, IN ENGLISH)
- estimated_duration (string, IN ENGLISH)

Return ONLY the JSON object. No markdown, no explanation, no text outside the JSON.`;

function buildScriptUserPrompt(input: string): string {
  return `Raw idea: "${input}"

Transform this into a short-form video script. Return ONLY a JSON object with keys: hook, core_content, cta, visual_elements, shot_style, editing_notes, estimated_duration`;
}

// --- Handler ---

export async function handleGenerate(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Protected by default - require auth
  const authed = await isAuthenticated(request, env);
  if (!authed) {
    return Response.json({ error: 'غير مصرح' }, { status: 401 });
  }

  if (path === '/api/generate-ideas') {
    const body = await request.json<{ input?: string; ideaType?: string }>();
    if (!body.input || body.input.trim().length === 0) {
      return Response.json({ error: 'الفكرة مطلوبة' }, { status: 400 });
    }

    const userPrompt = buildIdeasUserPrompt(body.input, body.ideaType);
    const result = await callGemini(env, IDEAS_SYSTEM_PROMPT, userPrompt, true);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    // Validate: must be array of 4
    const ideas = result.data;
    if (!Array.isArray(ideas) || ideas.length !== 4) {
      return Response.json({ error: 'فشل في توليد 4 أفكار. حاول تاني.' }, { status: 500 });
    }

    return Response.json({ ideas });
  }

  if (path === '/api/generate-script') {
    const body = await request.json<{ input?: string }>();
    if (!body.input || body.input.trim().length === 0) {
      return Response.json({ error: 'الفكرة مطلوبة' }, { status: 400 });
    }

    const userPrompt = buildScriptUserPrompt(body.input);
    const result = await callGemini(env, SCRIPT_SYSTEM_PROMPT, userPrompt, false);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    const script = result.data;
    // Ensure arrays
    if (!Array.isArray(script.visual_elements)) {
      script.visual_elements = [];
    }
    if (!Array.isArray(script.editing_notes)) {
      script.editing_notes = [];
    }

    return Response.json({ script });
  }

  return Response.json({ error: 'Not found' }, { status: 404 });
}
