/**
 * StudyMate AI — shared client-safe helpers
 * Dates, streaks, formatting, clipboard, colors.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns';

/** Generate a reasonably unique id. */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Local yyyy-mm-dd key for a date (defaults to now). */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Convert an ISO timestamp into a local yyyy-mm-dd key. */
export function dayKeyOf(iso: string): string {
  try {
    return dayKey(parseISO(iso));
  } catch {
    return dayKey(new Date(iso));
  }
}

/** Last n local date keys, oldest first, ending today. */
export function lastNDayKeys(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export function minutesOnDate(
  sessions: { date: string; minutes: number }[],
  key: string,
): number {
  return sessions
    .filter((s) => s.date === key)
    .reduce((sum, s) => sum + s.minutes, 0);
}

/** Current streak of consecutive active days (today or yesterday anchored). */
export function currentStreak(activeDates: Iterable<string>): number {
  const set = new Set(activeDates);
  const cursor = new Date();
  const today = dayKey(cursor);
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive active days. */
export function longestStreak(activeDates: Iterable<string>): number {
  const sorted = Array.from(new Set(activeDates)).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = new Date(`${key}T00:00:00`);
    if (prev) {
      const diff = Math.round((d.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function activeDatesFrom(input: {
  sessions: { date: string }[];
  tasks: { completedAt?: string }[];
  quizResults: { at: string }[];
}): string[] {
  const out = new Set<string>();
  input.sessions.forEach((s) => out.add(s.date));
  input.tasks.forEach((t) => {
    if (t.completedAt) out.add(dayKeyOf(t.completedAt));
  });
  input.quizResults.forEach((q) => out.add(dayKeyOf(q.at)));
  return Array.from(out);
}

/* ---------- formatting ---------- */

export function formatDateShort(keyOrIso: string): string {
  const d = keyOrIso.includes('T') ? parseISO(keyOrIso) : new Date(`${keyOrIso}T00:00:00`);
  return format(d, 'MMM d');
}

export function formatDateTime(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, h:mm a');
  } catch {
    return iso;
  }
}

export function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

/** mm:ss or h:mm:ss clock for the focus timer. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function greeting(name?: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
}

/* ---------- misc ---------- */

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Trigger a JSON file download (used by Settings export). */
export function downloadJsonFile(filename: string, data: unknown): void {
  downloadTextFile(filename, JSON.stringify(data, null, 2));
}

const CHART_COLORS = [
  '#3b82f6', // soft blue
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
];

/** Deterministic pleasant color for a subject name (used by charts). */
export function subjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CHART_COLORS[hash % CHART_COLORS.length];
}

export function scoreMessage(pct: number): string {
  if (pct >= 90) return 'Outstanding! You have mastered this topic. 🏆';
  if (pct >= 75) return 'Great job! A little revision and you are there. 🌟';
  if (pct >= 50) return 'Good effort — review the explanations and try again. 💪';
  return 'Keep going! Re-read your notes and retake the quiz. 📚';
}

export function isOverdue(deadline: string): boolean {
  return deadline < dayKey();
}

export function daysUntil(deadline: string): number {
  const target = new Date(`${deadline}T00:00:00`).getTime();
  const today = new Date(`${dayKey()}T00:00:00`).getTime();
  return Math.round((target - today) / 86400000);
}
