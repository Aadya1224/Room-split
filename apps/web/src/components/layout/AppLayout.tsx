import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
  LogOut,
  SplitSquareVertical,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useLogout } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/groups',     icon: Users,            label: 'Groups'    },
  { to: '/expenses',   icon: Receipt,          label: 'Expenses'  },
  { to: '/settings',   icon: Settings,         label: 'Settings'  },
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
