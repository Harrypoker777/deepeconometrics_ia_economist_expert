'use client';

import { LoaderCircle, Send, Square } from 'lucide-react';

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
  const expanded = variant === 'hero';

  return (
    <div className={`composer-shell ${expanded ? 'rounded-[1.75rem] p-4 sm:p-5' : 'rounded-[1.5rem] p-3.5 sm:p-4'}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1 rounded-[1.25rem] border border-border/80 bg-background/75 px-4 py-3 transition-colors focus-within:border-accent/35 focus-within:bg-background">
            <textarea
              ref={textareaRef}
              className={`${expanded ? 'min-h-[108px] max-h-56' : 'min-h-[88px] max-h-48'} w-full resize-none bg-transparent text-[15px] leading-7 text-foreground placeholder:text-muted-foreground focus:outline-none`}
              disabled={disabled || busy}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              rows={1}
              value={draft}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span className="status-pill">
                  {busy ? (
                    <LoaderCircle className="size-3 animate-spin text-accent-strong" />
                  ) : (
                    <span className="dot-pulse" />
                  )}
                  {busy ? 'Thinking' : 'Enter para enviar'}
                </span>

                <span className="status-pill">
                  Chat-first
                </span>

                <span className="status-pill">
                  Tools server-side
                </span>
              </div>

              <span className="hidden sm:block">Shift + Enter para salto</span>
            </div>
          </div>

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-colors hover:bg-primary/92"
              aria-label="Detener"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !draft.trim()}
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-40"
              aria-label="Enviar"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>

        <p className="px-1 text-[11px] leading-5 text-muted-foreground">
          {helperText}
        </p>
      </form>
    </div>
  );
}
