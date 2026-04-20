'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { CheckCircle2, CircleAlert, LoaderCircle, LogIn, Plus, Sparkles } from 'lucide-react';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { AccountDialog } from '@/components/chat/account-dialog';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatRightRail } from '@/components/chat/chat-right-rail';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { PromptSuggestions } from '@/components/chat/prompt-suggestions';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { apiFetch, createChatTransport } from '@/lib/api';

const EMPTY_STATE_POINTS = [
  'Chat-first workspace',
  'RAG economico',
  'Forecast y exports',
];

function createSessionId() {
  return crypto.randomUUID();
}

function getUserSessionStorageKey(userId) {
  return `deepeconometrics.user-session:${userId}`;
}

function EmptyWorkspace({ isAuthenticated, onOpenAuth, onSelectPrompt }) {
  return (
    <div className="flex min-h-[48vh] flex-col items-center justify-center py-8 text-center sm:min-h-[54vh]">
      <div className="flex size-14 items-center justify-center rounded-[1.35rem] bg-secondary/80 text-foreground shadow-soft">
        <Sparkles className="size-6" />
      </div>

      <p className="mt-6 text-sm font-medium text-muted-foreground">
        DeepEconometrics workspace
      </p>

      <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
        Pregunta por datos, teoria o pronosticos sin salir del chat.
      </h1>

      <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
        Interfaz minimal, modo oscuro por defecto y flujo unificado para indicadores,
        conocimiento economico, scraping y dashboards.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {EMPTY_STATE_POINTS.map((item) => (
          <span key={item} className="status-pill">
            <span className="dot-pulse" />
            {item}
          </span>
        ))}
      </div>

      {!isAuthenticated && (
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-full px-5"
          onClick={onOpenAuth}
        >
          <LogIn className="size-4" />
          Iniciar sesion
        </Button>
      )}

      <div className="mt-10 w-full max-w-4xl">
        <PromptSuggestions
          variant="compact"
          onSelect={(prompt) => {
            void onSelectPrompt(prompt);
          }}
        />
      </div>
    </div>
  );
}

function WorkspaceTopbar({
  busy,
  currentTitle,
  error,
  isAuthenticated,
  isEmpty,
  onNewChat,
  onOpenAuth,
}) {
  const stateLabel = busy ? 'Thinking' : error ? 'Error' : 'Ready';
  const subtitle = isEmpty
    ? isAuthenticated
      ? 'Nuevo chat listo para guardar contexto, activar tools y seguir sesiones.'
      : 'Sesion temporal lista para consultar RAG, indicadores o forecasts.'
    : busy
      ? 'El agente esta consultando herramientas, datos y base de conocimiento.'
      : 'Workspace listo para continuar la conversacion o abrir un nuevo analisis.';

  return (
    <header className="topbar-surface border-b border-border/75 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow">
              OpenAI-inspired workspace
            </span>

            {error && (
              <span className="status-pill text-red-400">
                <CircleAlert className="size-3.5" />
                Needs attention
              </span>
            )}
          </div>

          <p className="mt-3 text-sm font-medium text-muted-foreground">
            DeepEconometrics
          </p>

          <h2 className="mt-1 truncate text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
            {currentTitle}
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="status-pill">
            {error ? (
              <CircleAlert className="size-3.5 text-red-400" />
            ) : busy ? (
              <LoaderCircle className="size-3.5 animate-spin text-accent-strong" />
            ) : (
              <CheckCircle2 className="size-3.5 text-accent-strong" />
            )}
            {stateLabel}
          </span>

          <Button type="button" variant="ghost" onClick={onNewChat}>
            <Plus className="size-4" />
            Nuevo chat
          </Button>

          {!isAuthenticated && (
            <Button type="button" variant="outline" onClick={onOpenAuth}>
              <LogIn className="size-4" />
              Iniciar sesion
            </Button>
          )}

          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

export default function HomePage() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const requestBodyRef = useRef({
    sessionId: '',
    persist: false,
  });
  const transportRef = useRef(createChatTransport(() => requestBodyRef.current));

  requestBodyRef.current = {
    sessionId,
    persist: Boolean(authUser),
  };

  const fetchSessionsList = useCallback(async () => {
    if (!authUser) {
      return [];
    }

    try {
      const response = await apiFetch('/api/sessions');

      if (response.status === 401) {
        setAuthUser(null);
        return [];
      }

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const nextSessions = data.sessions || [];
      setSessions(nextSessions);
      return nextSessions;
    } catch {
      return [];
    }
  }, [authUser]);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    error,
  } = useChat({
    transport: transportRef.current,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: async () => {
      if (authUser) {
        await fetchSessionsList();
      }
    },
  });

  const busy = status === 'submitted' || status === 'streaming';
  const isAuthenticated = Boolean(authUser);
  const isEmpty = messages.length === 0;
  const currentSession = sessions.find((session) => session.sessionId === sessionId) || null;

  const startAnonymousWorkspace = useCallback(() => {
    setSessions([]);
    setSessionId(createSessionId());
    setMessages([]);
    setDraft('');
  }, [setMessages]);

  const createFreshAuthenticatedSession = useCallback(() => {
    const nextSessionId = createSessionId();

    if (authUser) {
      window.localStorage.setItem(
        getUserSessionStorageKey(authUser.id),
        nextSessionId
      );
    }

    setSessionId(nextSessionId);
    setMessages([]);
    setDraft('');
    return nextSessionId;
  }, [authUser, setMessages]);

  const loadSession = useCallback(async (nextSessionId) => {
    if (!authUser || !nextSessionId) {
      return;
    }

    stop();
    setSessionId(nextSessionId);

    try {
      const response = await apiFetch(`/api/sessions/${nextSessionId}`);

      if (response.status === 401) {
        setAuthUser(null);
        return;
      }

      if (!response.ok) {
        setMessages([]);
        return;
      }

      const data = await response.json();
      window.localStorage.setItem(
        getUserSessionStorageKey(authUser.id),
        nextSessionId
      );
      setMessages(data.messages || []);
      setDraft('');
    } catch {
      setMessages([]);
    }
  }, [authUser, setMessages, stop]);

  const restoreAuthenticatedWorkspace = useCallback(async () => {
    if (!authUser) {
      return;
    }

    const nextSessions = await fetchSessionsList();
    const storageKey = getUserSessionStorageKey(authUser.id);
    const storedSessionId = window.localStorage.getItem(storageKey);
    const preferredSessionId =
      storedSessionId &&
      nextSessions.some((session) => session.sessionId === storedSessionId)
        ? storedSessionId
        : nextSessions[0]?.sessionId;

    if (preferredSessionId) {
      await loadSession(preferredSessionId);
      return;
    }

    createFreshAuthenticatedSession();
  }, [
    authUser,
    createFreshAuthenticatedSession,
    fetchSessionsList,
    loadSession,
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  useEffect(() => {
    let isActive = true;

    async function loadCurrentUser() {
      try {
        const response = await apiFetch('/api/auth/me');

        if (!isActive) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setAuthUser(data.user || null);
        } else {
          setAuthUser(null);
        }
      } catch {
        if (isActive) {
          setAuthUser(null);
        }
      } finally {
        if (isActive) {
          setAuthReady(true);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    setSidebarCollapsed(!mediaQuery.matches);
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    stop();
    setShowAccountDialog(false);

    if (authUser) {
      void restoreAuthenticatedWorkspace();
      return;
    }

    startAnonymousWorkspace();
  }, [
    authReady,
    authUser,
    restoreAuthenticatedWorkspace,
    startAnonymousWorkspace,
    stop,
  ]);

  const sendText = useCallback(async (text) => {
    const nextMessage = text.trim();

    if (!nextMessage || busy || !sessionId) {
      return;
    }

    await sendMessage({ text: nextMessage });

    if (authUser) {
      void fetchSessionsList();
    }
  }, [authUser, busy, fetchSessionsList, sendMessage, sessionId]);

  async function handleSubmit(event) {
    event.preventDefault();

    const nextMessage = draft.trim();

    if (!nextMessage) {
      return;
    }

    await sendText(nextMessage);
    setDraft('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event);
    }
  }

  async function handleSuggestion(prompt) {
    await sendText(prompt);
  }

  const handleNewChat = useCallback(() => {
    stop();

    if (authUser) {
      createFreshAuthenticatedSession();
      return;
    }

    startAnonymousWorkspace();
  }, [
    authUser,
    createFreshAuthenticatedSession,
    startAnonymousWorkspace,
    stop,
  ]);

  const handleSelectSession = useCallback(async (nextSessionId) => {
    if (nextSessionId === sessionId) {
      return;
    }

    await loadSession(nextSessionId);
  }, [loadSession, sessionId]);

  const handleDeleteSession = useCallback(async (targetSessionId) => {
    if (!authUser) {
      return;
    }

    try {
      const response = await apiFetch(`/api/sessions/${targetSessionId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        setAuthUser(null);
        return;
      }

      if (!response.ok) {
        return;
      }

      const nextSessions = await fetchSessionsList();

      if (targetSessionId === sessionId) {
        const nextSessionId = nextSessions[0]?.sessionId;

        if (nextSessionId) {
          await loadSession(nextSessionId);
        } else {
          createFreshAuthenticatedSession();
        }
      }
    } catch {
      // Ignore delete errors in the sidebar UX.
    }
  }, [
    authUser,
    createFreshAuthenticatedSession,
    fetchSessionsList,
    loadSession,
    sessionId,
  ]);

  const handleClearHistory = useCallback(async () => {
    if (!authUser) {
      return;
    }

    stop();

    try {
      const response = await apiFetch('/api/sessions', {
        method: 'DELETE',
      });

      if (response.status === 401) {
        setAuthUser(null);
        return;
      }
    } catch {
      // Ignore delete errors and still reset the local workspace.
    }

    setSessions([]);
    createFreshAuthenticatedSession();
  }, [authUser, createFreshAuthenticatedSession, stop]);

  const handleLogout = useCallback(async () => {
    stop();

    try {
      await apiFetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore logout errors and still clear the local auth state.
    }

    setAuthUser(null);
    setSessions([]);
    setShowAccountDialog(false);
    setShowAuthDialog(false);
  }, [stop]);

  const handleAuthenticated = useCallback(async (user) => {
    stop();
    setAuthUser(user || null);
    setSessions([]);
    setMessages([]);
    setDraft('');
  }, [setMessages, stop]);

  if (!authReady) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center p-6">
        <div className="panel-surface rounded-[1.75rem] px-8 py-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary/80 text-foreground">
            <Sparkles className="size-5 animate-float" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Cargando DeepEconometrics...
          </p>
        </div>
      </div>
    );
  }

  const currentTitle = isEmpty
    ? 'Nuevo chat'
    : currentSession?.title || (isAuthenticated ? 'Conversacion activa' : 'Sesion temporal');

  return (
    <>
      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onAuthenticated={handleAuthenticated}
      />

      <AccountDialog
        open={showAccountDialog}
        onClose={() => setShowAccountDialog(false)}
        user={authUser}
      />

      <div className="app-shell">
        <div className="mx-auto flex min-h-screen w-full max-w-[1760px] gap-3 p-3 sm:p-4">
          <ChatSidebar
            collapsed={sidebarCollapsed}
            currentSessionId={sessionId}
            isAuthenticated={isAuthenticated}
            onAuthenticate={() => setShowAuthDialog(true)}
            onClearHistory={handleClearHistory}
            onDeleteSession={handleDeleteSession}
            onLogout={handleLogout}
            onNewChat={handleNewChat}
            onOpenAccount={() => setShowAccountDialog(true)}
            onSelectSession={handleSelectSession}
            onToggle={() => setSidebarCollapsed((current) => !current)}
            sessions={sessions}
            userEmail={authUser?.email || ''}
          />

          <main className="workspace-panel panel-surface flex min-w-0 flex-1 overflow-hidden rounded-[1.9rem]">
            <div className="flex min-w-0 flex-1 flex-col">
              <WorkspaceTopbar
                busy={busy}
                currentTitle={currentTitle}
                error={error}
                isAuthenticated={isAuthenticated}
                isEmpty={isEmpty}
                onNewChat={handleNewChat}
                onOpenAuth={() => setShowAuthDialog(true)}
              />

              <div className="flex min-h-0 flex-1">
                <section className="flex min-w-0 flex-1 flex-col">
                  <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-[54rem] flex-col px-4 pb-36 pt-8 sm:px-6 lg:px-8">
                      {isEmpty ? (
                        <EmptyWorkspace
                          isAuthenticated={isAuthenticated}
                          onOpenAuth={() => setShowAuthDialog(true)}
                          onSelectPrompt={handleSuggestion}
                        />
                      ) : (
                        <ChatWindow error={error} messages={messages} status={status} />
                      )}
                    </div>
                  </div>

                  <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background via-background/96 to-background/0 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
                    <div className="mx-auto w-full max-w-[54rem]">
                      <ChatComposer
                        busy={busy}
                        disabled={!sessionId}
                        draft={draft}
                        helperText={isAuthenticated
                          ? 'Esta conversacion queda asociada a tu cuenta y puede retomarse despues.'
                          : 'Modo temporal: puedes usar el agente sin login, pero el historial se limpia al recargar.'}
                        onChange={setDraft}
                        onKeyDown={handleKeyDown}
                        onStop={stop}
                        onSubmit={handleSubmit}
                        placeholder="Escribe una pregunta sobre inflacion, PIB, teoria economica, scraping o un forecast..."
                        textareaRef={textareaRef}
                        variant={isEmpty ? 'hero' : 'docked'}
                      />
                    </div>
                  </div>
                </section>

                <ChatRightRail
                  busy={busy}
                  currentSessionTitle={currentSession?.title || ''}
                  isAuthenticated={isAuthenticated}
                  messages={messages}
                  onInsertPrompt={(prompt) => {
                    void handleSuggestion(prompt);
                  }}
                  onOpenAuth={() => setShowAuthDialog(true)}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
