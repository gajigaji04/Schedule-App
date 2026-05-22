'use client';
import { useState, useCallback } from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import BottomNav from './BottomNav';
import FloatingChatPanel from '@/components/ui/FloatingChatPanel';
import FloatingAIPanel from '@/components/ui/FloatingAIPanel';

export default function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);   // desktop: sidebar collapsed
  const [mobileOpen, setMobileOpen] = useState(false); // mobile: drawer open

  const handleToggle = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 480) {
      setMobileOpen(p => !p);
    } else {
      setCollapsed(p => !p);
    }
  }, []);

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}`}>
      <AppHeader onToggleSidebar={handleToggle} />
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
      <FloatingAIPanel />
      <FloatingChatPanel />
    </div>
  );
}
