import type { Script } from './api';

export function formatScriptForCopy(
  title: string,
  script: Script
): string {
  const lines: string[] = [];

  lines.push(`📝 ${title}`);
  lines.push('');
  lines.push(`🎣 HOOK:`);
  lines.push(script.hook);
  lines.push('');
  lines.push(`📹 CONTENT:`);
  lines.push(script.core_content);
  lines.push('');
  lines.push(`📢 CTA:`);
  lines.push(script.cta);
  lines.push('');
  lines.push(`🎬 SHOT STYLE:`);
  lines.push(script.shot_style);
  lines.push('');

  if (script.visual_elements.length > 0) {
    lines.push(`👁️ VISUAL ELEMENTS:`);
    script.visual_elements.forEach((v) => lines.push(`• ${v}`));
    lines.push('');
  }

  if (script.editing_notes.length > 0) {
    lines.push(`✂️ EDITING NOTES:`);
    script.editing_notes.forEach((n) => lines.push(`• ${n}`));
    lines.push('');
  }

  lines.push(`⏱️ ESTIMATED DURATION: ${script.estimated_duration}`);

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
