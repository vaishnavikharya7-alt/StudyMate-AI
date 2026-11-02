'use client';

/**
 * StudyMate AI — Smart Study Planner
 * Subjects, daily goal, quick session logging and a filterable task list.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  ListPlus,
  Plus,
  Target,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  dayKey,
  daysUntil,
  formatDateShort,
  formatMinutes,
  formatRelative,
  isOverdue,
} from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { Priority, StudyTask, ViewKey } from '@/lib/studymate/types';
import { cn } from '@/lib/utils';

/* ---------- local design helpers ---------- */

const TONES = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  muted: 'bg-muted text-muted-foreground',
} as const;
type Tone = keyof typeof TONES;

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

function CardHeader({ icon: Icon, tone, title, sub }: { icon: LucideIcon; tone: Tone; title: string; sub: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/* ---------- chips ---------- */

function PriorityChip({ priority }: { priority: Priority }) {
  const map: Record<Priority, { label: string; className: string }> = {
    low: { label: 'Low', className: TONES.emerald },
    medium: { label: 'Medium', className: TONES.amber },
    high: { label: 'High', className: TONES.rose },
  };
  const { label, className } = map[priority];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', className)}>{label}</span>
  );
}

function DeadlineChip({ task }: { task: StudyTask }) {
  const base = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium';
  if (task.completed) {
    return (
      <span className={cn(base, TONES.muted)}>
        <Check className="h-3 w-3" />
        Done{task.completedAt ? ` ${formatRelative(task.completedAt)}` : ''}
      </span>
    );
  }
  if (isOverdue(task.deadline)) {
    return (
      <span className={cn(base, TONES.rose)}>
        <AlertCircle className="h-3 w-3" />
        Overdue · {formatDateShort(task.deadline)}
      </span>
    );
  }
  if (task.deadline === dayKey()) {
    return <span className={cn(base, TONES.blue)}>Due today</span>;
  }
  if (daysUntil(task.deadline) === 1) {
    return <span className={cn(base, TONES.amber)}>Tomorrow</span>;
  }
  return <span className={cn(base, TONES.muted)}>{formatDateShort(task.deadline)}</span>;
}

/* ---------- main view ---------- */

type TaskFilter = 'all' | 'today' | 'upcoming' | 'completed';

const SUGGESTED_SUBJECTS = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'History',
  'Computer Science',
];

const QUICK_LOGS: { label: string; minutes: number }[] = [
  { label: '+15m', minutes: 15 },
  { label: '+30m', minutes: 30 },
  { label: '+45m', minutes: 45 },
  { label: '+1h', minutes: 60 },
];

interface FieldErrors {
  title?: string;
  subject?: string;
  deadline?: string;
}

export default function PlannerView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const subjects = useAppStore((s) => s.subjects);
  const addSubject = useAppStore((s) => s.addSubject);
  const removeSubject = useAppStore((s) => s.removeSubject);
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s) => s.addTask);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const sessions = useAppStore((s) => s.sessions);
  const logSession = useAppStore((s) => s.logSession);

  /* ---- subjects ---- */
  const [newSubject, setNewSubject] = useState('');
  const handleAddSubject = () => {
    const name = newSubject.trim();
    if (!name) {
      toast.error('Please type a subject name first');
      return;
    }
    if (addSubject(name)) {
      toast.success(`Added ${name}`);
      setNewSubject('');
    } else {
      toast.info('Subject already in your list');
    }
  };

  /* ---- daily goal + quick logs ---- */
  const [quickSubject, setQuickSubject] = useState('');
  const quickLog = (minutes: number) => {
    logSession(minutes, quickSubject.trim() ? quickSubject.trim() : undefined, 'Quick log');
    toast.success(`Logged ${minutes} min`);
  };

  /* ---- add task form ---- */
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [estMinutes, setEstMinutes] = useState('30');
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleAddTask = () => {
    const next: FieldErrors = {};
    if (title.trim().length < 3) next.title = 'Title needs at least 3 characters';
    if (!subject.trim()) next.subject = 'Pick or type a subject';
    if (!deadline) next.deadline = 'Choose a deadline';
    setErrors(next);
    if (next.title || next.subject || next.deadline) {
      toast.error('Please fix the highlighted fields');
      return;
    }
    const estimated = Math.min(240, Math.max(15, Math.round(Number(estMinutes) || 30)));
    addTask({ title: title.trim(), subject: subject.trim(), deadline, priority, estimatedMinutes: estimated });
    toast.success('Task added to your plan');
    setTitle('');
  };

  /* ---- derived task data ---- */
  const today = dayKey();
  const sortedTasks = useMemo(() => {
    const pending = tasks
      .filter((t) => !t.completed)
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
    const done = tasks
      .filter((t) => t.completed)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return [...pending, ...done];
  }, [tasks]);

  const counts = useMemo(() => {
    const dueToday = tasks.filter((t) => !t.completed && t.deadline === today).length;
    const completed = tasks.filter((t) => t.completed).length;
    const overdue = tasks.filter((t) => !t.completed && isOverdue(t.deadline)).length;
    return { dueToday, completed, overdue };
  }, [tasks, today]);

  const [filter, setFilter] = useState<TaskFilter>('all');
  const visibleTasks = useMemo(() => {
    switch (filter) {
      case 'today':
        return sortedTasks.filter((t) => !t.completed && t.deadline === today);
      case 'upcoming':
        return sortedTasks.filter((t) => !t.completed && t.deadline > today);
      case 'completed':
        return sortedTasks.filter((t) => t.completed);
      default:
        return sortedTasks;
    }
  }, [sortedTasks, filter, today]);

  const focusTitleInput = () => {
    titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    titleRef.current?.focus();
  };

  const todayMinutes = sessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div>
      {/* page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Smart Study Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subjects, tasks, deadlines and daily goals — all in one place.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ================= LEFT COLUMN ================= */}
        <div className="space-y-6 lg:col-span-1">
          {/* Subjects */}
          <FadeIn delay={0}>
            <section aria-label="Subjects" className="rounded-2xl border bg-card p-5 shadow-sm">
              <CardHeader icon={BookMarked} tone="blue" title="Subjects" sub={`${subjects.length} in your list`} />
              {subjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-1 pl-3 pr-1.5 text-xs font-medium"
                    >
                      {s}
                      <button
                        type="button"
                        aria-label={`Remove ${s}`}
                        onClick={() => {
                          removeSubject(s);
                          toast.info(`Removed ${s}`);
                        }}
                        className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Start with a popular subject:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_SUBJECTS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          if (addSubject(s)) {
                            toast.success(`Added ${s}`);
                          } else {
                            toast.info('Subject already in your list');
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                      >
                        <Plus className="h-3 w-3" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubject();
                    }
                  }}
                  placeholder="Add a subject…"
                  aria-label="New subject name"
                />
                <Button
                  type="button"
                  size="icon"
                  aria-label="Add subject"
                  onClick={handleAddSubject}
                  className="bg-brand-gradient text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </section>
          </FadeIn>

          {/* Daily goal */}
          <FadeIn delay={0.05}>
            <section aria-label="Daily goal" className="rounded-2xl border bg-card p-5 shadow-sm">
              <CardHeader icon={Target} tone="purple" title="Daily goal" sub="Aim for a little every day" />
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight">
                  {formatMinutes(profile.dailyGoalMinutes)}
                </span>
                <span className="text-xs text-muted-foreground">per day</span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {formatMinutes(todayMinutes)} logged today
                </span>
              </div>
              <Slider
                min={15}
                max={480}
                step={15}
                value={[profile.dailyGoalMinutes]}
                onValueChange={(v) => setProfile({ dailyGoalMinutes: v[0] })}
                aria-label="Daily study goal in minutes"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>15m</span>
                <span>8h</span>
              </div>

              <div className="mt-4 rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium">Log study time</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_LOGS.map((q) => (
                    <Button
                      key={q.minutes}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => quickLog(q.minutes)}
                    >
                      {q.label}
                    </Button>
                  ))}
                  <Select value={quickSubject} onValueChange={setQuickSubject}>
                    <SelectTrigger size="sm" className="ml-auto w-[118px]" aria-label="Subject for quick logs">
                      <SelectValue placeholder="Subject…" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Add task */}
          <FadeIn delay={0.1}>
            <section aria-label="Add task" className="rounded-2xl border bg-card p-5 shadow-sm">
              <CardHeader icon={ListPlus} tone="emerald" title="Add task" sub="Break work into small wins" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddTask();
                }}
                className="space-y-4"
                noValidate
              >
                <div className="space-y-1.5">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    ref={titleRef}
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    placeholder="e.g. Finish algebra worksheet"
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-subject">Subject</Label>
                    <Input
                      id="task-subject"
                      list="planner-subject-options"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setErrors((prev) => ({ ...prev, subject: undefined }));
                      }}
                      placeholder="Subject"
                      aria-invalid={!!errors.subject}
                    />
                    <datalist id="planner-subject-options">
                      {subjects.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="task-deadline">Deadline</Label>
                    <Input
                      id="task-deadline"
                      type="date"
                      min={dayKey()}
                      value={deadline}
                      onChange={(e) => {
                        setDeadline(e.target.value);
                        setErrors((prev) => ({ ...prev, deadline: undefined }));
                      }}
                      aria-invalid={!!errors.deadline}
                    />
                    {errors.deadline && <p className="text-xs text-destructive">{errors.deadline}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="task-priority">Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                      <SelectTrigger id="task-priority" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="task-est">Est. minutes</Label>
                    <Input
                      id="task-est"
                      type="number"
                      min={15}
                      max={240}
                      step={5}
                      value={estMinutes}
                      onChange={(e) => setEstMinutes(e.target.value)}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-brand-gradient text-white hover:opacity-90">
                  <CalendarPlus className="h-4 w-4" />
                  Add task
                </Button>
              </form>
            </section>
          </FadeIn>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="space-y-4 lg:col-span-2">
          {/* summary strip */}
          <FadeIn delay={0.05}>
            <div className="grid grid-cols-3 gap-3">
              <MiniStat icon={CalendarDays} tone="blue" label="Due today" value={counts.dueToday} />
              <MiniStat
                icon={CheckCircle2}
                tone="emerald"
                label="Completed"
                value={`${counts.completed}/${tasks.length}`}
              />
              <MiniStat
                icon={AlertCircle}
                tone={counts.overdue > 0 ? 'rose' : 'muted'}
                label="Overdue"
                value={counts.overdue}
              />
            </div>
          </FadeIn>

          {/* filter tabs + list */}
          <FadeIn delay={0.1}>
            <section aria-label="Task list" className="rounded-2xl border bg-card p-5 shadow-sm">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as TaskFilter)}>
                <TabsList className="mb-4 flex w-full">
                  <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
                  <TabsTrigger value="today">Today ({counts.dueToday})</TabsTrigger>
                  <TabsTrigger value="upcoming">
                    Upcoming ({tasks.filter((t) => !t.completed && t.deadline > today).length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
                </TabsList>
              </Tabs>

              {visibleTasks.length > 0 ? (
                <div className="scrollbar-thin max-h-[560px] space-y-2.5 overflow-y-auto pr-1">
                  {visibleTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="group flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-sm"
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={task.completed}
                        aria-label={task.completed ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
                        onClick={() => toggleTask(task.id)}
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                          task.completed
                            ? 'bg-brand-gradient border-transparent text-white'
                            : 'border-muted-foreground/40 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10',
                        )}
                      >
                        {task.completed && <Check className="h-3.5 w-3.5" />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-sm font-medium',
                            task.completed && 'text-muted-foreground line-through',
                          )}
                        >
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                            {task.subject}
                          </Badge>
                          <PriorityChip priority={task.priority} />
                          <DeadlineChip task={task} />
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {task.estimatedMinutes}m
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete "${task.title}"`}
                        onClick={() => {
                          deleteTask(task.id);
                          toast.info('Task deleted');
                        }}
                        className="h-8 w-8 text-muted-foreground opacity-100 transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <TaskEmptyState filter={filter} onAddFirst={focusTitleInput} />
              )}
            </section>
          </FadeIn>

          {/* cross-link to notes */}
          <FadeIn delay={0.15}>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed bg-card p-4 text-left shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/5"
            >
              <div>
                <p className="text-sm font-medium">Need structured notes for a subject?</p>
                <p className="text-xs text-muted-foreground">Generate AI study notes in seconds.</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

/* ---------- small pieces ---------- */

function MiniStat({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border bg-card p-3 shadow-sm">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">{value}</p>
        <p className="truncate text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function TaskEmptyState({ filter, onAddFirst }: { filter: TaskFilter; onAddFirst: () => void }) {
  if (filter === 'all') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <ClipboardList className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium">No tasks yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Plan your first study session — it takes seconds.</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onAddFirst}>
          <Plus className="h-4 w-4" />
          Add your first task
        </Button>
      </div>
    );
  }
  if (filter === 'today') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <CalendarDays className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium">Nothing due today</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Enjoy the calm — or get a head start on upcoming work.</p>
        </div>
      </div>
    );
  }
  if (filter === 'upcoming') {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
          <CalendarClock className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-medium">No upcoming tasks</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Plan ahead by adding tasks with future deadlines.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
        <CheckCircle2 className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-medium">No completed tasks yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Tick off a task and it will show up here.</p>
      </div>
    </div>
  );
}
