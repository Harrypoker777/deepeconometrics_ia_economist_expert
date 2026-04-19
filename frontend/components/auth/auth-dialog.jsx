'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
};

export function AuthDialog({ onAuthenticated, onClose, open }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setError('');
      setSubmitting(false);
      setMode('login');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload = {
        email: form.email,
        password: form.password,
        ...(mode === 'register' ? { confirmPassword: form.confirmPassword } : {}),
      };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'No fue posible completar la autenticacion.');
        return;
      }

      await onAuthenticated(data.user);
      onClose();
    } catch {
      setError('No fue posible completar la autenticacion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Acceso
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">
              {mode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
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

        <div className="mt-4 grid grid-cols-2 rounded-xl bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              mode === 'login'
                ? 'bg-background text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`rounded-lg px-3 py-2 text-sm transition-colors ${
              mode === 'register'
                ? 'bg-background text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            Registrarme
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-secondary/50 px-4 py-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-full bg-secondary text-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Superusuario sembrado por defecto
              </p>
              <p className="mt-1 text-xs sm:text-sm">
                Correo: <span className="font-medium text-foreground">alinavarro2023@gmail.com</span>
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              Correo
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"
              placeholder="tu@correo.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-foreground">
              Contrasena
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"
              placeholder="Ingresa tu contrasena"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>

          {mode === 'register' && (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-foreground">
                Confirmar contrasena
              </span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-foreground/20"
                placeholder="Repite la contrasena"
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-950 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full justify-center"
            disabled={submitting}
          >
            {submitting
              ? 'Procesando...'
              : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta'}
          </Button>
        </form>
      </div>
    </div>
  );
}
