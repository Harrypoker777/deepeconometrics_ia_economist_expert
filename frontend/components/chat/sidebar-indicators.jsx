import { ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INDICATOR_PROMPTS } from '@/lib/chat-helpers';

export function SidebarIndicators({ onInsertPrompt }) {
  return (
    <section className="rail-card rounded-[1.5rem] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-secondary/80 text-foreground">
          <Sparkles className="size-4" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Quick prompts
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Atajos para lanzar consultas con RAG, indicadores y forecasts.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {INDICATOR_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onInsertPrompt(item.prompt)}
            className="group flex w-full items-center justify-between gap-3 rounded-[1rem] border border-border/80 bg-background/70 px-3 py-3 text-left transition-colors hover:bg-secondary/70"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            </div>

            <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-[1rem] border border-dashed border-border/80 bg-background/60 p-3">
        <p className="text-xs leading-5 text-muted-foreground">
          El backend puede leer PostgreSQL, consultar la base de conocimiento y generar Excel o PDF.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full justify-center"
          onClick={() => onInsertPrompt('Consulta los indicadores disponibles y resume cuales son utiles para un dashboard macroeconomico inicial.')}
        >
          <ArrowUpRight className="size-4" />
          Explorar indicadores
        </Button>
      </div>
    </section>
  );
}
