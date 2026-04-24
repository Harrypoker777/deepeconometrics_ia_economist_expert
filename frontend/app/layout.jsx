import { Inter } from 'next/font/google';
import 'katex/dist/katex.min.css';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'DeepEconometrics - IA de Finanzas y Economia',
  description:
    'Asistente de inteligencia artificial especializado en finanzas y economia. Consulta indicadores, genera pronosticos y descarga reportes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-background font-sans text-foreground antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
