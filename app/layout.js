import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import ThemeScript from '@/components/ui/ThemeScript';

export const metadata = {
  title: 'TeamScheduler',
  description: '팀 일정 관리 앱',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
      </head>
      <body>
        <ThemeScript />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
