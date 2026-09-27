import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  MessageSquare,
  Bell,
  LogOut,
  SplitSquareVertical,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui';
import { cn, formatRelative } from '@/lib/utils';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/useAppFeatures';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/groups',     icon: Users,            label: 'Groups'    },
  { to: '/expenses',   icon: Receipt,          label: 'Expenses'  },
  { to: '/settings',   icon: Settings,         label: 'Settings'  },
  { to: '/feedback',   icon: MessageSquare,    label: 'Feedback'  },
];

function NavItem({ to, icon: Icon, label, onClick }: (typeof NAV_ITEMS)[0] & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </NavLink>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative h-10 w-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm">
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div><p className="font-semibold text-gray-900">Notifications</p><p className="text-xs text-gray-400">{unread ? `${unread} unread` : 'All caught up'}</p></div>
            {unread > 0 && <button onClick={() => markAll.mutate()} className="text-xs font-medium text-brand-600 hover:text-brand-700">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No notifications yet.</div> : notifications.map((n) => (
              <button key={n.id} onClick={() => { if (!n.isRead) markRead.mutate(n.id); }} className={cn('w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition', !n.isRead && 'bg-brand-50/50')}>
                <div className="flex gap-3"><div className="mt-0.5 h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center"><Bell className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-gray-900">{n.title}</p><p className="text-xs text-gray-500 mt-0.5">{n.message}</p><p className="text-[11px] text-gray-400 mt-1">{formatRelative(n.createdAt)}</p></div>{!n.isRead && <span className="h-2 w-2 rounded-full bg-brand-600 mt-2" />}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const user   = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-2 px-3 py-4 mb-2">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <SplitSquareVertical className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg">RoomSplit</span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            {...item}
            onClick={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-200 p-3 space-y-1">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                     text-gray-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-gray-200 bg-white flex-col">
        {sidebar}
      </aside>

      {/* ── Mobile sidebar overlay ───────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-gray-200 flex flex-col',
          'transform transition-transform duration-200 md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
        {sidebar}
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-brand-600 flex items-center justify-center">
              <SplitSquareVertical className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">RoomSplit</span>
          </div>
        </header>

        <header className="hidden md:flex h-16 items-center justify-end px-6 border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-30">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="md:hidden flex justify-end px-4 py-3 bg-gray-50"><NotificationBell /></div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
