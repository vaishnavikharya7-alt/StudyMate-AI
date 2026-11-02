'use client';

/**
 * StudyMate AI — application shell.
 * A single-page app: the sidebar switches between views (kept in the store,
 * persisted to LocalStorage) so every navigation link works instantly.
 */
import { ComponentType, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useHydrated } from '@/hooks/use-hydrated';
import { useAppStore } from '@/lib/studymate/store';
import type { ViewKey } from '@/lib/studymate/types';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/studymate/sidebar';
import { Topbar } from '@/components/studymate/topbar';

import DashboardView from '@/components/studymate/views/dashboard';
import ProgressView from '@/components/studymate/views/progress';
import ChatView from '@/components/studymate/views/chat';
import NotesView from '@/components/studymate/views/notes';
import QuizView from '@/components/studymate/views/quiz';
import PlannerView from '@/components/studymate/views/planner';
import AssignmentView from '@/components/studymate/views/assignment';
import CodeAssistantView from '@/components/studymate/views/code-assistant';
import SettingsView from '@/components/studymate/views/settings';

export interface ViewProps {
  onNavigate: (v: ViewKey) => void;
}

const VIEWS: Record<ViewKey, ComponentType<ViewProps>> = {
  dashboard: DashboardView,
  chat: ChatView,
  notes: NotesView,
  quiz: QuizView,
  planner: PlannerView,
  assignment: AssignmentView,
  code: CodeAssistantView,
  progress: ProgressView,
  settings: SettingsView,
};

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="relative">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-blue-500/30">
          <GraduationCap className="h-9 w-9 text-white" />
        </span>
        <Loader2 className="absolute -bottom-2 -right-2 h-6 w-6 animate-spin text-blue-500" />
      </div>
      <div className="text-center">
        <p className="text-xl font-bold tracking-tight">
          StudyMate <span className="text-gradient">AI</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Your Personal AI Learning Companion</p>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t bg-card/60 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient">
            <GraduationCap className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-semibold">
            StudyMate <span className="text-gradient">AI</span>
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · Learn Smarter. Build Faster. Achieve More.
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">AI Powered</Badge>
          <Badge variant="secondary" className="text-[10px]">Student Friendly</Badge>
          <Badge variant="secondary" className="text-[10px]">Smart Learning</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} StudyMate AI · Your data stays on your device
        </p>
      </div>
    </footer>
  );
}

function AppShell() {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const ActiveView = VIEWS[view] ?? DashboardView;

  /* Scroll to top when switching views */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  return (
    <div className="min-h-screen">
      <Sidebar onNavigate={setView} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Topbar onNavigate={setView} />
        <AnimatePresence mode="wait">
          <motion.main
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
          >
            <ActiveView onNavigate={setView} />
          </motion.main>
        </AnimatePresence>
        <Footer />
      </div>
    </div>
  );
}

export default function Home() {
  const hydrated = useHydrated();
  return hydrated ? <AppShell /> : <Splash />;
}
