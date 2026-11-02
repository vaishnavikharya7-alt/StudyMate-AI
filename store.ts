/**
 * StudyMate AI — global client store (zustand + localStorage persistence)
 * All user progress lives in LocalStorage: profile, tasks, sessions,
 * activities, quiz results, saved notes and chat history.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ActivityItem,
  ActivityType,
  ChatMsg,
  FocusTimer,
  NoteDoc,
  Priority,
  Profile,
  QuizResult,
  StudySession,
  StudyTask,
  ViewKey,
} from './types';
import { dayKey, uid } from './helpers';

const MAX_ACTIVITIES = 40;
const MAX_CHAT = 120;
const MAX_NOTES = 24;

export const DEFAULT_PROFILE: Profile = {
  name: '',
  grade: '',
  school: '',
  targetExam: '',
  favoriteSubjects: '',
  dailyGoalMinutes: 120,
};

export interface TaskInput {
  title: string;
  subject: string;
  deadline: string;
  priority: Priority;
  estimatedMinutes: number;
}

interface AppState {
  /* ---- navigation ---- */
  view: ViewKey;
  setView: (v: ViewKey) => void;

  /* ---- profile ---- */
  profile: Profile;
  setProfile: (patch: Partial<Profile>) => void;

  /* ---- subjects ---- */
  subjects: string[];
  addSubject: (name: string) => boolean;
  removeSubject: (name: string) => void;

  /* ---- tasks ---- */
  tasks: StudyTask[];
  addTask: (input: TaskInput) => StudyTask;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  /* ---- study sessions ---- */
  sessions: StudySession[];
  logSession: (minutes: number, subject?: string, note?: string) => void;

  /* ---- activities feed ---- */
  activities: ActivityItem[];
  addActivity: (type: ActivityType, title: string, detail?: string) => void;

  /* ---- quiz results ---- */
  quizResults: QuizResult[];
  addQuizResult: (r: Omit<QuizResult, 'id' | 'at'>) => void;

  /* ---- saved notes ---- */
  savedNotes: NoteDoc[];
  saveNote: (n: Omit<NoteDoc, 'id' | 'at'>) => void;
  deleteNote: (id: string) => void;

  /* ---- chat ---- */
  chatMessages: ChatMsg[];
  addChatMessage: (m: Omit<ChatMsg, 'id' | 'at'>) => ChatMsg;
  updateChatMessage: (id: string, patch: Partial<Pick<ChatMsg, 'content'>>) => void;
  clearChat: () => void;

  /* ---- focus timer (persisted so it survives navigation) ---- */
  focusTimer: FocusTimer;
  startFocusTimer: () => void;
  pauseFocusTimer: () => void;
  resetFocusTimer: () => void;

  /* ---- assignment helper: recent questions ---- */
  recentAssignments: string[];
  pushRecentAssignment: (q: string) => void;

  /* ---- danger zone ---- */
  resetAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      view: 'dashboard',
      setView: (v) => set({ view: v }),

      profile: { ...DEFAULT_PROFILE },
      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      subjects: [],
      addSubject: (name) => {
        const clean = name.trim().replace(/\s+/g, ' ');
        if (!clean) return false;
        const exists = get().subjects.some(
          (s) => s.toLowerCase() === clean.toLowerCase(),
        );
        if (exists) return false;
        set((s) => ({ subjects: [...s.subjects, clean] }));
        return true;
      },
      removeSubject: (name) =>
        set((s) => ({ subjects: s.subjects.filter((x) => x !== name) })),

      tasks: [],
      addTask: (input) => {
        const task: StudyTask = {
          id: uid(),
          completed: false,
          createdAt: new Date().toISOString(),
          ...input,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        get().addActivity('plan', `Task added: ${task.title}`, task.subject);
        return task;
      },
      toggleTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const completed = !t.completed;
            if (completed) {
              setTimeout(() => {
                get().addActivity('task', `Completed: ${t.title}`, t.subject);
              }, 0);
            }
            return {
              ...t,
              completed,
              completedAt: completed ? new Date().toISOString() : undefined,
            };
          }),
        })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      sessions: [],
      logSession: (minutes, subject, note) => {
        const mins = Math.max(1, Math.round(minutes));
        const session: StudySession = {
          id: uid(),
          date: dayKey(),
          minutes: mins,
          subject,
          note,
          at: new Date().toISOString(),
        };
        set((s) => ({ sessions: [...s.sessions, session] }));
        get().addActivity(
          'session',
          `Studied ${mins} min${subject ? ` — ${subject}` : ''}`,
          note,
        );
      },

      activities: [],
      addActivity: (type, title, detail) =>
        set((s) => ({
          activities: [
            { id: uid(), type, title, detail, at: new Date().toISOString() },
            ...s.activities,
          ].slice(0, MAX_ACTIVITIES),
        })),

      quizResults: [],
      addQuizResult: (r) => {
        const result: QuizResult = { id: uid(), at: new Date().toISOString(), ...r };
        set((s) => ({ quizResults: [result, ...s.quizResults] }));
        get().addActivity(
          'quiz',
          `Quiz: ${result.topic} — ${result.score}/${result.total}`,
          `${result.subject} · ${result.difficulty}`,
        );
      },

      savedNotes: [],
      saveNote: (n) => {
        const doc: NoteDoc = { id: uid(), at: new Date().toISOString(), ...n };
        set((s) => ({ savedNotes: [doc, ...s.savedNotes].slice(0, MAX_NOTES) }));
        get().addActivity('notes', `Notes saved: ${doc.topic}`, doc.subject);
      },
      deleteNote: (id) =>
        set((s) => ({ savedNotes: s.savedNotes.filter((n) => n.id !== id) })),

      chatMessages: [],
      addChatMessage: (m) => {
        const msg: ChatMsg = { id: uid(), at: new Date().toISOString(), ...m };
        set((s) => ({ chatMessages: [...s.chatMessages, msg].slice(-MAX_CHAT) }));
        return msg;
      },
      updateChatMessage: (id, patch) =>
        set((s) => ({
          chatMessages: s.chatMessages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      clearChat: () => set({ chatMessages: [] }),

      focusTimer: { startedAt: null, accumulatedSec: 0 },
      startFocusTimer: () =>
        set((s) =>
          s.focusTimer.startedAt
            ? s
            : { focusTimer: { ...s.focusTimer, startedAt: Date.now() } },
        ),
      pauseFocusTimer: () =>
        set((s) => {
          if (!s.focusTimer.startedAt) return s;
          const delta = Math.floor((Date.now() - s.focusTimer.startedAt) / 1000);
          return {
            focusTimer: {
              startedAt: null,
              accumulatedSec: s.focusTimer.accumulatedSec + delta,
            },
          };
        }),
      resetFocusTimer: () =>
        set({ focusTimer: { startedAt: null, accumulatedSec: 0 } }),

      recentAssignments: [],
      pushRecentAssignment: (q) =>
        set((s) => ({
          recentAssignments: [q, ...s.recentAssignments.filter((x) => x !== q)].slice(0, 5),
        })),

      resetAllData: () =>
        set({
          profile: { ...DEFAULT_PROFILE },
          subjects: [],
          tasks: [],
          sessions: [],
          activities: [],
          quizResults: [],
          savedNotes: [],
          chatMessages: [],
          focusTimer: { startedAt: null, accumulatedSec: 0 },
          recentAssignments: [],
          view: 'dashboard',
        }),
    }),
    {
      name: 'studymate-ai',
      version: 1,
    },
  ),
);

/** Convenience selectors */
export const selectTodayTasks = (s: { tasks: StudyTask[] }) => {
  const today = dayKey();
  return s.tasks.filter((t) => t.deadline === today);
};

export const selectPendingTasks = (s: { tasks: StudyTask[] }) =>
  s.tasks.filter((t) => !t.completed);
