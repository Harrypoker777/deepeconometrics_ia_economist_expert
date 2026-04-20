'use client';

import { ArrowUpRight } from 'lucide-react';
import { INDICATOR_PROMPTS } from '@/lib/chat-helpers';

export function PromptSuggestions({ onSelect, variant = 'default' }) {
  const compact = variant === 'compact';
  const wrapperClass = compact
    ? 'mt-8 grid w-full gap-3 md:grid-cols-2'
    : 'mt-8 grid w-full gap-3 md:grid-cols-2 xl:grid-cols-4';

  return (
    <div className={wrapperClass}>
      {INDICATOR_PROMPTS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.prompt)}
          className="group flex min-h-[8.25rem] flex-col justify-between rounded-[1.35rem] border border-border/85 bg-surface/80 px-4 py-4 text-left transition-colors hover:bg-secondary/70"
        >
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold tracking-[-0.02em] text-foreground">
                {item.label}
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>

          <span className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Usar prompt
          </span>
        </button>
      ))}
    </div>
  );
}
