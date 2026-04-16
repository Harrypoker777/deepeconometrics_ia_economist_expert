'use client';

import { Camera, Mail, UserRound, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AccountDialog({ open, onClose, user }) {
  if (!open || !user) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-[1.75rem] border border-border bg-background p-6 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Cuenta
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Perfil de usuario
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center rounded-[1.5rem] border border-border bg-card/70 px-6 py-8 text-center">
          <div className="flex size-24 items-center justify-center rounded-full border border-dashed border-border bg-secondary text-foreground">
            <UserRound className="size-8" />
          </div>

          <p className="mt-4 text-lg font-semibold text-foreground">
            {user.email}
          </p>

          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            <Mail className="size-3.5" />
            {user.role === 'superusuario' ? 'Superusuario' : 'Usuario'}
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-dashed border-border bg-card/40 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground">
              <Camera className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Foto de perfil
              </p>
              <p className="text-sm text-muted-foreground">
                Placeholder listo para conectar la subida de imagen.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full justify-center"
            disabled
          >
            Subir foto proximamente
          </Button>
        </div>
      </div>
    </div>
  );
}
