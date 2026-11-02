'use client';

/**
 * StudyMate AI — top bar with global search (Cmd/Ctrl+K), theme toggle,
 * profile menu and mobile navigation trigger.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  CalendarDays,
  FileText,
  GraduationCap,
  LogOut,
  Menu,
  Moon,
  RotateCcw,
  Search,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useMounted } from '@/hooks/use-hydrated';
import { useAppStore } from '@/lib/studymate/store';
import { ALL_NAV_ITEMS } from './nav-config';
import { SidebarContent } from './sidebar';
import type { ViewKey } from '@/lib/studymate/types';

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="rounded-full"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )
      ) : (
        <Sun className="h-[18px] w-[18px]" />
      )}
    </Button>
  );
}

export function Topbar({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profile = useAppStore((s) => s.profile);
  const tasks = useAppStore((s) => s.tasks);
  const savedNotes = useAppStore((s) => s.savedNotes);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const setView = useAppStore((s) => s.setView);

  const displayName = profile.name.trim() || 'Student';

  /* Global keyboard shortcut: Cmd/Ctrl + K */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const go = (v: ViewKey) => {
    setSearchOpen(false);
    onNavigate(v);
  };

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed).slice(0, 6), [tasks]);

  const handleReset = () => {
    if (
      window.confirm(
        'This will permanently delete all your local data (profile, tasks, history, notes). Continue?',
      )
    ) {
      resetAllData();
      toast.success('All data has been reset');
      onNavigate('dashboard');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          {/* Mobile nav */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SidebarContent
                onNavigate={(v) => {
                  setMobileNavOpen(false);
                  onNavigate(v);
                }}
              />
            </SheetContent>
          </Sheet>

          {/* Mobile brand */}
          <button
            type="button"
            onClick={() => go('dashboard')}
            className="flex items-center gap-2 lg:hidden"
            aria-label="StudyMate AI home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient">
              <GraduationCap className="h-5 w-5 text-white" />
            </span>
            <span className="text-base font-bold tracking-tight">
              StudyMate <span className="text-gradient">AI</span>
            </span>
          </button>

          {/* Search */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="ml-auto flex h-10 w-full max-w-md items-center gap-2 rounded-xl border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted lg:ml-8"
            aria-label="Search tools and tasks"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">Search tools, tasks, notes…</span>
            <kbd className="hidden rounded-md border bg-background px-1.5 font-mono text-[10px] font-semibold sm:inline-block">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open profile menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105"
                >
                  {displayName.charAt(0).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.grade || profile.targetExam || 'Complete your profile'}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => go('settings')}>
                  <UserRound className="mr-2 h-4 w-4" /> Profile settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => go('planner')}>
                  <CalendarDays className="mr-2 h-4 w-4" /> My study plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => go('notes')}>
                  <FileText className="mr-2 h-4 w-4" /> Saved notes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleReset} className="text-destructive focus:text-destructive">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset all data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Global search dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search tools, tasks and notes…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {ALL_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem key={item.key} value={`go ${item.label} ${item.description}`} onSelect={() => go(item.key)}>
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
          {pendingTasks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pending tasks">
                {pendingTasks.map((t) => (
                  <CommandItem key={t.id} value={`task ${t.title} ${t.subject}`} onSelect={() => go('planner')}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="truncate">{t.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.subject} · due {t.deadline}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {savedNotes.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Saved notes">
                {savedNotes.slice(0, 5).map((n) => (
                  <CommandItem key={n.id} value={`note ${n.topic} ${n.subject}`} onSelect={() => go('notes')}>
                    <FileText className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="truncate">{n.topic}</span>
                      <span className="text-xs text-muted-foreground">{n.subject}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
