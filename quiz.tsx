'use client';

/**
 * StudyMate AI — AI Quiz Generator view.
 * Four phases: setup → loading → active (interactive MCQs with instant
 * feedback + explanations) → results (score hero, review, retake).
 * Finished quizzes are saved once to the Progress Tracker.
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  History,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMounted } from '@/hooks/use-hydrated';
import { requestQuiz } from '@/lib/studymate/api-client';
import { formatRelative, scoreMessage } from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { QuizInput, QuizQuestion, ViewKey } from '@/lib/studymate/types';
import { cn } from '@/lib/utils';

type QuizDifficulty = QuizInput['difficulty'];
type Phase = 'setup' | 'loading' | 'active' | 'results';

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const COUNT_OPTIONS = [3, 5, 10, 15] as const;

const DIFFICULTY_TINT: Record<QuizDifficulty, string> = {
  easy: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  medium: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  hard: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
};

export default function QuizView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const quizResults = useAppStore((s) => s.quizResults);
  const addQuizResult = useAppStore((s) => s.addQuizResult);
  const mounted = useMounted();

  const [phase, setPhase] = useState<Phase>('setup');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('medium');
  const [count, setCount] = useState<number>(5);
  const [fieldError, setFieldError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const savedRef = useRef(false);

  /* Abort any in-flight request when the view unmounts. */
  useEffect(() => () => abortRef.current?.abort(), []);

  /* Derived score (only meaningful once questions exist). */
  const total = questions.length;
  const score = questions.reduce(
    (n, q, i) => n + (answers[i] === q.correctIndex ? 1 : 0),
    0,
  );
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  const startQuiz = async () => {
    const s = subject.trim();
    const t = topic.trim();
    if (!s || !t) {
      setFieldError(true);
      toast.error('Please fill in both subject and topic.');
      return;
    }
    setFieldError(false);
    setError(null);
    setPhase('loading');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const qs = await requestQuiz({ subject: s, topic: t, difficulty, count }, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setQuestions(qs);
      setAnswers(new Array<number | null>(qs.length).fill(null));
      setCurrent(0);
      savedRef.current = false;
      setPhase('active');
    } catch (err) {
      if (ctrl.signal.aborted || (err as Error)?.name === 'AbortError') return;
      const message =
        (err as Error)?.message || 'Something went wrong while creating your quiz.';
      setError(message);
      setPhase('setup');
      toast.error(message);
    }
  };

  const selectOption = (optIndex: number) => {
    if (answers[current] !== null) return; // locked after answering
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = optIndex;
      return next;
    });
  };

  /* Enters the results phase and auto-saves exactly once (ref-guarded). */
  const finishQuiz = () => {
    if (!savedRef.current && total > 0) {
      savedRef.current = true;
      addQuizResult({ subject, topic, difficulty, score, total });
      toast.success('Result saved to your Progress Tracker');
    }
    setPhase('results');
  };

  const retakeQuiz = () => {
    setAnswers(new Array<number | null>(questions.length).fill(null));
    setCurrent(0);
    savedRef.current = false;
    setPhase('active');
  };

  const newQuiz = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrent(0);
    setError(null);
    setPhase('setup');
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">AI Quiz Generator</h1>
        <p className="text-sm text-muted-foreground">
          Custom MCQs with instant scoring and explanations.
        </p>
      </div>

      {/* ================= SETUP ================= */}
      {phase === 'setup' && (
        <div className="mx-auto w-full max-w-xl space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold tracking-tight">Build your quiz</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose what to practice — AI writes the questions.
            </p>

            <div className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="quiz-subject">Subject</Label>
                <Input
                  id="quiz-subject"
                  placeholder="e.g. History"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setFieldError(false);
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quiz-topic">Topic</Label>
                <Input
                  id="quiz-topic"
                  placeholder="e.g. World War II"
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    setFieldError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void startQuiz();
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quiz-difficulty">Difficulty</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as QuizDifficulty)}
                  >
                    <SelectTrigger id="quiz-difficulty" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quiz-count">Number of questions</Label>
                  <Select
                    value={String(count)}
                    onValueChange={(v) => setCount(Number(v))}
                  >
                    <SelectTrigger id="quiz-count" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNT_OPTIONS.map((c) => (
                        <SelectItem key={c} value={String(c)}>
                          {c} questions
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {fieldError && (
                <p className="text-xs text-destructive">
                  Please fill in both subject and topic.
                </p>
              )}

              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-rose-50 p-3 dark:bg-rose-500/10">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                </div>
              )}

              <Button
                className="w-full bg-brand-gradient text-white hover:opacity-90"
                onClick={() => void startQuiz()}
              >
                <Sparkles className="h-4 w-4" />
                Start Quiz
              </Button>
            </div>
          </motion.div>

          {/* Tips card */}
          <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Lightbulb className="h-4 w-4" />
            </span>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Tip:</span> quizzes you finish are
              saved to your Progress Tracker automatically.
            </p>
          </div>

          {/* Past attempts */}
          {mounted && quizResults.length > 0 && (
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                <History className="h-4 w-4 text-muted-foreground" />
                Past attempts
              </h2>
              <div className="scrollbar-thin mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
                {quizResults.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.topic}</p>
                      <p className="text-[10px] text-muted-foreground">{formatRelative(r.at)}</p>
                    </div>
                    <Badge variant="secondary" className="max-w-24 truncate">
                      {r.subject}
                    </Badge>
                    <span
                      className={cn(
                        'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize',
                        DIFFICULTY_TINT[r.difficulty],
                      )}
                    >
                      {r.difficulty}
                    </span>
                    <span className="shrink-0 text-xs font-semibold">
                      {r.score}/{r.total}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full"
                onClick={() => onNavigate('progress')}
              >
                View full progress
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ================= LOADING ================= */}
      {phase === 'loading' && (
        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              Writing your {difficulty} quiz on {topic.trim() || 'your topic'}…
            </div>
            <div className="mt-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= ACTIVE QUIZ ================= */}
      {phase === 'active' && questions[current] && (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          {/* Top row */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                Question {current + 1} of {questions.length}
              </p>
              <p className="truncate text-xs text-muted-foreground">{topic}</p>
            </div>
            <Badge className={cn('border-transparent capitalize', DIFFICULTY_TINT[difficulty])}>
              {difficulty}
            </Badge>
          </div>
          <Progress value={(current / questions.length) * 100} />

          <motion.div
            key={current}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border bg-card p-5 shadow-sm"
          >
            <p className="text-lg font-semibold">{questions[current].question}</p>

            <div className="mt-4 space-y-2.5">
              {questions[current].options.map((opt, idx) => {
                const answered = answers[current] !== null;
                const isCorrect = idx === questions[current].correctIndex;
                const isWrongPick = answered && idx === answers[current] && !isCorrect;
                return (
                  <button
                    key={`${questions[current].id}-${idx}`}
                    type="button"
                    onClick={() => selectOption(idx)}
                    disabled={answered}
                    aria-pressed={idx === answers[current]}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left text-sm transition-all disabled:cursor-default',
                      !answered &&
                        'hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-500/10',
                      answered && isCorrect && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                      isWrongPick && 'border-rose-500 bg-rose-50 dark:bg-rose-500/10',
                      answered && !isCorrect && !isWrongPick && 'opacity-60',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                          answered && isCorrect
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : isWrongPick
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {LETTERS[idx]}
                      </span>
                      <span className="min-w-0">{opt}</span>
                    </span>
                    {answered && isCorrect && (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    )}
                    {isWrongPick && (
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {answers[current] !== null && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/30 dark:bg-blue-500/10"
                >
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Why this answer:
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {questions[current].explanation}
                  </p>
                </motion.div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p
                    className={cn(
                      'text-xs font-medium',
                      answers[current] === questions[current].correctIndex
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {answers[current] === questions[current].correctIndex
                      ? 'Correct — nice work!'
                      : 'Not quite — check the explanation below.'}
                  </p>
                  {current < questions.length - 1 ? (
                    <Button
                      className="bg-brand-gradient text-white hover:opacity-90"
                      onClick={() => setCurrent((c) => c + 1)}
                    >
                      Next question
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      className="bg-brand-gradient text-white hover:opacity-90"
                      onClick={finishQuiz}
                    >
                      <Trophy className="h-4 w-4" />
                      See results
                    </Button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* ================= RESULTS ================= */}
      {phase === 'results' && total > 0 && (
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {/* Hero score card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="rounded-2xl bg-brand-gradient p-8 text-center text-white shadow-lg shadow-blue-500/20"
          >
            <p className="text-sm font-medium uppercase tracking-wider text-white/70">
              Quiz complete
            </p>
            <p className="mt-2 text-5xl font-bold">{pct}%</p>
            <p className="mt-2 text-white/90">
              {score} out of {total} correct
            </p>
            <p className="mt-1 text-sm text-white/90">{scoreMessage(pct)}</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                {score} correct
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <XCircle className="h-3.5 w-3.5 text-rose-300" />
                {total - score} wrong
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 capitalize">
                {difficulty}
              </span>
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" onClick={retakeQuiz}>
              <RotateCcw className="h-4 w-4" />
              Retake this quiz
            </Button>
            <Button
              className="bg-brand-gradient text-white hover:opacity-90"
              onClick={newQuiz}
            >
              <Sparkles className="h-4 w-4" />
              New quiz
            </Button>
          </div>

          {/* Review answers */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Review answers</h2>
            <div className="scrollbar-thin mt-4 max-h-96 space-y-3 overflow-y-auto pr-1">
              {questions.map((q, i) => {
                const picked = answers[i];
                const right = picked === q.correctIndex;
                return (
                  <div key={q.id} className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                        {i + 1}
                      </span>
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                    <div className="mt-3 space-y-1 pl-9 text-xs">
                      <p
                        className={cn(
                          'font-medium',
                          picked === null
                            ? 'text-muted-foreground'
                            : right
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400',
                        )}
                      >
                        Your answer: {picked === null ? 'Not answered' : q.options[picked]}
                      </p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">
                        Correct answer: {q.options[q.correctIndex]}
                      </p>
                      <p className="pt-1 text-muted-foreground">{q.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
