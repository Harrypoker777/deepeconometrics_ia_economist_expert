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
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full px-3"
        disabled
        aria-label="Cambiar tema"
      >
        <Moon className="size-4" />
        <span className="hidden sm:inline">Tema</span>
      </Button>
    );
  }

  const dark = resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full px-3"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label="Cambiar tema"
    >
      {dark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
      <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
    </Button>
  );
}
