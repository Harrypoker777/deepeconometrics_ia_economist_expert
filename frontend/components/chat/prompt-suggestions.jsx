'use client';

import { INDICATOR_PROMPTS } from '@/lib/chat-helpers';

export function PromptSuggestions({ onSelect, variant = 'default' }) {
  const isHero = variant === 'hero';
  const wrapperClass = isHero
    ? 'mt-8 grid w-full max-w-4xl gap-4 md:grid-cols-3'
    : 'mt-6 grid w-full gap-3 md:grid-cols-3';
  const cardClass = isHero
    ? 'rounded-2xl border border-border bg-card/80 px-4 py-4 text-left shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-foreground/20'
    : 'rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-secondary';

  return (
    <div className={wrapperClass}>
      {INDICATOR_PROMPTS.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => onSelect(item.prompt)}
          className={cardClass}
        >
          <span className="text-sm font-semibold text-foreground">
            {item.label}
          </span>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </button>
      ))}
    </div>
  );
}
