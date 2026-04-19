'use client';

import { INDICATOR_PROMPTS } from '@/lib/chat-helpers';

export function PromptSuggestions({ onSelect, variant = 'default' }) {
  const isHero = variant === 'hero';
  const wrapperClass = isHero
    ? 'mt-5 grid w-full max-w-3xl gap-2.5 md:grid-cols-3'
    : 'mt-6 grid w-full gap-3 md:grid-cols-3';
  const cardClass = isHero
    ? 'rounded-xl border border-border bg-background px-3.5 py-3 text-left transition-colors hover:bg-secondary'
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
          <span className="text-sm font-medium text-foreground">
            {item.label}
          </span>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            {item.description}
          </p>
        </button>
      ))}
    </div>
  );
}
