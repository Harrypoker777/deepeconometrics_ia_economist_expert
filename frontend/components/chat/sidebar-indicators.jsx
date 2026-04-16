import { ArrowUpRight, ChevronRight, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { INDICATOR_PROMPTS } from '@/lib/chat-helpers';

export function SidebarIndicators({ onInsertPrompt }) {
  return (
    <Card className="h-fit border-border/70 bg-card/75 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-accent/15 p-3 text-accent">
            <Sigma className="size-5" />
          </div>
          <div>
            <CardTitle className="text-2xl">Indicadores</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Haz clic para insertar prompts ya armados en el chat.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {INDICATOR_PROMPTS.map((item) => (
          <button
            className="group flex w-full flex-col rounded-[24px] border border-border/70 bg-background/60 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5"
            key={item.label}
            onClick={() => onInsertPrompt(item.prompt)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-lg">{item.label}</span>
              <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
          </button>
        ))}

        <div className="rounded-[24px] border border-dashed border-border/80 bg-background/40 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            El backend puede consultar PostgreSQL, proyectar con OLS y devolverte archivos Excel o PDF.
          </p>
          <Button className="mt-4 w-full" onClick={() => onInsertPrompt('Consulta los indicadores disponibles y resume cuales son utiles para un dashboard macroeconomico inicial.')} variant="secondary">
            <ArrowUpRight className="size-4" />
            Explorar indicadores
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}