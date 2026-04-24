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
  const minimal = variant === 'minimal';
  const expanded = variant === 'hero' || variant === 'minimal';
  const shellClass = minimal
    ? 'rounded-[1.8rem] p-3 sm:p-3.5'
    : expanded
      ? 'rounded-[1.6rem] p-3.5 sm:p-4'
      : 'rounded-[1.45rem] p-3 sm:p-3.5';

  return (
    <div className={`composer-shell ${shellClass}`}>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <div className={`min-w-0 flex-1 rounded-[1.35rem] border border-border/80 bg-background/82 px-4 transition-colors focus-within:border-accent/40 focus-within:bg-background ${minimal ? 'py-3.5' : 'py-3'}`}>
            <textarea
              ref={textareaRef}
              className={`${minimal ? 'min-h-[70px] max-h-40' : expanded ? 'min-h-[92px] max-h-56' : 'min-h-[72px] max-h-48'} w-full resize-none bg-transparent text-[15px] leading-7 text-foreground placeholder:text-muted-foreground focus:outline-none`}
              disabled={disabled || busy}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              rows={1}
              value={draft}
            />

            {!minimal && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-[11px] text-muted-foreground">
                <p className="truncate">
                  {helperText || 'Enter para enviar. Shift + Enter para salto.'}
                </p>
                <span className="hidden sm:block">
                  {busy ? 'Respondiendo...' : 'Chat en vivo'}
                </span>
              </div>
            )}
          </div>

          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className={`flex shrink-0 items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary/92 ${minimal ? 'size-11 rounded-[1.35rem]' : 'size-12 rounded-2xl'}`}
              aria-label="Detener"
            >
              <Square className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !draft.trim()}
              className={`flex shrink-0 items-center justify-center bg-primary text-primary-foreground transition-colors hover:bg-primary/92 disabled:opacity-40 ${minimal ? 'size-11 rounded-[1.35rem]' : 'size-12 rounded-2xl'}`}
              aria-label="Enviar"
            >
              <Send className="size-4" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
