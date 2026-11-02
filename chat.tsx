'use client';

/**
 * StudyMate AI — AI Chat view.
 * ChatGPT-style conversation with the AI study assistant: persisted history,
 * suggestion chips, typing indicator, copy buttons, retry-on-error composer.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Loader2,
  Send,
  Trash2,
  X,
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
import { Button } from '@/components/ui/button';
import { MarkdownView } from '@/components/studymate/markdown-view';
import { requestChatCompletion } from '@/lib/studymate/api-client';
import { copyText, formatDateTime } from '@/lib/studymate/helpers';
import { useAppStore } from '@/lib/studymate/store';
import type { ChatMessagePayload, ViewKey } from '@/lib/studymate/types';

const MAX_VISIBLE_MESSAGES = 60;
const MAX_TEXTAREA_HEIGHT = 120;

const SUGGESTIONS = [
  'Explain photosynthesis simply',
  'Help me revise for exams',
  'Summarize the French Revolution',
  'Tips to stay focused while studying',
];

function chatActivityTitle(content: string): string {
  return `Chat: ${content.slice(0, 48)}${content.length > 48 ? '…' : ''}`;
}

/** Tiny copy affordance shown under each assistant message. */
function CopyMessageButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy message"
      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3" aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ChatView({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const addActivity = useAppStore((s) => s.addActivity);
  const clearChat = useAppStore((s) => s.clearChat);
  const profile = useAppStore((s) => s.profile);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);

  /* Abort any in-flight request when the view unmounts. */
  useEffect(() => () => ctrlRef.current?.abort(), []);

  /* Keep the conversation pinned to the latest message. */
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [chatMessages.length, isSending]);

  const visibleMessages = chatMessages.slice(-MAX_VISIBLE_MESSAGES);
  const hiddenCount = chatMessages.length - visibleMessages.length;
  const lastRole = chatMessages[chatMessages.length - 1]?.role;
  const showTyping = isSending && lastRole === 'user';

  const resetTextareaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  /** Runs one completion against the current conversation history. */
  const runCompletion = async (activityTitle: string): Promise<void> => {
    const payload: ChatMessagePayload[] = useAppStore
      .getState()
      .chatMessages.map((m) => ({ role: m.role, content: m.content }));
    if (payload.length === 0) return;

    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;

    setIsSending(true);
    setError(null);
    try {
      const reply = await requestChatCompletion(payload, ctrl.signal);
      addChatMessage({ role: 'assistant', content: reply });
      addActivity('chat', activityTitle);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      const message =
        (err as Error)?.message || 'Something went wrong. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      if (ctrlRef.current === ctrl) ctrlRef.current = null;
      setIsSending(false);
    }
  };

  const send = async (raw: string): Promise<void> => {
    const content = raw.trim();
    if (!content || isSending) return;
    addChatMessage({ role: 'user', content });
    setInput('');
    resetTextareaHeight();
    await runCompletion(chatActivityTitle(content));
  };

  /** Re-runs the last user message without duplicating it in history. */
  const retry = (): void => {
    if (isSending) return;
    const lastUser = [...useAppStore.getState().chatMessages]
      .reverse()
      .find((m) => m.role === 'user');
    if (!lastUser) return;
    void runCompletion(chatActivityTitle(lastUser.content));
  };

  const handleClear = (): void => {
    clearChat();
    setError(null);
    toast.success('Chat cleared');
  };

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[520px] flex-col rounded-2xl border bg-card shadow-sm">
      {/* ---------- Header ---------- */}
      <div className="flex items-center gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-sm">
          <Bot className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight">AI Study Assistant</p>
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-emerald-500"
              aria-hidden="true"
            />
            <span className="text-xs text-muted-foreground">Online · AI powered</span>
          </div>
        </div>
        {chatMessages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete the entire conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  All messages in this chat will be permanently removed. This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-white hover:bg-destructive/90"
                  onClick={handleClear}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* ---------- Messages ---------- */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6"
      >
        {chatMessages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
              <Bot className="h-8 w-8 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">
              Hi{profile.name ? `, ${profile.name}` : ''}! I&apos;m your AI study buddy.
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Ask me anything — concepts, homework doubts, exam strategy or quick facts.
            </p>
            <div className="mt-5 flex max-w-md flex-wrap items-center justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border px-3.5 py-2 text-xs font-medium transition-colors hover:bg-accent"
                >
                  {suggestion}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onNavigate('quiz')}
                className="rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
              >
                Practice with a quiz →
              </button>
            </div>
          </div>
        ) : (
          <>
            {hiddenCount > 0 && (
              <div className="flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground">
                  Earlier messages hidden
                </span>
              </div>
            )}
            {visibleMessages.map((msg) =>
              msg.role === 'user' ? (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="ml-auto max-w-[85%] sm:max-w-[75%]"
                >
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-gradient px-4 py-2.5 text-sm text-white shadow-sm">
                    {msg.content}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mr-auto max-w-[92%] sm:max-w-[85%]"
                >
                  <div className="rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-3">
                    <MarkdownView content={msg.content} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 pl-1">
                    <CopyMessageButton content={msg.content} />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTime(msg.at)}
                    </span>
                  </div>
                </motion.div>
              ),
            )}
            {showTyping && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mr-auto"
              >
                <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-3">
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ---------- Error banner ---------- */}
      {error && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-destructive/40 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-500/10 dark:text-rose-300 sm:mx-4">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-rose-700 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200"
            onClick={retry}
          >
            Retry
          </Button>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            className="rounded-md p-1 text-rose-600 transition-colors hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-500/20"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ---------- Composer ---------- */}
      <div className="border-t p-3 sm:p-4">
        <div className="flex items-end gap-2 rounded-2xl border bg-background p-2 focus-within:ring-2 focus-within:ring-blue-500/30">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                e.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask your study doubt… (Enter to send, Shift+Enter for new line)"
            aria-label="Message the AI study assistant"
            className="max-h-[120px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button
            type="button"
            onClick={() => void send(input)}
            disabled={isSending || input.trim().length === 0}
            className="rounded-xl bg-brand-gradient px-4 text-white hover:opacity-90"
            aria-label="Send message"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
