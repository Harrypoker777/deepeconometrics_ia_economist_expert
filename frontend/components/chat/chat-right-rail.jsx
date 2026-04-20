'use client';

import {
  BarChart3,
  BookOpenText,
  Download,
  LoaderCircle,
  LogIn,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { SidebarIndicators } from '@/components/chat/sidebar-indicators';
import { Button } from '@/components/ui/button';
import {
  extractDownloadLinks,
  findChartsInMessage,
  getActiveToolInvocations,
} from '@/lib/chat-helpers';

function RailSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rail-card rounded-[1.5rem] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-foreground">
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-[1.1rem] border border-border/80 bg-background/70 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">
        {value}
      </p>
    </div>
  );
}

export function ChatRightRail({
  busy,
  currentSessionTitle,
  isAuthenticated,
  messages,
  onInsertPrompt,
  onOpenAuth,
}) {
  const activeTools = getActiveToolInvocations(messages);
  const downloads = extractDownloadLinks(messages).slice(-3).reverse();
  const chartCount = messages.reduce(
    (total, message) => total + findChartsInMessage(message).length,
    0
  );
  const knowledgeSearches = messages.reduce((total, message) => (
    total + (message.parts || []).filter(
      (part) => part.type === 'tool-search_knowledge_base' && part.state === 'output-available'
    ).length
  ), 0);

  return (
    <aside className="hidden w-[20rem] shrink-0 flex-col gap-3 border-l border-border/70 bg-background/35 p-3 xl:flex">
      <RailSection
        icon={Sparkles}
        title="Workspace"
        description={currentSessionTitle || 'Nuevo chat listo para consultas economicas.'}
      >
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <MetricTile label="Estado" value={busy ? 'Thinking' : 'Ready'} />
          <MetricTile label="Charts" value={String(chartCount)} />
          <MetricTile label="RAG" value={String(knowledgeSearches)} />
        </div>
      </RailSection>

      <SidebarIndicators onInsertPrompt={onInsertPrompt} />

      <RailSection
        icon={Wrench}
        title="Actividad"
        description="Herramientas en curso, pasos activos y estado del motor."
      >
        {activeTools.length > 0 ? (
          <div className="space-y-2">
            {activeTools.slice(0, 4).map((toolName) => (
              <div
                key={toolName}
                className="flex items-center gap-2 rounded-[1rem] border border-border/80 bg-background/70 px-3 py-2 text-sm text-foreground"
              >
                <LoaderCircle className="size-4 animate-spin text-accent-strong" />
                <span>{toolName}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-border/80 bg-background/60 px-3 py-4 text-sm text-muted-foreground">
            No hay herramientas ejecutandose ahora. El rail mostrara actividad cuando el agente consulte RAG, indicadores o forecasts.
          </div>
        )}
      </RailSection>

      <RailSection
        icon={downloads.length > 0 ? Download : BookOpenText}
        title={downloads.length > 0 ? 'Descargas' : 'Resultados'}
        description={downloads.length > 0
          ? 'Archivos generados durante esta conversacion.'
          : 'Los graficos, fuentes y archivos apareceran aqui.'}
      >
        {downloads.length > 0 ? (
          <div className="space-y-2">
            {downloads.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-[1rem] border border-border/80 bg-background/70 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/70"
              >
                <span className="truncate">{item.label}</span>
                <Download className="size-4 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <div className="rounded-[1.1rem] border border-dashed border-border/80 bg-background/60 px-3 py-4 text-sm text-muted-foreground">
            Todavia no hay archivos ni tablas exportadas en esta sesion.
          </div>
        )}
      </RailSection>

      {!isAuthenticated && (
        <RailSection
          icon={LogIn}
          title="Memoria persistente"
          description="Guarda conversaciones y reutiliza contexto por cuenta."
        >
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={onOpenAuth}
          >
            <LogIn className="size-4" />
            Iniciar sesion
          </Button>
        </RailSection>
      )}
    </aside>
  );
}
