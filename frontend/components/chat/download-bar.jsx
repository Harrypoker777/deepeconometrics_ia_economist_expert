import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function iconFor(kind) {
  if (kind === 'excel') {
    return <FileSpreadsheet className="size-4" />;
  }

  if (kind === 'pdf') {
    return <FileText className="size-4" />;
  }

  return <Download className="size-4" />;
}

export function DownloadBar({ downloads }) {
  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Descargas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Detecta URLs de archivos en la respuesta o en la salida de tools y expone acciones de descarga.
        </p>
      </CardHeader>

      <CardContent>
        {downloads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-sm leading-6 text-muted-foreground">
            Cuando el backend genere Excel o PDF, apareceran botones de descarga aqui.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {downloads.map((item) => (
              <a
                className={cn(buttonVariants({ variant: 'outline' }), 'rounded-xl')}
                href={item.url}
                key={item.url}
                rel="noreferrer"
                target="_blank"
              >
                {iconFor(item.kind)}
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
