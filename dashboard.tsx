'use client';

/**
 * StudyMate AI — Dashboard view
 * Greeting header, gradient hero, daily stats, focus timer,
 * quick access to AI tools, recent activity and today's timetable.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpenCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Code2,
  Flame,
  GraduationCap,
  ListChecks,
  MessageSquareText,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

import { useAppStore } from '@/lib/studymate/store';
import {
  activeDatesFrom,
  currentStreak,
  dayKey,
  dayKeyOf,
  formatClock,
  formatMinutes,
  formatRelative,
  greeting,
  longestStreak,
  minutesOnDate,
} from '@/lib/studymate/helpers';
import type { ActivityType, Priority, ViewKey } from '@/lib/studymate/types';
import { useMounted } from '@/hooks/use-hydrated';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/* ---------- motion helper ---------- */

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: 'easeOut' as const, delay },
});

/* ---------- design tokens ---------- */

type Tint = 'blue' | 'purple' | 'emerald' | 'amber' | 'cyan' | 'violet' | 'orange' | 'sky';

const TINTS: Record<Tint, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  cyan: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
};

const ACTIVITY_META: Record<ActivityType, { icon: LucideIcon; tint: Tint }> = {
  task: { icon: CheckCircle2, tint: 'emerald' },
  quiz: { icon: ListChecks, tint: 'purple' },
  notes: { icon: NotebookPen, tint: 'blue' },
  chat: { icon: MessageSquareText, tint: 'cyan' },
  assignment: { icon: BookOpenCheck, tint: 'amber' },
  code: { icon: Code2, tint: 'violet' },
  session: { icon: Timer, tint: 'orange' },
  plan: { icon: CalendarPlus, tint: 'sky' },
};

const QUICK_TOOLS: {
  key: ViewKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tint: Tint;
}[] = [
  {
    key: 'chat',
    label: 'AI Chat',
    description: 'Ask anything, learn anything',
    icon: MessageSquareText,
    tint: 'blue',
  },
  {
    key: 'notes',
    label: 'Notes Generator',
    description: 'Structured notes for any topic',
    icon: NotebookPen,
    tint: 'purple',
  },
  {
    key: 'quiz',
    label: 'Quiz Generator',
    description: 'MCQs with instant scoring',
    icon: ListChecks,
    tint: 'emerald',
  },
  {
    key: 'assignment',
    label: 'Assignment Helper',
    description: 'Step-by-step solutions',
    icon: BookOpenCheck,
    tint: 'amber',
  },
  {
    key: 'code',
    label: 'Code Assistant',
    description: 'Explain, debug & generate code',
    icon: Code2,
    tint: 'cyan',
  },
];

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_DOT: Record<Priority, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-rose-500',
};

/* ---------- small building blocks ---------- */

function StatCard({
  label,
  icon: Icon,
  tint,
  value,
  valueSuffix,
  sub,
  footer,
}: {
  label: string;
  icon: LucideIcon;
  tint: string;
  value: string;
  valueSuffix?: string;
  sub: string;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', tint)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight tabular-nums">
        {value}
        {valueSuffix ? (
          <span className="ml-1 text-sm font-medium text-muted-foreground">{valueSuffix}</span>
        ) : null}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      {footer}
    </div>
  );
}

/* ---------- view ---------- */

export default function DashboardView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const profile = useAppStore((s) => s.profile);
  const tasks = useAppStore((s) => s.tasks);
  const sessions = useAppStore((s) => s.sessions);
  const activities = useAppStore((s) => s.activities);
  const quizResults = useAppStore((s) => s.quizResults);
  const focusTimer = useAppStore((s) => s.focusTimer);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const logSession = useAppStore((s) => s.logSession);
  const startFocusTimer = useAppStore((s) => s.startFocusTimer);
  const pauseFocusTimer = useAppStore((s) => s.pauseFocusTimer);
  const resetFocusTimer = useAppStore((s) => s.resetFocusTimer);
  const mounted = useMounted();

  const today = dayKey();

  /* ----- focus timer ticking (setState only inside the interval callback) ----- */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (focusTimer.startedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [focusTimer.startedAt]);

  const timerRunning = focusTimer.startedAt != null;
  const elapsed = mounted
    ? focusTimer.accumulatedSec +
      (focusTimer.startedAt != null ? Math.max(0, (now - focusTimer.startedAt) / 1000) : 0)
    : focusTimer.accumulatedSec;

  const handleFinishAndLog = () => {
    const minutes = Math.round(elapsed / 60);
    if (minutes >= 1) {
      logSession(minutes, undefined, 'Focus session');
      resetFocusTimer();
      toast.success(`Logged ${minutes} min of focused study!`);
    } else {
      toast.info('Study for at least 1 minute to log a session.');
    }
  };

  const handleResetTimer = () => {
    resetFocusTimer();
    toast.info('Focus timer reset.');
  };

  const timerStatus: { label: string; dot: string } = timerRunning
    ? { label: 'Focusing', dot: 'bg-emerald-500' }
    : focusTimer.accumulatedSec > 0
      ? { label: 'Paused', dot: 'bg-amber-500' }
      : { label: 'Ready', dot: 'bg-muted-foreground/40' };

  /* ----- derived stats ----- */
  const todayTasks = useMemo(() => tasks.filter((t) => t.deadline === today), [tasks, today]);
  const sortedTodayTasks = useMemo(
    () => [...todayTasks].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]),
    [todayTasks],
  );
  const doneToday = todayTasks.filter(
    (t) => t.completed && t.completedAt != null && dayKeyOf(t.completedAt) === today,
  ).length;

  const todaySessions = useMemo(
    () => sessions.filter((s) => s.date === today).slice().reverse(),
    [sessions, today],
  );

  const minutesToday = useMemo(() => minutesOnDate(sessions, today), [sessions, today]);
  const goalPct =
    profile.dailyGoalMinutes > 0
      ? Math.min(100, Math.round((minutesToday / profile.dailyGoalMinutes) * 100))
      : 0;

  const activeDates = useMemo(
    () => activeDatesFrom({ sessions, tasks, quizResults }),
    [sessions, tasks, quizResults],
  );
  const streak = useMemo(() => currentStreak(activeDates), [activeDates]);
  const bestStreak = useMemo(() => longestStreak(activeDates), [activeDates]);

  const recentQuizAvg = useMemo(() => {
    const recent = quizResults.slice(0, 5);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((sum, q) => sum + (q.score / q.total) * 100, 0) / recent.length);
  }, [quizResults]);

  const who = mounted ? profile.name.trim() || 'there' : 'there';

  return (
    <div className="space-y-6">
      {/* ----- header ----- */}
      <motion.header {...rise(0)} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting(who)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        {mounted && !profile.name.trim() ? (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('settings')}>
            <UserRound className="h-4 w-4" />
            Set up profile
          </Button>
        ) : null}
      </motion.header>

      {/* ----- hero ----- */}
      <motion.section
        {...rise(0.05)}
        className="bg-brand-gradient relative overflow-hidden rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20 sm:p-8"
        aria-label="Welcome"
      >
        <div aria-hidden className="bg-dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium tracking-wide">
            YOUR PERSONAL AI LEARNING COMPANION
          </span>
          <h2 className="mt-4 max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
            Learn Smarter. Build Faster. Achieve More.
          </h2>
          <p className="mt-2 max-w-lg text-sm text-white/80 sm:text-base">
            Plan your studies, ask questions, and track every win — your entire learning workflow in
            one place.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <MessageSquareText className="h-4 w-4" />
              Ask the AI Tutor
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <NotebookPen className="h-4 w-4" />
              Generate Notes
            </button>
          </div>
        </div>
      </motion.section>

      {/* ----- stat cards ----- */}
      <motion.section {...rise(0.1)} aria-label="Today's stats">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Daily goal"
            icon={Target}
            tint={TINTS.blue}
            value={formatMinutes(minutesToday)}
            valueSuffix={`/ ${formatMinutes(profile.dailyGoalMinutes)}`}
            sub={`${goalPct}% of daily goal`}
            footer={<Progress value={goalPct} className="mt-3 h-1.5" aria-label="Daily goal progress" />}
          />
          <StatCard
            label="Study streak"
            icon={Flame}
            tint={TINTS.orange}
            value={String(streak)}
            valueSuffix={streak === 1 ? 'day' : 'days'}
            sub={`Best: ${bestStreak} days`}
          />
          <StatCard
            label="Tasks today"
            icon={CheckCircle2}
            tint={TINTS.emerald}
            value={todayTasks.length > 0 ? `${doneToday}/${todayTasks.length}` : '—'}
            sub={todayTasks.length > 0 ? 'tasks completed today' : 'No tasks due'}
          />
          <StatCard
            label="Quiz average"
            icon={GraduationCap}
            tint={TINTS.purple}
            value={recentQuizAvg === null ? '—' : `${recentQuizAvg}%`}
            sub={recentQuizAvg === null ? 'No quizzes yet' : 'Average of last 5 quizzes'}
          />
        </div>
      </motion.section>

      {/* ----- focus timer ----- */}
      <motion.section
        {...rise(0.15)}
        className="rounded-2xl border bg-card p-5 shadow-sm"
        aria-label="Focus timer"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Timer className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">Focus timer</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', timerStatus.dot)} />
                  {timerStatus.label}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Deep-work sessions, logged to your day automatically.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:gap-6">
            <p
              className={cn(
                'font-mono text-4xl font-bold tabular-nums tracking-tight',
                timerRunning ? 'text-foreground' : 'text-muted-foreground',
              )}
              aria-live="off"
            >
              {formatClock(elapsed)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {timerRunning ? (
                <Button variant="outline" onClick={pauseFocusTimer}>
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={startFocusTimer}
                  className="bg-brand-gradient text-white hover:opacity-90"
                >
                  <Play className="h-4 w-4" />
                  {focusTimer.accumulatedSec > 0 ? 'Resume' : 'Start'}
                </Button>
              )}
              {(timerRunning || focusTimer.accumulatedSec > 0) && (
                <Button variant="secondary" onClick={handleFinishAndLog}>
                  <Check className="h-4 w-4" />
                  Finish &amp; log
                </Button>
              )}
              {(timerRunning || focusTimer.accumulatedSec > 0) && (
                <Button variant="ghost" onClick={handleResetTimer}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ----- quick access ----- */}
      <motion.section {...rise(0.2)} aria-label="Quick access to AI tools">
        <div className="mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Quick access</h2>
          <p className="text-sm text-muted-foreground">Jump straight into any AI tool.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK_TOOLS.map(({ key, label, description, icon: Icon, tint }) => (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              className="group rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', TINTS[tint])}>
                <Icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </button>
          ))}
        </div>
      </motion.section>

      {/* ----- activity + timetable ----- */}
      <motion.section {...rise(0.25)} className="grid gap-6 lg:grid-cols-3">
        {/* recent activity */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-semibold tracking-tight">Recent activity</h2>
          <p className="text-sm text-muted-foreground">Your latest actions across StudyMate.</p>
          {activities.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Sparkles className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium">No activity yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Chat, generate notes or complete tasks — everything shows up here.
              </p>
              <Button size="sm" className="mt-4" onClick={() => onNavigate('chat')}>
                Explore AI tools
              </Button>
            </div>
          ) : (
            <ul className="scrollbar-thin mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {activities.slice(0, 8).map((a) => {
                const { icon: ActivityIcon, tint } = ACTIVITY_META[a.type];
                return (
                  <li key={a.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        TINTS[tint],
                      )}
                    >
                      <ActivityIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.title}</p>
                      {a.detail ? (
                        <p className="truncate text-xs text-muted-foreground">{a.detail}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(a.at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* today's timetable */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold tracking-tight">Today&apos;s timetable</h2>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'MMMM d, yyyy')}</p>
          {sortedTodayTasks.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <CalendarDays className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium">Nothing scheduled today</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Plan tasks to keep your day on track.
              </p>
              <Button size="sm" className="mt-4" onClick={() => onNavigate('planner')}>
                Plan your day
              </Button>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {sortedTodayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-pressed={t.completed}
                    aria-label={`Mark "${t.title}" as ${t.completed ? 'not done' : 'done'}`}
                    onClick={() => toggleTask(t.id)}
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                      t.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-input hover:border-emerald-400',
                    )}
                  >
                    {t.completed ? <Check className="h-3 w-3" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        t.completed && 'text-muted-foreground line-through',
                      )}
                    >
                      {t.title}
                    </p>
                  </div>
                  <Badge variant="secondary" className="max-w-24 shrink-0 truncate">
                    {t.subject}
                  </Badge>
                  <span
                    aria-hidden
                    title={`${t.priority} priority`}
                    className={cn('h-2 w-2 shrink-0 rounded-full', PRIORITY_DOT[t.priority])}
                  />
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {formatMinutes(t.estimatedMinutes)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="my-4 border-t" />

          <p className="text-sm font-medium">Logged today</p>
          {todaySessions.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No study sessions logged yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {todaySessions.slice(0, 4).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-blue-50 px-1.5 py-0.5 font-medium tabular-nums text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {formatMinutes(s.minutes)}
                  </span>
                  <span className="truncate">{s.subject ?? s.note ?? 'Study session'}</span>
                </li>
              ))}
              {todaySessions.length > 4 ? (
                <li className="text-xs text-muted-foreground">
                  +{todaySessions.length - 4} more session
                  {todaySessions.length - 4 === 1 ? '' : 's'}
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </motion.section>
    </div>
  );
}
