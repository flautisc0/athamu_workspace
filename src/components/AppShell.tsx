'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderGit2,
  Users,
  Building2,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

interface UserSessionData {
  user_id?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  role_title?: string;
  provider?: string;
}

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Default fallback values: 'ATHA' and ''
  const [userName, setUserName] = useState<string>('ATHA');
  const [userPicture, setUserPicture] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const rawSession = localStorage.getItem('user_session');
        if (rawSession) {
          const session: UserSessionData = JSON.parse(rawSession);
          if (session.display_name && session.display_name.trim() !== '') {
            setUserName(session.display_name);
          }
          if (session.avatar_url && session.avatar_url.trim() !== '') {
            setUserPicture(session.avatar_url);
          }
        }
      } catch {
        // Fallback to defaults
      }
    }
  }, []);

  const name = userName;
  const picture = userPicture;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Proyectos', href: '/portfolio/projects', icon: FolderGit2 },
    { label: 'Usuarios', href: '/users', icon: Users },
    { label: 'Entidades', href: '/entities', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-white">CRM</span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer / Sidebar */}
      <aside
        className={`fixed md:static top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
            <span className="text-lg font-bold tracking-tight text-white">CRM Web</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (pathname ? pathname.startsWith(`${item.href}/`) : false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile section in Drawer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            {picture ? (
              <img
                src={picture}
                alt={name}
                className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0">
                {name ? name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{name}</p>
              <p className="text-[11px] text-slate-400 truncate">Sesión activa</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
