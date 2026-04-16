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
    ? 'rounded-[2rem] border border-border bg-card/90 px-5 py-4 shadow-[0_28px_90px_-48px_rgba(15,23,42,0.35)] backdrop-blur'
    : 'rounded-2xl border border-border bg-secondary/60 px-4 py-3';
  const buttonClass = isHero
    ? 'flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-colors hover:bg-foreground/85 disabled:opacity-30'
    : 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-colors hover:bg-foreground/80 disabled:opacity-30';
  const textareaClass = isHero
    ? 'max-h-48 min-h-[56px] flex-1 resize-none bg-transparent text-base leading-7 text-foreground placeholder:text-muted-foreground focus:outline-none'
    : 'max-h-40 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none';

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
            <Square className={isHero ? 'size-4' : 'size-3.5'} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !draft.trim()}
            className={buttonClass}
          >
            <Send className={isHero ? 'size-4' : 'size-3.5'} />
          </button>
        )}
      </form>

      {helperText && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
