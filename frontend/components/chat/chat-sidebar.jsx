'use client';

import { useState } from 'react';
import {
  LogIn,
  LogOut,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Settings2,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

function SettingsMenu({ collapsed, onClearHistory, onLogout, onOpenAccount }) {
  return (
    <div
      className={`panel-surface absolute z-20 rounded-[1.2rem] p-1.5 ${
        collapsed ? 'bottom-4 left-[calc(100%+0.65rem)] w-56' : 'bottom-24 left-3 right-3'
      }`}
    >
      <button
        type="button"
        onClick={onOpenAccount}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary/75"
      >
        <UserRound className="size-4" />
        Cuenta
      </button>

      <button
        type="button"
        onClick={onClearHistory}
        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary/75"
      >
        <Trash2 className="size-4" />
        Borrar historial
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
      >
        <LogOut className="size-4" />
        Cerrar sesion
      </button>
    </div>
  );
}

function SessionRow({ active, onDelete, onSelect, title }) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-start gap-3 rounded-[1rem] border px-3 py-3 text-left transition-colors ${
          active
            ? 'border-border bg-secondary/80 text-foreground'
            : 'border-transparent text-muted-foreground hover:border-border/70 hover:bg-secondary/55 hover:text-foreground'
        }`}
      >
        <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
          active ? 'bg-background text-foreground' : 'bg-background/70 text-muted-foreground'
        }`}>
          <MessageSquare className="size-3.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {title}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Conversacion guardada
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-red-500 group-hover:flex"
        title="Eliminar conversacion"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function BrandBlock({ subtitle }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <span className="text-sm font-semibold tracking-[0.18em]">
          DE
        </span>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">
          DeepEconometrics
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

export function ChatSidebar({
  collapsed,
  currentSessionId,
  isAuthenticated = true,
  onAuthenticate,
  onClearHistory,
  onDeleteSession,
  onLogout,
  onNewChat,
  onOpenAccount,
  onSelectSession,
  onToggle,
  sessions,
  userEmail,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleOpenAccount() {
    setMenuOpen(false);
    onOpenAccount();
  }

  function handleClearHistory() {
    setMenuOpen(false);
    onClearHistory();
  }

  function handleLogout() {
    setMenuOpen(false);
    onLogout();
  }

  if (collapsed) {
    return (
      <aside className="sidebar-panel panel-surface relative hidden w-[4.75rem] shrink-0 flex-col items-center rounded-[1.7rem] p-3 md:flex">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <span className="text-sm font-semibold tracking-[0.18em]">
            DE
          </span>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="mt-4 flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          title="Abrir sidebar"
        >
          <PanelLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className="mt-3 flex size-10 items-center justify-center rounded-xl bg-secondary/80 text-foreground transition-colors hover:bg-secondary"
          title="Nuevo chat"
        >
          <Plus className="size-4" />
        </button>

        <div className="mt-4 h-full w-px flex-1 rounded-full bg-border/70" />

        {isAuthenticated ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              title="Ajustes"
            >
              <Settings2 className="size-4" />
            </button>

            {menuOpen && (
              <SettingsMenu
                collapsed
                onOpenAccount={handleOpenAccount}
                onClearHistory={handleClearHistory}
                onLogout={handleLogout}
              />
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onAuthenticate}
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            title="Iniciar sesion"
          >
            <LogIn className="size-4" />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside className="sidebar-panel panel-surface hidden w-[17.75rem] shrink-0 flex-col rounded-[1.9rem] p-3 md:flex">
      <div className="rounded-[1.35rem] border border-border/80 bg-background/75 p-3">
        <div className="flex items-start justify-between gap-3">
          <BrandBlock subtitle={isAuthenticated ? 'Workspace con memoria' : 'Modo temporal'} />

          <button
            type="button"
            onClick={onToggle}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
            title="Colapsar sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="mt-4 w-full justify-center rounded-[1rem]"
          onClick={onNewChat}
        >
          <Plus className="size-4" />
          Nuevo chat
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Conversaciones
        </p>
        <span className="rounded-full border border-border/80 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground">
          {isAuthenticated ? sessions.length : 'Temp'}
        </span>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {isAuthenticated ? (
          sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <SessionRow
                  key={session.sessionId}
                  active={session.sessionId === currentSessionId}
                  title={session.title}
                  onSelect={() => onSelectSession(session.sessionId)}
                  onDelete={() => onDeleteSession(session.sessionId)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
              Aun no hay conversaciones guardadas. Inicia una nueva y quedara persistida en tu cuenta.
            </div>
          )
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-border/80 bg-background/60 px-4 py-6">
            <p className="text-sm font-medium text-foreground">
              Historial desactivado
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Puedes usar el chat sin login, pero la memoria de conversaciones se activa al iniciar sesion.
            </p>
          </div>
        )}
      </div>

      <div className="relative mt-3">
        {isAuthenticated ? (
          <div className="rounded-[1.35rem] border border-border/80 bg-background/75 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-secondary/80 text-foreground">
                <UserRound className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {userEmail}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sesion autenticada
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
                title="Ajustes"
              >
                <Settings2 className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-border/80 bg-background/75 p-3">
            <p className="text-sm font-medium text-foreground">
              Activa memoria y sesiones
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Guarda chats y retoma analisis sin perder contexto.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full justify-center rounded-[1rem]"
              onClick={onAuthenticate}
            >
              <LogIn className="size-4" />
              Iniciar sesion
            </Button>
          </div>
        )}

        {isAuthenticated && menuOpen && (
          <SettingsMenu
            onOpenAccount={handleOpenAccount}
            onClearHistory={handleClearHistory}
            onLogout={handleLogout}
          />
        )}
      </div>
    </aside>
  );
}
