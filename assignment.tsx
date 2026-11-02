'use client';

/**
 * StudyMate AI — Assignment Helper
 * Paste a question, get a structured step-by-step model answer.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  Copy,
  Download,
  History,
  Loader2,
  MessagesSquare,
  RotateCcw,
  WandSparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownView } from '@/components/studymate/markdown-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { requestAssignment } from '@/lib/studymate/api-client';
import { copyText, downloadTextFile } from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { ViewKey } from '@/lib/studymate/types';
import { cn } from '@/lib/utils';

const MAX_CHARS = 4000;

const EXAMPLE_PROMPTS = [
  'Solve: 2x + 6 = 18, show every step',
  "Explain Newton's laws with a real-life example",
  'Compare mitosis and meiosis in a table',
];

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function FadeIn({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface FormErrors {
  subject?: string;
  question?: string;
}

export default function AssignmentView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const subjects = useAppStore((s) => s.subjects);
  const recentAssignments = useAppStore((s) => s.recentAssignments);
  const pushRecentAssignment = useAppStore((s) => s.pushRecentAssignment);
  const addActivity = useAppStore((s) => s.addActivity);

  const [subject, setSubject] = useState('');
  const [question, setQuestion] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultSubject, setResultSubject] = useState('');
  const [error, setError] = useState<string | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  /* Abort any in-flight request when the view unmounts (no setState in effect). */
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim();
    const nextErrors: FormErrors = {};
    if (!subject.trim()) nextErrors.subject = 'Please enter a subject';
    if (trimmedQuestion.length < 10) nextErrors.question = 'Please enter at least 10 characters';
    setErrors(nextErrors);
    if (nextErrors.subject) {
      toast.error('Please enter your subject.');
      return;
    }
    if (nextErrors.question) {
      toast.error('Please enter your question (at least 10 characters).');
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const content = await requestAssignment(
        { subject: subject.trim(), question: trimmedQuestion },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setResult(content);
      setResultSubject(subject.trim());
      pushRecentAssignment(trimmedQuestion);
      addActivity('assignment', `Assignment: ${truncate(trimmedQuestion, 40)}`, subject.trim());
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const message = (err as Error)?.message || 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const ok = await copyText(result);
    if (ok) toast.success('Answer copied to clipboard');
    else toast.error('Could not copy the answer');
  };

  const handleDownload = () => {
    if (!result) return;
    downloadTextFile('assignment-answer.txt', result);
    toast.success('Answer downloaded');
  };

  const handleNew = () => {
    setResult(null);
    setError(null);
    setErrors({});
  };

  return (
    <div>
      {/* page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Assignment Helper</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Step-by-step solutions that teach you, not just answers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ================= FORM ================= */}
        <FadeIn delay={0} className="lg:col-span-2">
          <section aria-label="Assignment form" className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                <WandSparkles className="h-4.5 w-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">New assignment</h2>
                <p className="text-xs text-muted-foreground">Paste a question and get guided steps.</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
              className="space-y-4"
              noValidate
            >
              <div className="space-y-1.5">
                <Label htmlFor="assignment-subject">Subject</Label>
                <Input
                  id="assignment-subject"
                  list="assignment-subject-options"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setErrors((prev) => ({ ...prev, subject: undefined }));
                  }}
                  placeholder="e.g. Mathematics"
                  aria-invalid={!!errors.subject}
                />
                <datalist id="assignment-subject-options">
                  {subjects.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="assignment-question">Question</Label>
                  <span className="text-[10px] text-muted-foreground">
                    {question.length}/{MAX_CHARS}
                  </span>
                </div>
                <Textarea
                  id="assignment-question"
                  rows={7}
                  maxLength={MAX_CHARS}
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setErrors((prev) => ({ ...prev, question: undefined }));
                  }}
                  placeholder="Paste your assignment question… e.g. 'A train travels 120 km in 2 hours. Find its average speed and explain each step.'"
                  className="scrollbar-thin"
                  aria-invalid={!!errors.question}
                />
                {errors.question && <p className="text-xs text-destructive">{errors.question}</p>}
              </div>

              {recentAssignments.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Recent:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recentAssignments.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuestion(q)}
                        title={q}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <History className="h-3 w-3 shrink-0" />
                        <span className="truncate">{truncate(q)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-gradient text-white hover:opacity-90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <WandSparkles className="h-4 w-4" />
                )}
                Get step-by-step help
              </Button>
            </form>
          </section>
        </FadeIn>

        {/* ================= RESULT ================= */}
        <FadeIn delay={0.08} className="lg:col-span-3">
          {error ? (
            <div
              role="alert"
              className="flex h-full flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-rose-50 p-5 dark:bg-rose-500/10"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                <h2 className="text-lg font-semibold tracking-tight text-rose-600 dark:text-rose-400">
                  Something went wrong
                </h2>
              </div>
              <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSubmit()}
                className="mt-1 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/15"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <section aria-label="Solution" className="h-full rounded-2xl border bg-card p-5 shadow-sm">
              {loading ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                    Solving step by step…
                  </div>
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-10/12" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : result ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{resultSubject}</Badge>
                      <span className="text-sm font-semibold">Model answer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => void handleCopy()}>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleDownload}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={handleNew}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        New
                      </Button>
                    </div>
                  </div>
                  <MarkdownView
                    content={result}
                    className="scrollbar-thin max-h-[640px] overflow-y-auto pr-1"
                  />
                </motion.div>
              ) : (
                <AssignmentEmptyState onNavigate={onNavigate} onPickExample={(q) => setQuestion(q)} />
              )}
            </section>
          )}
        </FadeIn>
      </div>
    </div>
  );
}

/* ---------- empty state ---------- */

function AssignmentEmptyState({
  onNavigate,
  onPickExample,
}: {
  onNavigate: (v: ViewKey) => void;
  onPickExample: (q: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <BookOpenCheck className="h-7 w-7" />
      </span>
      <div>
        <p className="text-lg font-semibold tracking-tight">Stuck on an assignment?</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Enter your question and get a structured, step-by-step solution with examples.
        </p>
      </div>
      <div className="flex max-w-lg flex-wrap justify-center gap-1.5">
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onPickExample(prompt)}
            className={cn(
              'rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground',
              'transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700',
              'dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300',
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate('chat')}>
          <MessagesSquare className="h-4 w-4" />
          Prefer chatting? Ask the AI Tutor
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate('planner')}>
          <CalendarClock className="h-4 w-4" />
          Plan your study time
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
