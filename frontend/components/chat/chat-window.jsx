'use client';

import { useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Brain,
  ChevronDown,
  CircleCheck,
  LoaderCircle,
  Sparkles,
  User,
  Wrench,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { EconomicChart } from '@/components/chat/economic-chart';
import {
  findChartsInMessage,
  findDownloadsInMessage,
  getMessageText,
  getReasoningText,
  stripChartBlocks,
  summarizeToolCall,
} from '@/lib/chat-helpers';

function MarkdownBody({ children }) {
  if (!children) return null;

  return (
    <div className="prose-deep text-[15px] leading-7 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ node, ...props }) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-3 ml-5 list-disc space-y-1.5" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-3 ml-5 list-decimal space-y-1.5" {...props} />,
          li: ({ node, ...props }) => <li className="leading-6" {...props} />,
          h1: ({ node, ...props }) => <h1 className="mb-3 mt-6 text-xl font-semibold" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mb-2 mt-5 text-lg font-semibold" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 text-base font-semibold" {...props} />,
          a: ({ node, ...props }) => (
            <a
              className="text-accent-strong underline decoration-accent/40 underline-offset-4 hover:decoration-accent-strong"
              target="_blank"
              rel="noreferrer"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="my-3 rounded-r-xl border-l-2 border-accent/50 bg-accent/5 px-4 py-3 text-sm italic text-muted-foreground"
              {...props}
            />
          ),
          code: ({ inline, className, children, ...props }) => {
            if (inline) {
              return (
                <code
                  className="rounded-md border border-border bg-secondary/70 px-1 py-0.5 font-mono text-[0.85em]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <pre className="my-3 overflow-x-auto rounded-2xl border border-border bg-secondary/65 p-4 text-[13px] leading-6">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th
              className="border-b border-border bg-secondary/65 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td className="border-b border-border/70 px-3 py-2.5 align-top" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function ReasoningBlock({ text, active }) {
  const [open, setOpen] = useState(active);

  if (!text) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-[1.2rem] border border-border/80 bg-secondary/45">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary/65"
      >
        <Brain className="size-3.5 shrink-0 text-accent-strong" />
        <span className="flex-1">
          {active ? 'Thinking...' : 'Razonamiento del agente'}
        </span>
        {active && <LoaderCircle className="size-3 animate-spin" />}
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-border/75 px-4 py-3">
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-[13px] leading-6 text-muted-foreground">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBadge({ part }) {
  const info = summarizeToolCall(part);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/50 px-3 py-1.5 text-xs text-muted-foreground">
      {info.running ? (
        <LoaderCircle className="size-3 animate-spin text-accent-strong" />
      ) : info.done ? (
        <CircleCheck className="size-3 text-accent-strong" />
      ) : (
        <Wrench className="size-3" />
      )}
      <span>{info.label}</span>
    </div>
  );
}

function DownloadPill({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary/70"
    >
      <ArrowDown className="size-3" />
      {item.label}
    </a>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-secondary/80 text-foreground">
      <Sparkles className="size-4" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
      <User className="size-4" />
    </div>
  );
}

function MessageBubble({ message, status, isLast }) {
  const isAssistant = message.role === 'assistant';
  const text = stripChartBlocks(getMessageText(message));
  const reasoning = getReasoningText(message);
  const toolParts = (message.parts || []).filter((part) => part.type.startsWith('tool-'));
  const charts = findChartsInMessage(message);
  const downloads = findDownloadsInMessage(message);
  const activeReasoning = isLast && isAssistant && status === 'streaming' && Boolean(reasoning) && !text;

  if (!isAssistant) {
    return (
      <div className="flex justify-end">
        <div className="flex max-w-[88%] items-end gap-3 sm:max-w-[82%]">
          <div className="rounded-[1.4rem] rounded-br-md border border-border/80 bg-secondary/80 px-4 py-3 text-[15px] leading-7 text-foreground">
            {text}
          </div>
          <UserAvatar />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <AssistantAvatar />

      <div className="min-w-0 flex-1">
        <div className="rounded-[1.4rem] border border-border/75 bg-background/60 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              DeepEconometrics
            </p>

            {toolParts.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {toolParts.length} tools
              </span>
            )}
          </div>

          {reasoning && <ReasoningBlock text={reasoning} active={activeReasoning} />}

          {toolParts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {toolParts.map((part) => (
                <ToolBadge key={part.toolCallId || `${part.type}-${part.state}`} part={part} />
              ))}
            </div>
          )}

          {text && (
            <div className="mt-4">
              <MarkdownBody>{text}</MarkdownBody>
            </div>
          )}

          {charts.map((chart, index) => (
            <div key={`${chart.title}-${index}`} className="mt-4">
              <EconomicChart chart={chart} />
            </div>
          ))}

          {downloads.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {downloads.map((item) => (
                <DownloadPill key={item.url} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatWindow({ messages, status, error }) {
  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          status={status}
          isLast={index === messages.length - 1}
        />
      ))}

      {status === 'submitted' && (
        <div className="flex gap-3">
          <AssistantAvatar />
          <div className="flex items-center gap-2 rounded-[1.2rem] border border-border/80 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin text-accent-strong" />
            Consultando herramientas y base de conocimiento...
          </div>
        </div>
      )}

      {status === 'error' && error && (
        <div className="flex items-start gap-2 rounded-[1.2rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}
