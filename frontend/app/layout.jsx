import { Manrope, Space_Grotesk } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata = {
  title: 'DeepEconometrics — IA de Finanzas y Economía',
  description: 'Asistente de inteligencia artificial especializado en finanzas y economía. Consulta indicadores, genera pronósticos y descarga reportes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}