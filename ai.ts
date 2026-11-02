/**
 * StudyMate AI — server-side AI helper.
 * Wraps z-ai-web-dev-sdk. THIS FILE RUNS ON THE SERVER ONLY.
 * Credentials are managed by the SDK/environment and are never exposed to the client.
 */
import ZAI from 'z-ai-web-dev-sdk';

type AIMessage = { role: 'assistant' | 'user'; content: string };

let zaiPromise: Promise<Awaited<ReturnType<typeof ZAI.create>>> | null = null;

/** Lazily create and reuse a single SDK instance. */
export function getZAI() {
  if (!zaiPromise) {
    zaiPromise = ZAI.create();
  }
  return zaiPromise;
}

/** Run a chat completion and return the text content. Throws on empty responses. */
export async function complete(messages: AIMessage[]): Promise<string> {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: 'disabled' },
  });
  const content = completion.choices[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error('EMPTY_AI_RESPONSE');
  }
  return content.trim();
}

/** Map SDK failures to friendly, actionable messages for the UI. */
export function friendlyAIError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw === 'EMPTY_AI_RESPONSE') {
    return 'The AI returned an empty response. Please rephrase and try again.';
  }
  if (/aborted|timeout|timed?\s?out/i.test(raw)) {
    return 'The AI request timed out. Please try again.';
  }
  if (/rate\s?limit|429|quota/i.test(raw)) {
    return 'The AI service is busy right now (rate limit). Please wait a few seconds and retry.';
  }
  if (/401|403|unauthorized|forbidden|api[_\s]?key|credential/i.test(raw)) {
    return 'AI credentials are not configured correctly on the server. Please check the AI backend setup.';
  }
  if (/fetch|network|econnrefused|enotfound|dns|socket/i.test(raw)) {
    return 'The AI service is currently unreachable. Please try again in a moment.';
  }
  return 'The AI service is temporarily unavailable. Please try again shortly.';
}

/** Extract a JSON structure from a possibly messy AI response. */
export function parseJsonFromAI(raw: string): unknown {
  let text = raw.trim();
  // Strip markdown code fences if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    /* keep trying */
  }

  // Find the outermost JSON array or object.
  const arrayStart = text.indexOf('[');
  const objectStart = text.indexOf('{');
  let start = -1;
  let end = -1;
  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    start = arrayStart;
    end = text.lastIndexOf(']');
  } else if (objectStart !== -1) {
    start = objectStart;
    end = text.lastIndexOf('}');
  }
  if (start !== -1 && end > start) {
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      /* give up below */
    }
  }
  throw new Error('AI_JSON_PARSE_FAILED');
}
