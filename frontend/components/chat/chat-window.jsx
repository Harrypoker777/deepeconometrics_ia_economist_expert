'use client';

import { memo, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  Brain,
  ChevronDown,
  CircleCheck,
  LoaderCircle,
  User,
  Wrench,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { EconomicTable } from '@/components/chat/economic-table';
import {
  formatAssistantMarkdown,
  findDownloadsInMessage,
  getMessageText,
  getReasoningText,
  stripChartBlocks,
  summarizeToolCall,
} from '@/lib/chat-helpers';
import { DeepEconometricsLogo } from '@/components/brand/deepeconometrics-logo';
import { PerfBoundary } from '@/components/performance/perf-boundary';

const EconomicChart = dynamic(
  () => import('@/components/chat/economic-chart').then((module) => module.EconomicChart),
  {
    loading: () => (
      <div className="h-[296px] rounded-[1.5rem] border border-border/80 bg-secondary/30" />
    ),
  }
);

function StreamingTextBody({ children }) {
  if (!children) return null;

  return (
    <div className="prose-deep whitespace-pre-wrap text-[15px] leading-7 text-foreground">
      {children}
    </div>
  );
}

function MarkdownBody({ children }) {
  if (!children) return null;

  return (
    <div className="prose-deep text-[15px] leading-7 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
        components={{
          p: ({ node, ...props }) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-3 ml-5 list-disc space-y-1.5" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-3 ml-5 list-decimal space-y-1.5" {...props} />,
          li: ({ node, ...props }) => <li className="leading-6" {...props} />,
          h1: ({ node, ...props }) => <h1 className="mb-3 mt-6 text-xl font-semibold" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mb-2 mt-5 text-lg font-semibold" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mb-2 mt-4 text-base font-semibold" {...props} />,
          a: ({ node, href, children: linkChildren, ...props }) => {
            const safeHref = typeof href === 'string' ? href.trim() : '';

            if (!safeHref) {
              return <>{linkChildren}</>;
            }

            return (
              <a
                className="text-accent-strong underline decoration-accent/40 underline-offset-4 hover:decoration-accent-strong"
                href={safeHref}
                target="_blank"
                rel="noreferrer"
                {...props}
              >
                {linkChildren}
              </a>
            );
          },
          img: ({ node, src, alt, ...props }) => {
            const safeSrc = typeof src === 'string' ? src.trim() : '';

            if (!safeSrc) {
              return null;
            }

            return (
              // Markdown can contain arbitrary remote image URLs that are not suitable for next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={alt || ''}
                className="my-4 rounded-[1.25rem] border border-border/70 bg-background/70"
                loading="lazy"
                src={safeSrc}
                {...props}
              />
            );
          },
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
    <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border/75 bg-background/78">
      <DeepEconometricsLogo className="h-5 w-auto" />
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

function ResultArtifact({ artifact }) {
  if (!artifact?.chart) return null;

  return (
    <section
      id={artifact.anchorId}
      className="mt-4 scroll-mt-24 rounded-[1.45rem] border border-border/65 bg-secondary/18 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Resultado {artifact.order}
          </p>
          <p className="mt-1 text-sm text-foreground">
            Chart y tabla listos para consulta rapida.
          </p>
        </div>
      </div>

      <EconomicChart chart={artifact.chart} />

      <div className="mt-3">
        <EconomicTable chart={artifact.chart} />
      </div>
    </section>
  );
}

const MemoResultArtifact = memo(
  ResultArtifact,
  (prevProps, nextProps) => prevProps.artifact === nextProps.artifact
);

function MessageBubble({ artifacts, message, status, isLast }) {
  const isAssistant = message.role === 'assistant';
  const isStreaming = isLast && isAssistant && status === 'streaming';
  const rawText = useMemo(() => getMessageText(message), [message]);
  const strippedText = useMemo(() => stripChartBlocks(rawText), [rawText]);
  const text = useMemo(
    () => (isAssistant && !isStreaming ? formatAssistantMarkdown(strippedText) : strippedText),
    [isAssistant, isStreaming, strippedText]
  );
  const reasoning = useMemo(() => getReasoningText(message), [message]);
  const toolParts = useMemo(
    () => (message.parts || []).filter((part) => part.type.startsWith('tool-')),
    [message]
  );
  const downloads = useMemo(() => findDownloadsInMessage(message), [message]);
  const activeReasoning = isStreaming && Boolean(reasoning) && !text;

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
          {reasoning && <ReasoningBlock text={reasoning} active={activeReasoning} />}

          {toolParts.length > 0 && (
            <div className={`${reasoning ? 'mt-3' : ''} flex flex-wrap gap-2`}>
              {toolParts.map((part, index) => (
                <ToolBadge
                  key={part.toolCallId || `${part.type}-${part.state}-${index}`}
                  part={part}
                />
              ))}
            </div>
          )}

          {text && (
            <div className={`${reasoning || toolParts.length > 0 ? 'mt-4' : ''}`}>
              {isStreaming ? (
                <StreamingTextBody>{text}</StreamingTextBody>
              ) : (
                <MarkdownBody>{text}</MarkdownBody>
              )}
            </div>
          )}

          {artifacts.map((artifact) => (
            <MemoResultArtifact key={artifact.anchorId} artifact={artifact} />
          ))}

          {downloads.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {downloads.map((item, index) => (
                <DownloadPill key={item.url || `download-${index}`} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MemoMessageBubble = memo(
  MessageBubble,
  (prevProps, nextProps) => (
    prevProps.artifacts === nextProps.artifacts &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.message === nextProps.message &&
    prevProps.status === nextProps.status
  )
);

function ChatWindowImpl({ messages, status, error, artifacts = [] }) {
  const artifactsByMessageId = useMemo(() => {
    const nextArtifactsByMessageId = {};

    for (const artifact of artifacts) {
      if (!nextArtifactsByMessageId[artifact.messageId]) {
        nextArtifactsByMessageId[artifact.messageId] = [];
      }

      nextArtifactsByMessageId[artifact.messageId].push(artifact);
    }

    return nextArtifactsByMessageId;
  }, [artifacts]);

  return (
    <PerfBoundary id="chat-window">
      <div className="space-y-6">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;

          return (
            <MemoMessageBubble
              artifacts={artifactsByMessageId[message.id] || []}
              key={message.id || `message-${index}`}
              message={message}
              status={isLast ? status : 'idle'}
              isLast={isLast}
            />
          );
        })}

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
    </PerfBoundary>
  );
}

export const ChatWindow = memo(
  ChatWindowImpl,
  (prevProps, nextProps) => (
    prevProps.artifacts === nextProps.artifacts &&
    prevProps.error === nextProps.error &&
    prevProps.messages === nextProps.messages &&
    prevProps.status === nextProps.status
  )
);
