'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { ArrowDown } from 'lucide-react';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { AccountDialog } from '@/components/chat/account-dialog';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { EconomicChart } from '@/components/chat/economic-chart';
import { PromptSuggestions } from '@/components/chat/prompt-suggestions';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { apiFetch, createChatTransport } from '@/lib/api';
import {
  extractDownloadLinks,
  findLatestChartPayload,
} from '@/lib/chat-helpers';

function createSessionId() {
  return crypto.randomUUID();
}

function getUserSessionStorageKey(userId) {
  return `deepeconometrics.user-session:${userId}`;
}

function BrandMark({ label = 'DE' }) {
  return (
    <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-border bg-card/80 text-sm font-semibold tracking-[0.18em] text-foreground">
      {label}
    </div>
  );
}

export default function HomePage() {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const requestBodyRef = useRef({
    sessionId: '',
    persist: false,
  });
  const transportRef = useRef(
    createChatTransport(() => requestBodyRef.current)
  );

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
  const chartPayload = findLatestChartPayload(messages);
  const downloadLinks = extractDownloadLinks(messages);
  const isAuthenticated = Boolean(authUser);
  const isEmpty = messages.length === 0;

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

  function renderDownloads() {
    if (downloadLinks.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {downloadLinks.map((item) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
          >
            <ArrowDown className="size-3.5" />
            {item.label}
          </a>
        ))}
      </div>
    );
  }

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando DeepEconometrics...
      </div>
    );
  }

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

      {isAuthenticated ? (
        <div className="flex h-screen bg-background">
          <ChatSidebar
            collapsed={sidebarCollapsed}
            currentSessionId={sessionId}
            onClearHistory={handleClearHistory}
            onDeleteSession={handleDeleteSession}
            onLogout={handleLogout}
            onNewChat={handleNewChat}
            onOpenAccount={() => setShowAccountDialog(true)}
            onSelectSession={handleSelectSession}
            onToggle={() => setSidebarCollapsed((current) => !current)}
            sessions={sessions}
            userEmail={authUser.email}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div>
                <h1 className="text-base font-semibold text-foreground">
                  DeepEconometrics
                </h1>
                <p className="text-xs text-muted-foreground">
                  IA de finanzas y economia con historial por sesion.
                </p>
              </div>

              <ModeToggle />
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-4 py-6">
                {isEmpty ? (
                  <div className="flex flex-col items-center justify-center pt-[16vh] text-center">
                    <BrandMark />
                    <h2 className="mt-5 text-2xl font-semibold text-foreground">
                      DeepEconometrics listo para una nueva conversacion
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">
                      Tu historial queda guardado en esta cuenta y se organiza por sesiones.
                    </p>
                    <PromptSuggestions
                      onSelect={(prompt) => {
                        void handleSuggestion(prompt);
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <ChatWindow error={error} messages={messages} status={status} />

                    {chartPayload && (
                      <div className="mt-6">
                        <EconomicChart chart={chartPayload} />
                      </div>
                    )}

                    {renderDownloads()}
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t bg-background px-4 pb-4 pt-3">
              <div className="mx-auto max-w-3xl">
                <ChatComposer
                  busy={busy}
                  disabled={!sessionId}
                  draft={draft}
                  helperText="Los chats de esta cuenta se guardan por sesion."
                  onChange={setDraft}
                  onKeyDown={handleKeyDown}
                  onStop={stop}
                  onSubmit={handleSubmit}
                  placeholder="Escribe tu consulta economica..."
                  textareaRef={textareaRef}
                  variant="docked"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_38%),linear-gradient(180deg,_hsl(var(--background)),_rgba(248,250,252,0.88))]">
          <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6">
            <header className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl border border-dashed border-border bg-card/80 text-xs font-semibold tracking-[0.18em] text-foreground">
                  LOGO
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    DeepEconometrics
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Modo anonimo sin historial persistente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAuthDialog(true)}
                >
                  Iniciar sesion
                </Button>
                <ModeToggle />
              </div>
            </header>

            {isEmpty ? (
              <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
                <BrandMark label="LOGO" />
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                  Comienza a hablar con DeepEconometrics
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Haz preguntas sobre inflacion, PIB, pronosticos y reportes. Si no has iniciado sesion, todo desaparece al recargar la pagina.
                </p>

                <div className="mt-10 w-full max-w-4xl">
                  <ChatComposer
                    busy={busy}
                    disabled={!sessionId}
                    draft={draft}
                    helperText="Modo anonimo: el historial no se guarda y se borra al recargar."
                    onChange={setDraft}
                    onKeyDown={handleKeyDown}
                    onStop={stop}
                    onSubmit={handleSubmit}
                    placeholder="Escribe tu pregunta economica..."
                    textareaRef={textareaRef}
                    variant="hero"
                  />
                </div>

                <PromptSuggestions
                  variant="hero"
                  onSelect={(prompt) => {
                    void handleSuggestion(prompt);
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col">
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                  <div className="mx-auto w-full max-w-4xl py-6">
                    <ChatWindow error={error} messages={messages} status={status} />

                    {chartPayload && (
                      <div className="mt-6">
                        <EconomicChart chart={chartPayload} />
                      </div>
                    )}

                    {renderDownloads()}
                  </div>
                </div>

                <div className="mx-auto w-full max-w-4xl pb-8 pt-4">
                  <ChatComposer
                    busy={busy}
                    disabled={!sessionId}
                    draft={draft}
                    helperText="Modo anonimo: el historial no se guarda y se borra al recargar."
                    onChange={setDraft}
                    onKeyDown={handleKeyDown}
                    onStop={stop}
                    onSubmit={handleSubmit}
                    placeholder="Sigue preguntando sobre la economia venezolana..."
                    textareaRef={textareaRef}
                    variant="hero"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
