'use client';

import { useState } from 'react';
import {
  LogOut,
  MessageSquare,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Settings,
  Trash2,
  UserRound,
} from 'lucide-react';

function SettingsMenu({ collapsed, onClearHistory, onLogout, onOpenAccount }) {
  return (
    <div
      className={`absolute bottom-12 z-20 rounded-xl border border-border bg-background p-1.5 ${
        collapsed ? 'left-12 w-56' : 'left-3 right-3'
      }`}
    >
      <button
        type="button"
        onClick={onOpenAccount}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
      >
        <UserRound className="size-4" />
        Cuenta
      </button>

      <button
        type="button"
        onClick={onClearHistory}
        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
      >
        <Trash2 className="size-4" />
        Borrar historial
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
      >
        <LogOut className="size-4" />
        Cerrar sesion
      </button>
    </div>
  );
}

function SessionRow({ active, onDelete, onSelect, title }) {
  return (
    <div
      className={`group mb-1 flex items-center gap-1 rounded-xl ${
        active ? 'bg-secondary' : 'hover:bg-secondary'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
        }`}
      >
        <MessageSquare className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="mr-2 hidden size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-red-600 group-hover:flex"
        title="Eliminar conversacion"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function ChatSidebar({
  collapsed,
  currentSessionId,
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
      <div className="relative flex w-14 shrink-0 flex-col items-center border-r bg-sidebar py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Abrir panel"
        >
          <PanelLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className="mt-3 flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Nuevo chat"
        >
          <Plus className="size-4" />
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Ajustes"
        >
          <Settings className="size-4" />
        </button>

        {menuOpen && (
          <SettingsMenu
            collapsed
            onOpenAccount={handleOpenAccount}
            onClearHistory={handleClearHistory}
            onLogout={handleLogout}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative flex w-72 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center justify-between border-b px-3 py-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="size-4" />
          Nuevo chat
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex size-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          title="Cerrar panel"
        >
          <PanelLeftClose className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {sessions.length === 0 && (
          <p className="px-3 pt-4 text-center text-sm text-muted-foreground">
            Sin conversaciones guardadas todavia
          </p>
        )}

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

      <div className="relative border-t px-3 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-foreground">
            <UserRound className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {userEmail}
            </p>
            <p className="text-xs text-muted-foreground">
              Perfil activo
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Ajustes"
          >
            <Settings className="size-4" />
          </button>
        </div>

        {menuOpen && (
          <SettingsMenu
            onOpenAccount={handleOpenAccount}
            onClearHistory={handleClearHistory}
            onLogout={handleLogout}
          />
        )}
      </div>
    </div>
  );
}
