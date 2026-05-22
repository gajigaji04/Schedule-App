'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard',  icon: 'fas fa-home',        label: '홈' },
  { href: '/calendar',   icon: 'fas fa-calendar-alt', label: '캘린더' },
  { href: '/tasks',      icon: 'fas fa-tasks',        label: '할일' },
  { href: '/teams',      icon: 'fas fa-users',        label: '팀' },
  { href: '/settings',   icon: 'fas fa-cog',          label: '설정' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      <div className="nav-items">
        {ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`bnav-item${pathname.startsWith(item.href) ? ' active' : ''}`}
          >
            <i className={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
