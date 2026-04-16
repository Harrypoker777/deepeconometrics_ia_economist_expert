'use client';

import { useEffect, useState } from 'react';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        aria-label="Cambiar tema"
        className="rounded-full"
        disabled
        type="button"
        variant="outline"
      >
        <Moon className="size-4" />
        <span>Oscuro</span>
      </Button>
    );
  }

  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      aria-label="Cambiar tema"
      className="rounded-full"
      onClick={() => setTheme(nextTheme)}
      type="button"
      variant="outline"
    >
      {resolvedTheme === 'dark' ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
      <span>{resolvedTheme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </Button>
  );
}
