'use client';

/**
 * StudyMate AI — AI Notes Generator view.
 * Turns a subject + topic into structured study notes with a selectable
 * difficulty and style, plus a persisted library of saved notes
 * (copy / download / expand / delete).
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bookmark,
  BookmarkPlus,
  BookMarked,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { MarkdownView } from '@/components/studymate/markdown-view';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useMounted } from '@/hooks/use-hydrated';
import { requestNotes } from '@/lib/studymate/api-client';
import { copyText, downloadTextFile, formatRelative } from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { NotesInput, ViewKey } from '@/lib/studymate/types';
import { cn } from '@/lib/utils';

type NotesDifficulty = NotesInput['difficulty'];
type NotesStyle = NotesInput['style'];

const STYLE_META: Record<NotesStyle, { title: string; desc: string; badge: string }> = {
  short: { title: 'Short revision', desc: '250-400 words, quick recap', badge: 'Short' },
  detailed: { title: 'Detailed exam-ready', desc: '600-900 words, deep dive', badge: 'Detailed' },
};

interface ResultMeta {
  subject: string;
  topic: string;
  difficulty: NotesDifficulty;
  style: NotesStyle;
}

export default function NotesView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const savedNotes = useAppStore((s) => s.savedNotes);
  const saveNote = useAppStore((s) => s.saveNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const addActivity = useAppStore((s) => s.addActivity);
  const mounted = useMounted();

  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<NotesDifficulty>('intermediate');
  const [style, setStyle] = useState<NotesStyle>('short');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null);
  const [savedForThisResult, setSavedForThisResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fieldError, setFieldError] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  /* Abort any in-flight request when the view unmounts. */
  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = async (input: ResultMeta) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setResultMeta(null);
    setSavedForThisResult(false);
    setCopied(false);

    try {
      const content = await requestNotes(
        {
          subject: input.subject,
          topic: input.topic,
          difficulty: input.difficulty,
          style: input.style,
        },
        ctrl.signal,
      );
      if (ctrl.signal.aborted) return;
      setResult(content);
      setResultMeta(input);
      addActivity('notes', `Generated notes: ${input.topic}`, input.subject);
    } catch (err) {
      if (ctrl.signal.aborted || (err as Error)?.name === 'AbortError') return;
      const message =
        (err as Error)?.message || 'Something went wrong while generating your notes.';
      setError(message);
      toast.error(message);
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  };

  const handleGenerate = () => {
    const s = subject.trim();
    const t = topic.trim();
    if (!s || !t) {
      setFieldError(true);
      toast.error('Please fill in both subject and topic.');
      return;
    }
    setFieldError(false);
    void generate({ subject: s, topic: t, difficulty, style });
  };

  const handleCopy = async () => {
    if (!result) return;
    const ok = await copyText(result);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success('Notes copied');
    } else {
      toast.error('Could not copy to clipboard.');
    }
  };

  const handleDownload = (content: string, topicName: string) => {
    downloadTextFile(`${topicName.replace(/\s+/g, '-').toLowerCase()}-notes.txt`, content);
    toast.success('Notes downloaded');
  };

  const handleSave = () => {
    if (!result || !resultMeta || savedForThisResult) return;
    saveNote({
      subject: resultMeta.subject,
      topic: resultMeta.topic,
      difficulty: resultMeta.difficulty,
      style: resultMeta.style,
      content: result,
    });
    setSavedForThisResult(true);
    toast.success('Saved to your notes library');
  };

  const handleNew = () => {
    abortRef.current?.abort();
    setResult(null);
    setResultMeta(null);
    setError(null);
    setSavedForThisResult(false);
    setCopied(false);
  };

  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    toast.info('Note deleted');
  };

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">AI Notes Generator</h1>
        <p className="text-sm text-muted-foreground">
          Turn any topic into clean, structured study notes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ---------- Form card ---------- */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2 lg:self-start">
          <h2 className="text-lg font-semibold tracking-tight">Create new notes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the details and let AI do the rest.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes-subject">Subject</Label>
              <Input
                id="notes-subject"
                placeholder="e.g. Biology"
                value={subject}
                disabled={isLoading}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setFieldError(false);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes-topic">Topic</Label>
              <Input
                id="notes-topic"
                placeholder="e.g. Photosynthesis"
                value={topic}
                disabled={isLoading}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setFieldError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes-difficulty">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as NotesDifficulty)}
                disabled={isLoading}
              >
                <SelectTrigger id="notes-difficulty" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Notes style</Label>
              <div role="radiogroup" aria-label="Notes style" className="grid grid-cols-2 gap-3">
                {(['short', 'detailed'] as const).map((s) => {
                  const selected = style === s;
                  const Icon = s === 'short' ? FileText : BookMarked;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setStyle(s)}
                      disabled={isLoading}
                      className={cn(
                        'rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                        selected
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10'
                          : 'hover:border-blue-300 hover:bg-accent/50 dark:hover:bg-blue-500/5',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg',
                          selected
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="mt-2 block text-sm font-medium">{STYLE_META[s].title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {STYLE_META[s].desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {fieldError && (
              <p className="text-xs text-destructive">Please fill in both subject and topic.</p>
            )}

            <Button
              className="w-full bg-brand-gradient text-white hover:opacity-90"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isLoading ? 'Generating…' : 'Generate notes'}
            </Button>
          </div>
        </div>

        {/* ---------- Result + library column ---------- */}
        <div className="space-y-6 lg:col-span-3">
          {/* Loading panel */}
          {isLoading && (
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                Generating your {style} notes on {topic.trim() || 'your topic'}…
              </div>
              <div className="mt-4 space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          )}

          {/* Error panel */}
          {!isLoading && error && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-destructive/40 bg-rose-50 p-5 shadow-sm dark:bg-rose-500/10"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Couldn&apos;t generate notes
                  </p>
                  <p className="mt-1 text-sm text-rose-600/90 dark:text-rose-400/90">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </div>
            </motion.div>
          )}

          {/* Success panel */}
          {!isLoading && !error && result && resultMeta && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold tracking-tight">
                    {resultMeta.topic}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge className="border-transparent bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      {resultMeta.subject}
                    </Badge>
                    <Badge className="border-transparent bg-purple-50 capitalize text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                      {resultMeta.difficulty}
                    </Badge>
                    <Badge className="border-transparent bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                      {STYLE_META[resultMeta.style].badge}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copy notes">
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Download notes as TXT"
                    onClick={() => handleDownload(result, resultMeta.topic)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">TXT</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSave}
                    disabled={savedForThisResult}
                    aria-label="Save to notes library"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{savedForThisResult ? 'Saved' : 'Save'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNew}
                    aria-label="Clear result and start over"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New</span>
                  </Button>
                </div>
              </div>
              <div className="mt-4 border-t pt-4">
                <MarkdownView
                  content={result}
                  className="scrollbar-thin max-h-[560px] overflow-y-auto pr-1"
                />
              </div>
            </motion.div>
          )}

          {/* Idle placeholder */}
          {!isLoading && !error && !result && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card/50 p-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium">Your generated notes will appear here</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Pick a subject and topic, choose a style, and hit Generate.
              </p>
            </div>
          )}

          {/* ---------- Notes library ---------- */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Saved notes</h2>
              <Badge variant="secondary">{savedNotes.length}</Badge>
            </div>

            {!mounted ? (
              <div className="mt-4 space-y-2">
                <Skeleton className="h-[68px] w-full rounded-xl" />
                <Skeleton className="h-[68px] w-full rounded-xl" />
              </div>
            ) : savedNotes.length === 0 ? (
              <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed py-8 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  <Bookmark className="h-4 w-4" />
                </span>
                <p className="mt-3 text-sm font-medium">No saved notes yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Generate notes above and save the ones you want to keep for quick revision.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => onNavigate('quiz')}
                >
                  Take a quiz instead
                </Button>
              </div>
            ) : (
              <div className="scrollbar-thin mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
                {savedNotes.map((n) => {
                  const expanded = expandedNoteId === n.id;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        'rounded-xl border p-3 transition-colors',
                        expanded && 'bg-muted/40',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{n.topic}</p>
                          <p className="truncate text-xs text-muted-foreground">{n.subject}</p>
                        </div>
                        <div className="hidden shrink-0 items-center gap-1 sm:flex">
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                            {n.difficulty}
                          </span>
                          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {STYLE_META[n.style]?.badge ?? n.style}
                          </span>
                        </div>
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground md:block">
                          {formatRelative(n.at)}
                        </span>
                        <div className="flex shrink-0 items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={expanded ? 'Collapse note' : 'Expand note'}
                            onClick={() => setExpandedNoteId(expanded ? null : n.id)}
                          >
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Download note"
                            onClick={() => handleDownload(n.content, n.topic)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            aria-label="Delete note"
                            onClick={() => handleDeleteNote(n.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 border-t pt-3">
                              <MarkdownView
                                content={n.content}
                                className="scrollbar-thin max-h-64 overflow-y-auto"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
