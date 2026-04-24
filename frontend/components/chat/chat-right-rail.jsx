'use client';

import { memo, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart3,
  Download,
  LoaderCircle,
  Wrench,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { EconomicTable } from '@/components/chat/economic-table';
import { Button } from '@/components/ui/button';
import {
  extractDownloadLinks,
  getActiveToolInvocations,
} from '@/lib/chat-helpers';
import { PerfBoundary } from '@/components/performance/perf-boundary';

const EconomicChart = dynamic(
  () => import('@/components/chat/economic-chart').then((module) => module.EconomicChart),
  {
    loading: () => (
      <div className="h-[296px] rounded-[1.5rem] border border-border/80 bg-secondary/30" />
    ),
  }
);

function scrollToArtifact(anchorId) {
  if (typeof document === 'undefined') return;

  const target = document.getElementById(anchorId);
  if (!target) return;

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function RailSection({ icon: Icon, title, children }) {
  return (
    <section className="rail-card rounded-[1.35rem] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-secondary/80 text-foreground">
          <Icon className="size-4" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          {title}
        </h2>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function RailStat({ label, value }) {
  return (
    <div className="rounded-[1rem] border border-border/80 bg-background/72 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
        {value}
      </p>
    </div>
  );
}

function ResultLink({ artifact, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(artifact.anchorId)}
      className="flex w-full items-center justify-between gap-3 rounded-[1rem] border border-border/80 bg-background/72 px-3 py-3 text-left transition-colors hover:bg-secondary/72"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/75 bg-secondary/55 text-xs font-semibold text-foreground">
          {artifact.order}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {artifact.chart.title || `Resultado ${artifact.order}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {artifact.chart.series.length} filas | chart y tabla
          </p>
        </div>
      </div>

      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function ResultsDashboard({ artifacts, onClose, open }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/52 px-4 py-6 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="workspace-panel panel-surface flex max-h-[92vh] w-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem]">
        <header className="flex items-start justify-between gap-4 border-b border-border/75 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Dashboard
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              Resultados del chat
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {artifacts.length} resultados ligados a esta sesion del chat.
            </p>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
            Cerrar
          </Button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-2">
            {artifacts.map((artifact) => (
              <section
                key={artifact.anchorId}
                className="rounded-[1.45rem] border border-border/75 bg-background/56 p-4"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Resultado {artifact.order}
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {artifact.chart.title || 'Proyeccion econometrica'}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      scrollToArtifact(artifact.anchorId);
                      onClose();
                    }}
                  >
                    Ir al chat
                    <ArrowUpRight className="size-4" />
                  </Button>
                </div>

                <EconomicChart chart={artifact.chart} />

                <div className="mt-3">
                  <EconomicTable chart={artifact.chart} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatRightRailImpl({ messages, artifacts = [] }) {
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const activeTools = useMemo(
    () => getActiveToolInvocations(messages),
    [messages]
  );
  const downloads = useMemo(
    () => extractDownloadLinks(messages).slice(-3).reverse(),
    [messages]
  );

  if (activeTools.length === 0 && downloads.length === 0 && artifacts.length === 0) {
    return null;
  }

  return (
    <PerfBoundary id="chat-right-rail">
      <aside className="hidden w-[20rem] shrink-0 flex-col gap-3 border-l border-border/70 bg-background/28 p-3 xl:flex">
        {activeTools.length > 0 && (
          <RailSection icon={Wrench} title="Actividad">
            <div className="space-y-2">
              {activeTools.slice(0, 4).map((toolName) => (
                <div
                  key={toolName}
                  className="flex items-center gap-2 rounded-[1rem] border border-border/80 bg-background/72 px-3 py-2 text-sm text-foreground"
                >
                  <LoaderCircle className="size-4 animate-spin text-accent-strong" />
                  <span>{toolName}</span>
                </div>
              ))}
            </div>
          </RailSection>
        )}

        {artifacts.length > 0 && (
          <RailSection icon={BarChart3} title="Resultados">
            <div className="grid grid-cols-2 gap-2">
              <RailStat label="Charts" value={artifacts.length} />
              <RailStat label="Tablas" value={artifacts.length} />
            </div>

            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Estos resultados viven pegados a la sesion actual. Si borras el chat, desaparecen con el.
            </p>

            <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {artifacts.map((artifact) => (
                <ResultLink
                  key={artifact.anchorId}
                  artifact={artifact}
                  onOpen={scrollToArtifact}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full justify-center"
              onClick={() => setDashboardOpen(true)}
            >
              <BarChart3 className="size-4" />
              Vista expandida
            </Button>
          </RailSection>
        )}

        {downloads.length > 0 && (
          <RailSection icon={Download} title="Descargas">
            <div className="space-y-2">
              {downloads.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-[1rem] border border-border/80 bg-background/72 px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/70"
                >
                  <span className="truncate">{item.label}</span>
                  <Download className="size-4 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </div>
          </RailSection>
        )}
      </aside>

      <ResultsDashboard
        artifacts={artifacts}
        onClose={() => setDashboardOpen(false)}
        open={dashboardOpen}
      />
    </PerfBoundary>
  );
}

export const ChatRightRail = memo(
  ChatRightRailImpl,
  (prevProps, nextProps) => (
    prevProps.artifacts === nextProps.artifacts &&
    prevProps.messages === nextProps.messages
  )
);
