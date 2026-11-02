/**
 * StudyMate AI — client-side API helper.
 * All AI calls go through our Next.js API routes (secure backend).
 * API keys / SDK credentials NEVER touch the frontend.
 */
import type {
  AssignmentInput,
  ChatMessagePayload,
  CodeInput,
  NotesInput,
  QuizInput,
  QuizQuestion,
} from './types';

export const AI_SETUP_HINT =
  'The AI service could not be reached. Please try again in a moment — if the problem persists, the AI backend needs to be configured on the server.';

async function postJSON<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new Error(
      'Cannot reach the AI backend. Check your connection and try again.',
    );
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-json response */
  }

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      `Request failed (HTTP ${res.status}). Please try again.`;
    throw new Error(message);
  }
  return data as T;
}

/* ---------- Chat ---------- */
export async function requestChatCompletion(
  messages: ChatMessagePayload[],
  signal?: AbortSignal,
): Promise<string> {
  const data = await postJSON<{ content: string }>('/api/chat', { messages }, signal);
  return data.content;
}

/* ---------- Notes ---------- */
export async function requestNotes(input: NotesInput, signal?: AbortSignal): Promise<string> {
  const data = await postJSON<{ content: string }>('/api/notes', input, signal);
  return data.content;
}

/* ---------- Quiz ---------- */
export async function requestQuiz(
  input: QuizInput,
  signal?: AbortSignal,
): Promise<QuizQuestion[]> {
  const data = await postJSON<{ questions: QuizQuestion[] }>('/api/quiz', input, signal);
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('The AI returned no questions. Please try again.');
  }
  return data.questions;
}

/* ---------- Assignment ---------- */
export async function requestAssignment(
  input: AssignmentInput,
  signal?: AbortSignal,
): Promise<string> {
  const data = await postJSON<{ content: string }>('/api/assignment', input, signal);
  return data.content;
}

/* ---------- Code assistant ---------- */
export async function requestCodeHelp(
  input: CodeInput,
  signal?: AbortSignal,
): Promise<string> {
  const data = await postJSON<{ content: string }>('/api/code', input, signal);
  return data.content;
}
