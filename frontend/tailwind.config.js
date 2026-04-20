/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        'accent-soft': 'hsl(var(--accent-soft))',
        'accent-strong': 'hsl(var(--accent-strong))',
        sidebar: 'hsl(var(--sidebar))',
        surface: 'hsl(var(--surface))',
        'surface-strong': 'hsl(var(--surface-strong))',
        elevated: 'hsl(var(--elevated))',
        panel: 'hsl(var(--panel))',
        'panel-foreground': 'hsl(var(--panel-foreground))',
        hero: 'hsl(var(--hero))',
        'hero-foreground': 'hsl(var(--hero-foreground))',
        grid: 'hsl(var(--grid))',
        spotlight: 'hsl(var(--spotlight))',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--shadow) / 0.06), 0 10px 30px hsl(var(--shadow) / 0.08)',
        glow: '0 0 0 1px hsl(var(--accent) / 0.18), 0 12px 36px hsl(var(--accent) / 0.16)',
        panel: '0 12px 40px hsl(var(--shadow) / 0.12)',
        floating: '0 20px 60px hsl(var(--shadow) / 0.16)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 0.55, transform: 'scale(0.92)' },
          '50%': { opacity: 1, transform: 'scale(1)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
