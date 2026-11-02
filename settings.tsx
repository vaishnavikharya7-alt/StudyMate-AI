'use client';

/**
 * StudyMate AI — Profile & Settings
 * Student profile, appearance (theme), local data management and about.
 */
import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  ArrowRight,
  Download,
  GraduationCap,
  ListTodo,
  MessagesSquare,
  Monitor,
  Moon,
  NotebookPen,
  Save,
  ShieldCheck,
  Sun,
  Target,
  Timer,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useMounted } from '@/hooks/use-hydrated';
import { downloadJsonFile, formatMinutes } from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { Profile, ViewKey } from '@/lib/studymate/types';
import { cn } from '@/lib/utils';

const TONES = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
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

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;
type ThemeValue = (typeof THEME_OPTIONS)[number]['value'];

export default function SettingsView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const storeProfile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const subjects = useAppStore((s) => s.subjects);
  const tasks = useAppStore((s) => s.tasks);
  const sessions = useAppStore((s) => s.sessions);
  const activities = useAppStore((s) => s.activities);
  const quizResults = useAppStore((s) => s.quizResults);
  const savedNotes = useAppStore((s) => s.savedNotes);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const resetAllData = useAppStore((s) => s.resetAllData);

  /* ---- student profile (local form state, initialized once) ---- */
  const [form, setForm] = useState<Profile>(() => useAppStore.getState().profile);
  const patchForm = (patch: Partial<Profile>) => setForm((f) => ({ ...f, ...patch }));

  const handleSaveProfile = () => {
    setProfile({
      name: form.name.trim(),
      grade: form.grade.trim(),
      school: form.school.trim(),
      targetExam: form.targetExam.trim(),
      favoriteSubjects: form.favoriteSubjects.trim(),
      dailyGoalMinutes: form.dailyGoalMinutes,
    });
    toast.success('Profile updated');
  };

  const avatarInitial = form.name.trim().charAt(0).toUpperCase() || 'S';

  /* ---- appearance ---- */
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useMounted();
  const activeTheme: ThemeValue | undefined = mounted ? (theme as ThemeValue | undefined) : undefined;
  const isDark = mounted && resolvedTheme === 'dark';

  /* ---- data ---- */
  const handleExport = () => {
    downloadJsonFile('studymate-ai-backup.json', {
      exportedAt: new Date().toISOString(),
      profile: storeProfile,
      subjects,
      tasks,
      sessions,
      activities,
      quizResults,
      savedNotes,
      chatMessages,
    });
    toast.success('Backup downloaded');
  };

  const handleReset = () => {
    resetAllData();
    toast.success('All data cleared');
  };

  const stats: { icon: LucideIcon; tone: Tone; label: string; value: number }[] = [
    { icon: ListTodo, tone: 'blue', label: 'Tasks', value: tasks.length },
    { icon: Timer, tone: 'purple', label: 'Study sessions', value: sessions.length },
    { icon: Target, tone: 'emerald', label: 'Quiz results', value: quizResults.length },
    { icon: NotebookPen, tone: 'amber', label: 'Saved notes', value: savedNotes.length },
    { icon: MessagesSquare, tone: 'rose', label: 'Chat messages', value: chatMessages.length },
  ];

  return (
    <div>
      {/* page heading */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profile, appearance and your local data.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ================= STUDENT PROFILE ================= */}
        <FadeIn delay={0}>
          <section aria-label="Student profile" className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-xl font-bold text-white shadow-sm">
                {avatarInitial}
              </span>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Student profile</h2>
                <p className="text-xs text-muted-foreground">Personalize your StudyMate experience.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input
                    id="profile-name"
                    value={form.name}
                    onChange={(e) => patchForm({ name: e.target.value })}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-grade">Grade level</Label>
                  <Input
                    id="profile-grade"
                    value={form.grade}
                    onChange={(e) => patchForm({ grade: e.target.value })}
                    placeholder="e.g. Grade 11 / 2nd year"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profile-school">School</Label>
                  <Input
                    id="profile-school"
                    value={form.school}
                    onChange={(e) => patchForm({ school: e.target.value })}
                    placeholder="e.g. Lincoln High School"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profile-exam">Target exam</Label>
                  <Input
                    id="profile-exam"
                    value={form.targetExam}
                    onChange={(e) => patchForm({ targetExam: e.target.value })}
                    placeholder="e.g. SAT, JEE, GCSE"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profile-favorites">Favorite subjects</Label>
                <Input
                  id="profile-favorites"
                  value={form.favoriteSubjects}
                  onChange={(e) => patchForm({ favoriteSubjects: e.target.value })}
                  placeholder="e.g. Math, Physics"
                />
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <Label htmlFor="profile-goal">Daily goal</Label>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    {formatMinutes(form.dailyGoalMinutes)}
                  </span>
                </div>
                <Slider
                  id="profile-goal"
                  min={15}
                  max={480}
                  step={15}
                  value={[form.dailyGoalMinutes]}
                  onValueChange={(v) => patchForm({ dailyGoalMinutes: v[0] })}
                  aria-label="Daily study goal in minutes"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  How many minutes you aim to study each day.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleSaveProfile}
                className="bg-brand-gradient text-white hover:opacity-90"
              >
                <Save className="h-4 w-4" />
                Save profile
              </Button>
            </div>
          </section>
        </FadeIn>

        {/* ================= APPEARANCE ================= */}
        <FadeIn delay={0.05}>
          <section aria-label="Appearance" className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Appearance</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Choose how StudyMate looks on this device.</p>

            <div className="mt-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
              {THEME_OPTIONS.map((option) => {
                const selected = activeTheme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border p-4 text-sm font-medium transition-colors',
                      selected
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10'
                        : 'bg-card text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                    )}
                  >
                    <option.icon className={cn('h-5 w-5', selected && 'text-blue-600 dark:text-blue-400')} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-muted/40 p-3">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'h-4 w-4 rounded-full border shadow-inner',
                    isDark ? 'bg-zinc-800' : 'bg-zinc-200',
                  )}
                />
                <div>
                  <p className="text-xs font-medium">Preview</p>
                  <p className="text-[11px] text-muted-foreground">
                    {mounted ? (isDark ? 'Dark mode' : 'Light mode') : 'Following your system'}
                  </p>
                </div>
              </div>
              <p className="text-right text-[11px] text-muted-foreground">
                Theme preference is saved automatically.
              </p>
            </div>
          </section>
        </FadeIn>

        {/* ================= YOUR DATA ================= */}
        <FadeIn delay={0.1}>
          <section aria-label="Your data" className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight">Your data</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Everything lives in this browser — take it with you anytime.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1.5 rounded-xl border bg-muted/40 p-3">
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-lg', TONES[stat.tone])}>
                    <stat.icon className="h-3.5 w-3.5" />
                  </span>
                  <p className="text-lg font-semibold leading-none">{stat.value}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <Separator className="my-5" />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4" />
                Export backup (JSON)
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Reset all data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete everything?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes profile, tasks, history, notes and chats from this browser.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleReset}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted/50 p-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs text-muted-foreground">
                All progress is stored locally in your browser (LocalStorage). AI requests run through a
                secure server-side backend — API keys are never exposed.
              </p>
            </div>
          </section>
        </FadeIn>

        {/* ================= ABOUT ================= */}
        <FadeIn delay={0.15}>
          <section aria-label="About StudyMate AI" className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm">
                <GraduationCap className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-semibold tracking-tight">StudyMate AI</p>
                <p className="text-xs text-muted-foreground">Learn Smarter. Build Faster. Achieve More.</p>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="border-transparent bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              >
                AI Powered
              </Badge>
              <Badge
                variant="secondary"
                className="border-transparent bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
              >
                Student Friendly
              </Badge>
              <Badge
                variant="secondary"
                className="border-transparent bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              >
                Smart Learning
              </Badge>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              v1.0 · Built with Next.js, TypeScript &amp; Tailwind
            </p>

            <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => onNavigate('chat')}>
              Explore AI tools
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        </FadeIn>
      </div>
    </div>
  );
}
