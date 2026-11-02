'use client';

/**
 * Shared navigation config used by the Sidebar, Topbar search and mobile nav.
 */
import {
  BarChart3,
  BookOpenCheck,
  CalendarCheck,
  Code2,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  NotebookPen,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { ViewKey } from '@/lib/studymate/types';

export interface NavItem {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        description: 'Your day at a glance',
      },
      {
        key: 'progress',
        label: 'Progress Tracker',
        icon: BarChart3,
        description: 'Charts, streaks & statistics',
      },
    ],
  },
  {
    title: 'AI Tools',
    items: [
      {
        key: 'chat',
        label: 'AI Chat',
        icon: MessageSquareText,
        description: 'Ask anything, learn anything',
      },
      {
        key: 'notes',
        label: 'Notes Generator',
        icon: NotebookPen,
        description: 'Structured notes for any topic',
      },
      {
        key: 'quiz',
        label: 'Quiz Generator',
        icon: ListChecks,
        description: 'MCQs with instant scoring',
      },
      {
        key: 'assignment',
        label: 'Assignment Helper',
        icon: BookOpenCheck,
        description: 'Step-by-step solutions',
      },
      {
        key: 'code',
        label: 'Code Assistant',
        icon: Code2,
        description: 'Explain, debug & generate code',
      },
    ],
  },
  {
    title: 'Productivity',
    items: [
      {
        key: 'planner',
        label: 'Study Planner',
        icon: CalendarCheck,
        description: 'Tasks, deadlines & goals',
      },
      {
        key: 'settings',
        label: 'Settings',
        icon: Settings,
        description: 'Profile & preferences',
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function navItemFor(view: ViewKey): NavItem | undefined {
  return ALL_NAV_ITEMS.find((i) => i.key === view);
}
