'use client';

import { Send, Square } from 'lucide-react';

export function ChatComposer({
  busy,
  disabled,
  draft,
  helperText,
  onChange,
  onKeyDown,
  onStop,
  onSubmit,
  placeholder,
  textareaRef,
  variant = 'docked',
}) {
  const isHero = variant === 'hero';
  const containerClass = isHero
    ? 'rounded-2xl border border-border bg-background px-4 py-3 transition-colors focus-within:border-foreground/20'
    : 'rounded-2xl border border-border bg-background px-4 py-3 transition-colors focus-within:border-foreground/20';
  const buttonClass = isHero
    ? 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-30'
    : 'flex size-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/90 disabled:opacity-30';
  const textareaClass = isHero
    ? 'max-h-36 min-h-[44px] flex-1 resize-none bg-transparent text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none'
    : 'max-h-36 min-h-[24px] flex-1 resize-none bg-transparent text-sm leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none';

  return (
    <div>
      <form
        onSubmit={onSubmit}
        className={`flex items-end gap-3 ${containerClass}`}
      >
        <textarea
          ref={textareaRef}
          className={textareaClass}
          disabled={disabled || busy}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          value={draft}
        />

        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className={buttonClass}
          >
            <Square className={isHero ? 'size-3.5' : 'size-3.5'} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !draft.trim()}
            className={buttonClass}
          >
            <Send className={isHero ? 'size-3.5' : 'size-3.5'} />
          </button>
        )}
      </form>

      {helperText && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
