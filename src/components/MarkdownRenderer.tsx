import { memo, useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard } from '../utils/clipboard';

interface MarkdownRendererProps {
  content: string;
  copyCodeLabel: string;
  copiedLabel: string;
}

interface CodeBlockProps {
  language: string;
  code: string;
  copyCodeLabel: string;
  copiedLabel: string;
}

const REMARK_PLUGINS = [remarkGfm];

const CodeBlock = memo(function CodeBlock({
  language,
  code,
  copyCodeLabel,
  copiedLabel,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setCopied(true);
    timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    void copyToClipboard(code).then((ok) => {
      if (!ok) {
        setCopied(false);
      }
    });
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-slate-100 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 px-3.5 py-2 text-xs text-slate-300 dark:border-zinc-800 dark:bg-zinc-900/80">
        <span className="font-mono text-xs font-medium text-slate-300">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? copiedLabel : copyCodeLabel}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors duration-75 hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-teal-400" />
              <span className="text-teal-300">{copiedLabel}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>{copyCodeLabel}</span>
            </>
          )}
        </button>
      </div>
      <pre className="geriai-scroll overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code className="font-mono text-slate-100">{code}</code>
      </pre>
    </div>
  );
});

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  copyCodeLabel,
  copiedLabel,
}: MarkdownRendererProps) {
  return (
    <div className="space-y-3 text-[15px] leading-[1.7] text-slate-800 dark:text-zinc-200">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-5 mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-4 mb-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-50 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-3.5 mb-1.5 text-base font-semibold text-slate-900 dark:text-zinc-100 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="leading-[1.7]">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1.5 pl-6 marker:text-slate-400 dark:marker:text-zinc-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1.5 pl-6 marker:font-medium marker:text-slate-500 dark:marker:text-zinc-400">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-[1.65]">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-lg border border-slate-200 bg-slate-100/70 px-4 py-2.5 text-slate-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2 transition-colors hover:text-teal-800 dark:text-teal-400 dark:decoration-teal-400/40 dark:hover:text-teal-300"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-4 border-slate-200 dark:border-zinc-800" />,
          table: ({ children }) => (
            <div className="geriai-scroll my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-slate-200 bg-slate-100/80 text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-slate-200/80 px-3.5 py-2 dark:border-zinc-800/80">
              {children}
            </td>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children, ...props }: ComponentPropsWithoutRef<'code'>) => {
            const match = /language-(\w+)/.exec(className || '');
            const text = String(children ?? '').replace(/\n$/, '');
            const isBlock = Boolean(match) || text.includes('\n');

            if (isBlock) {
              return (
                <CodeBlock
                  language={match?.[1] ?? ''}
                  code={text}
                  copyCodeLabel={copyCodeLabel}
                  copiedLabel={copiedLabel}
                />
              );
            }

            return (
              <code
                {...props}
                className="rounded bg-slate-200/75 px-1.5 py-0.5 font-mono text-[13px] font-medium text-slate-900 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
