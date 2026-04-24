'use client';

import { ArrowUpRight } from 'lucide-react';
import { INDICATOR_PROMPTS } from '@/lib/chat-helpers';

export function PromptSuggestions({ onSelect, variant = 'default' }) {
  const minimal = variant === 'minimal';
  const wrapperClass = minimal
    ? 'flex w-full flex-wrap justify-center gap-2.5'
    : 'mt-8 grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4';

  return (
    <div className={wrapperClass}>
      {INDICATOR_PROMPTS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.prompt)}
          className={`group flex text-left transition-colors ${
            minimal
              ? 'items-center gap-2 rounded-full border border-border/80 bg-surface/72 px-3.5 py-2.5 hover:border-accent/40 hover:bg-accent/8'
              : 'min-h-[8.25rem] flex-col justify-between rounded-[1.35rem] border border-border/85 bg-surface/80 px-4 py-4 hover:bg-secondary/70'
          }`}
        >
          {minimal ? (
            <>
              <span className="text-sm font-medium text-foreground">
                {item.label}
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-sm font-semibold tracking-[-0.02em] text-foreground">
                  {item.label}
                </span>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>

              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
