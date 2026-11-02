'use client';

/**
 * Shared Markdown renderer used by AI Chat, Notes, Assignment Helper
 * and the Code Assistant. Features:
 *  - GFM (tables, task lists)
 *  - styled code blocks with language badge + copy button
 *  - clean typography that matches the StudyMate design system
 */
import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { copyText } from '@/lib/studymate/helpers';
import { cn } from '@/lib/utils';

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border bg-zinc-950 text-zinc-100 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          {lang || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="scrollbar-thin overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export const MarkdownView = memo(function MarkdownView({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => (
            <h1 className="mb-3 mt-5 scroll-m-20 text-xl font-bold first:mt-0" {...p} />
          ),
          h2: (p) => (
            <h2 className="mb-2 mt-5 scroll-m-20 border-b pb-1 text-base font-bold first:mt-0" {...p} />
          ),
          h3: (p) => <h3 className="mb-2 mt-4 text-sm font-semibold first:mt-0" {...p} />,
          h4: (p) => <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0" {...p} />,
          p: (p) => <p className="mb-3 last:mb-0" {...p} />,
          ul: (p) => <ul className="mb-3 ml-5 list-disc space-y-1" {...p} />,
          ol: (p) => <ol className="mb-3 ml-5 list-decimal space-y-1" {...p} />,
          li: (p) => <li className="pl-1" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          em: (p) => <em className="italic" {...p} />,
          a: (p) => (
            <a
              className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
              target="_blank"
              rel="noreferrer"
              {...p}
            />
          ),
          blockquote: (p) => (
            <blockquote
              className="my-3 border-l-4 border-blue-300 bg-blue-50/50 py-1 pl-3 italic dark:border-blue-700 dark:bg-blue-500/10"
              {...p}
            />
          ),
          hr: () => <hr className="my-4" />,
          table: (p) => (
            <div className="scrollbar-thin my-3 overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-xs" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-muted/70" {...p} />,
          th: (p) => <th className="border-b px-3 py-2 font-semibold" {...p} />,
          td: (p) => <td className="border-b px-3 py-2 align-top last:border-b-0" {...p} />,
          code: (props) => {
            const { children, className } = props;
            const match = /language-(\w+)/.exec(className || '');
            const text = String(children).replace(/\n$/, '');
            const isBlock = text.includes('\n') || !!match;
            if (isBlock) {
              return <CodeBlock code={text} lang={match?.[1] ?? ''} />;
            }
            return (
              <code className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[12px] font-medium">
                {text}
              </code>
            );
          },
          pre: (p) => <pre className="m-0" {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
