import AuthGuard from '@/components/layout/AuthGuard';
import AppShell from '@/components/layout/AppShell';

export default function AppLayout({ children }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
