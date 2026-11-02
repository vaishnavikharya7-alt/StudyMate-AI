'use client';

/**
 * StudyMate AI — Code Assistant view.
 * Explain, debug, generate and improve code with AI. Left column: mode +
 * language controls and a dark code editor. Right column: streaming-style
 * AI response card with copy, retry and empty states.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  Bug,
  Check,
  Code2,
  Copy,
  FileCode,
  Loader2,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownView } from '@/components/studymate/markdown-view';
import { requestCodeHelp } from '@/lib/studymate/api-client';
import { copyText } from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { CodeInput, CodeMode, ViewKey } from '@/lib/studymate/types';
import { cn } from '@/lib/utils';

type CodeLanguage = CodeInput['language'];

const MAX_CODE_LENGTH = 8000;

/* ---------- static config ---------- */

const LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
];

function languageLabel(value: CodeLanguage): string {
  return LANGUAGES.find((l) => l.value === value)?.label ?? value;
}

interface ModeConfig {
  key: CodeMode;
  label: string;
  submitLabel: string;
  icon: LucideIcon;
  editorPlaceholder: (lang: string) => string;
  contextPlaceholder: string;
}

const MODES: ModeConfig[] = [
  {
    key: 'explain',
    label: 'Explain',
    submitLabel: 'Explain code',
    icon: BookOpen,
    editorPlaceholder: (lang) => `Paste your ${lang} code here…`,
    contextPlaceholder: 'e.g. What does this function do line by line?',
  },
  {
    key: 'debug',
    label: 'Debug',
    submitLabel: 'Find & fix bugs',
    icon: Bug,
    editorPlaceholder: (lang) => `Paste your buggy ${lang} code here…`,
    contextPlaceholder: 'e.g. IndexError: list index out of range',
  },
  {
    key: 'generate',
    label: 'Generate',
    submitLabel: 'Generate code',
    icon: Wand2,
    editorPlaceholder: () => '',
    contextPlaceholder: '',
  },
  {
    key: 'improve',
    label: 'Improve',
    submitLabel: 'Suggest improvements',
    icon: Sparkles,
    editorPlaceholder: (lang) => `Paste your ${lang} code to improve here…`,
    contextPlaceholder: 'Why is this slow?',
  },
];

function modeConfig(mode: CodeMode): ModeConfig {
  return MODES.find((m) => m.key === mode) ?? MODES[0];
}

/* Short per-language sample snippets (≤ 12 lines each). */
const SAMPLES: Record<CodeLanguage, string> = {
  python: `def average(numbers):
    total = 0
    for n in numbers:
        total += n
    return total / len(numbers)

print(average([2, 4, 6]))
print(average([]))  # crashes — can you spot why?`,
  c: `#include <stdio.h>
void swap(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}
int main(void) {
    int x = 3, y = 7;
    swap(&x, &y);
    printf("%d %d\\n", x, y);
    return 0;
}`,
  cpp: `#include <vector>
#include <algorithm>
#include <iostream>

int main() {
    std::vector<int> nums{5, 2, 9, 1};
    std::sort(nums.begin(), nums.end());
    for (int n : nums) std::cout << n << ' ';
    std::cout << '\\n';
}`,
  java: `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        ArrayList<String> names = new ArrayList<>();
        names.add("Ada");
        names.add("Alan");
        for (String n : names) {
            System.out.println(n.toUpperCase());
        }
    }
}`,
  javascript: `const orders = [
  { item: 'Book', price: 12 },
  { item: 'Pen', price: 3 },
];

const total = orders.reduce((sum, o) => sum + o.price, 0);
console.log('Total:', total);`,
};

export default function CodeAssistantView({
  onNavigate,
}: {
  onNavigate: (v: ViewKey) => void;
}) {
  const addActivity = useAppStore((s) => s.addActivity);

  const [language, setLanguage] = useState<CodeLanguage>('python');
  const [mode, setMode] = useState<CodeMode>('explain');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');

  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ctrlRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<CodeInput | null>(null);

  /* Abort any in-flight request when the view unmounts. */
  useEffect(() => () => ctrlRef.current?.abort(), []);

  const activeMode = modeConfig(mode);
  const langLabel = languageLabel(language);
  const isGenerate = mode === 'generate';

  /** Runs one AI request (shared by submit + retry). */
  const run = async (input: CodeInput): Promise<void> => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    lastInputRef.current = input;

    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const reply = await requestCodeHelp(input, ctrl.signal);
      setResult(reply);
      addActivity(
        'code',
        `${modeConfig(input.mode).label} ${languageLabel(input.language)} code`,
      );
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const message =
        (err as Error)?.message || 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSubmit = (): void => {
    setValidation(null);
    const input: CodeInput = isGenerate
      ? { language, mode, code: '', question: description.trim() }
      : { language, mode, code: code.trim(), question: context.trim() || undefined };

    if (isGenerate) {
      if ((input.question?.trim().length ?? 0) < 5) {
        const msg = 'Please describe what to build (at least 5 characters).';
        setValidation(msg);
        toast.error(msg);
        return;
      }
    } else if (input.code !== undefined && input.code.length <= 5) {
      const msg = 'Please paste some code first (at least a few characters).';
      setValidation(msg);
      toast.error(msg);
      return;
    }
    void run(input);
  };

  const handleRetry = (): void => {
    if (lastInputRef.current) void run(lastInputRef.current);
  };

  const handleLoadSample = (): void => {
    setCode(SAMPLES[language]);
    setValidation(null);
    toast.success(`${langLabel} sample loaded`);
  };

  const switchMode = (next: CodeMode): void => {
    setMode(next);
    setValidation(null);
  };

  const handleCopyAll = async (): Promise<void> => {
    if (!result) return;
    const ok = await copyText(result);
    if (ok) {
      setCopied(true);
      toast.success('Response copied to clipboard');
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <div>
      {/* ---------- Heading ---------- */}
      <div className="mb-5">
        <h1 className="text-lg font-semibold tracking-tight">Code Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Explain, debug, generate and improve code — powered by AI.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- Left: input card ---------- */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          {/* Language */}
          <div className="max-w-56">
            <label
              htmlFor="code-language"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Language
            </label>
            <Select
              value={language}
              onValueChange={(v) => setLanguage(v as CodeLanguage)}
            >
              <SelectTrigger id="code-language" className="w-full">
                <SelectValue placeholder="Pick a language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode: 2×2 toggle grid */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => switchMode(m.key)}
                  aria-pressed={active}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-blue-500/40 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Editor (explain / debug / improve) or prompt (generate) */}
          {isGenerate ? (
            <div className="mt-4">
              <label
                htmlFor="code-description"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                What should the program do?
              </label>
              <Textarea
                id="code-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value.slice(0, MAX_CODE_LENGTH));
                  setValidation(null);
                }}
                rows={6}
                placeholder="Describe what to build… e.g. 'a program that finds the most common word in a paragraph'"
                className="min-h-[240px] w-full resize-y rounded-xl text-sm"
              />
              <div className="mt-1 text-right text-[10px] text-muted-foreground">
                {description.length} / {MAX_CODE_LENGTH}
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <label
                htmlFor="code-editor"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Your code
              </label>
              <textarea
                id="code-editor"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.slice(0, MAX_CODE_LENGTH));
                  setValidation(null);
                }}
                spellCheck={false}
                placeholder={activeMode.editorPlaceholder(langLabel)}
                aria-label="Code editor"
                className="scrollbar-thin min-h-[240px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={handleLoadSample}>
                  <FileCode className="h-3.5 w-3.5" aria-hidden="true" />
                  Load sample
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  {code.length} / {MAX_CODE_LENGTH}
                </span>
              </div>
              <div className="mt-3">
                <label
                  htmlFor="code-context"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  Optional — error message or specific question
                </label>
                <Input
                  id="code-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder={activeMode.contextPlaceholder}
                />
              </div>
            </div>
          )}

          {validation && (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {validation}
            </p>
          )}

          {/* Submit */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="mt-4 w-full rounded-xl bg-brand-gradient py-2.5 text-white hover:opacity-90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <activeMode.icon className="h-4 w-4" aria-hidden="true" />
            )}
            {activeMode.submitLabel}
          </Button>
        </div>

        {/* ---------- Right: result card ---------- */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">AI Response</h2>
            {result && (
              <Button variant="outline" size="sm" onClick={() => void handleCopyAll()}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {copied ? 'Copied' : 'Copy all'}
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3" aria-live="polite">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2
                  className="h-4 w-4 animate-spin text-blue-500"
                  aria-hidden="true"
                />
                <span className="animate-pulse">Thinking…</span>
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              role="alert"
              className="rounded-xl border border-destructive/40 bg-rose-50 p-4 dark:bg-rose-500/10"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Request failed
                  </p>
                  <p className="mt-1 break-words text-sm text-rose-700/90 dark:text-rose-300/90">
                    {error}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleRetry}>
                    Retry
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : result ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <MarkdownView
                content={result}
                className="scrollbar-thin max-h-[560px] overflow-y-auto pr-1"
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex min-h-[320px] flex-col items-center justify-center text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-500/10">
                <Code2
                  className="h-7 w-7 text-purple-600 dark:text-purple-400"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-4 text-sm font-semibold">
                Your AI explanation will appear here
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Pick a mode, paste code or describe what to build.
              </p>
              <div className="mt-5 flex flex-col items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  onClick={() => switchMode('generate')}
                >
                  New to coding? Generate your first program
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => onNavigate('notes')}
                >
                  Need notes for a concept? Open Notes →
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
