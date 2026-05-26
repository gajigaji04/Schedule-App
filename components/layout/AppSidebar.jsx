'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',   icon: 'fas fa-home',        label: '대시보드' },
  { href: '/calendar',    icon: 'fas fa-calendar-alt', label: '캘린더' },
  { href: '/tasks',       icon: 'fas fa-tasks',        label: '내 할일' },
  { href: '/teams',       icon: 'fas fa-users',        label: '팀 관리' },
  { href: '/calculator',  icon: 'fas fa-calculator',   label: '계산기' },
  { href: '/memo',        icon: 'fas fa-sticky-note',  label: '메모장' },
  { href: '/timer',       icon: 'fas fa-stopwatch',    label: '타이머' },
];

const NAV_BOTTOM = [
  { href: '/settings', icon: 'fas fa-cog', label: '설정' },
];

export default function AppSidebar({ mobileOpen, onClose }) {
  const pathname = usePathname();

  return (
    <>
      <aside className={`app-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <nav className="sidebar-nav">
          <button className="sidebar-close-btn" onClick={onClose}>
            <i className="fas fa-times" />
            <span>닫기</span>
          </button>
          <div className="nav-top">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${pathname.startsWith(item.href) ? ' active' : ''}`}
                onClick={onClose}
              >
                <i className={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
          <div className="nav-bottom">
            {NAV_BOTTOM.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${pathname.startsWith(item.href) ? ' active' : ''}`}
                onClick={onClose}
              >
                <i className={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </aside>
      {mobileOpen && (
        <div className="sidebar-overlay visible" onClick={onClose} />
      )}
    </>
  );
}
