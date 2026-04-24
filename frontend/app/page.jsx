'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { CircleAlert, LoaderCircle, LogIn, Plus } from 'lucide-react';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { DeepEconometricsLogo } from '@/components/brand/deepeconometrics-logo';
import { AccountDialog } from '@/components/chat/account-dialog';
import { ChatComposer } from '@/components/chat/chat-composer';
import { ChatRightRail } from '@/components/chat/chat-right-rail';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ChatWindow } from '@/components/chat/chat-window';
import { PromptSuggestions } from '@/components/chat/prompt-suggestions';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { apiFetch, createChatTransport } from '@/lib/api';
import { extractConversationArtifacts, normalizeUiMessages } from '@/lib/chat-helpers';

function createSessionId() {
  return crypto.randomUUID();
}

function getUserSessionStorageKey(userId) {
  return `deepeconometrics.user-session:${userId}`;
}

function EmptyWorkspace() {
  return (
    <div className="flex min-h-[36vh] flex-col items-center justify-end pb-8 pt-8 text-center sm:min-h-[44vh] sm:pb-12">
      <div className="flex items-center justify-center rounded-[1.7rem] border border-border/70 bg-background/68 px-5 py-3">
        <DeepEconometricsLogo className="h-12 w-auto sm:h-14" />
      </div>

      <h1 className="mt-7 max-w-3xl text-4xl font-semibold tracking-[-0.065em] text-foreground sm:text-5xl">
        ¿Que quieres analizar hoy?
      </h1>

      <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-[15px]">
        Datos, teoria economica, scraping y pronosticos en una interfaz limpia y centrada.
      </p>
    </div>
  );
}

function AnonymousTopbar({ hasConversation, onNewChat, onOpenAuth }) {
  return (
    <header className="px-1 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <DeepEconometricsLogo className="h-10 w-auto sm:h-11" />

        <div className="flex items-center gap-2">
          {hasConversation && (
            <Button type="button" variant="ghost" onClick={onNewChat}>
              <Plus className="size-4" />
              Nuevo chat
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onOpenAuth}>
            <LogIn className="size-4" />
            Iniciar sesion
          </Button>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}

function WorkspaceTopbar({ busy, currentTitle, error, onNewChat }) {
  return (
    <header className="topbar-surface border-b border-border/75 px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            DeepEconometrics
          </p>

          <div className="mt-1 flex items-center gap-2">
            <h2 className="truncate text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              {currentTitle}
            </h2>

            {busy && (
              <LoaderCircle className="size-4 shrink-0 animate-spin text-accent-strong" />
            )}

            {error && (
              <CircleAlert className="size-4 shrink-0 text-red-400" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={onNewChat}>
            <Plus className="size-4" />
            Nuevo chat
          </Button>
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
  const scrollFrameRef = useRef(0);
  const textareaRef = useRef(null);
  const stickToBottomRef = useRef(true);
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
  const displayMessages = useMemo(
    () => normalizeUiMessages(messages),
    [messages]
  );
  const isEmpty = displayMessages.length === 0;
  const currentSession = useMemo(
    () => sessions.find((session) => session.sessionId === sessionId) || null,
    [sessionId, sessions]
  );
  const sessionArtifacts = useMemo(
    () => extractConversationArtifacts(displayMessages),
    [displayMessages]
  );

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
      setMessages(normalizeUiMessages(data.messages || []));
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
    if (!stickToBottomRef.current || !scrollRef.current) {
      return undefined;
    }

    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current);
    }

    scrollFrameRef.current = requestAnimationFrame(() => {
      const node = scrollRef.current;
      if (!node) return;

      node.scrollTop = node.scrollHeight;
      scrollFrameRef.current = 0;
    });

    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = 0;
      }
    };
  }, [messages, status]);

  useEffect(() => {
    stickToBottomRef.current = true;
  }, [sessionId]);

  useEffect(() => (
    () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current);
      }
    }
  ), []);

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
  }, [busy, sendMessage, sessionId]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    const nextMessage = draft.trim();

    if (!nextMessage) {
      return;
    }

    await sendText(nextMessage);
    setDraft('');
  }, [draft, sendText]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit(event);
    }
  }, [handleSubmit]);

  const handleSuggestion = useCallback(async (prompt) => {
    await sendText(prompt);
  }, [sendText]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;

    const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 120;
  }, []);

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
          <div className="mx-auto flex items-center justify-center rounded-2xl border border-border/70 bg-background/78 px-4 py-3">
            <DeepEconometricsLogo className="h-9 w-auto" />
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
        {isAuthenticated ? (
      <div className="mx-auto flex min-h-screen w-full max-w-[1760px] gap-3 p-3 sm:p-4">
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
              userEmail={authUser?.email || ''}
            />

            <main className="workspace-panel panel-surface flex min-w-0 flex-1 overflow-hidden rounded-[1.9rem]">
              <div className="flex min-w-0 flex-1 flex-col">
                <WorkspaceTopbar
                  busy={busy}
                  currentTitle={currentTitle}
                  error={error}
                  onNewChat={handleNewChat}
                />

                <div className="flex min-h-0 flex-1">
                  <section className="flex min-w-0 flex-1 flex-col">
                    <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
                      <div className="mx-auto flex w-full max-w-[48rem] flex-col px-4 pb-36 pt-8 sm:px-6 lg:px-8">
                        {isEmpty ? (
                          <EmptyWorkspace />
                        ) : (
                          <ChatWindow
                            artifacts={sessionArtifacts}
                            error={error}
                            messages={displayMessages}
                            status={status}
                          />
                        )}
                      </div>
                    </div>

                    <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background via-background/96 to-background/0 px-4 pb-4 pt-6 sm:px-6 lg:px-8">
                      <div className="mx-auto w-full max-w-[48rem]">
                        {isEmpty && (
                          <div className="mb-3">
                            <PromptSuggestions
                              variant="minimal"
                              onSelect={(prompt) => {
                                void handleSuggestion(prompt);
                              }}
                            />
                          </div>
                        )}

                        <ChatComposer
                          busy={busy}
                          disabled={!sessionId}
                          draft={draft}
                          helperText="Esta conversacion queda asociada a tu cuenta y puede retomarse despues."
                          onChange={setDraft}
                          onKeyDown={handleKeyDown}
                          onStop={stop}
                          onSubmit={handleSubmit}
                          placeholder="Escribe una pregunta sobre inflacion, PIB, teoria economica o un forecast..."
                          textareaRef={textareaRef}
                          variant={isEmpty ? 'minimal' : 'docked'}
                        />
                      </div>
                    </div>
                  </section>

                  <ChatRightRail artifacts={sessionArtifacts} messages={displayMessages} />
                </div>
              </div>
            </main>
          </div>
        ) : (
          <div className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-4 pb-4 pt-3 sm:px-6 sm:pt-4">
            <AnonymousTopbar
              hasConversation={!isEmpty}
              onNewChat={handleNewChat}
              onOpenAuth={() => setShowAuthDialog(true)}
            />

            <main className="flex min-h-0 flex-1 flex-col">
              <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto flex min-h-full w-full max-w-[46rem] flex-col pb-40 pt-4 sm:pt-8">
                  {isEmpty ? (
                    <EmptyWorkspace />
                  ) : (
                    <div className="px-1 pb-8 pt-4 sm:pt-8">
                      <ChatWindow
                        artifacts={sessionArtifacts}
                        error={error}
                        messages={displayMessages}
                        status={status}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 z-10 bg-gradient-to-t from-background via-background/96 to-background/0 pb-4 pt-4">
                <div className="mx-auto w-full max-w-[46rem]">
                  {isEmpty && (
                    <div className="mb-4">
                      <PromptSuggestions
                        variant="minimal"
                        onSelect={(prompt) => {
                          void handleSuggestion(prompt);
                        }}
                      />
                    </div>
                  )}

                  <ChatComposer
                    busy={busy}
                    disabled={!sessionId}
                    draft={draft}
                    helperText={undefined}
                    onChange={setDraft}
                    onKeyDown={handleKeyDown}
                    onStop={stop}
                    onSubmit={handleSubmit}
                    placeholder="Pregunta por datos, teoria economica, scraping o dashboards..."
                    textareaRef={textareaRef}
                    variant={isEmpty ? 'minimal' : 'docked'}
                  />
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </>
  );
}
