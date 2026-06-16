'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, LogOut, Store as StoreIcon,
  FileText, MonitorPlay, ShoppingCart, Home, CreditCard, ShieldAlert,
  Ghost, Menu, X, Sun, Moon, BarChart2, Boxes, Tag, Activity, Bot, Users, Globe, Calculator, HelpCircle, Megaphone
} from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { ToastContainer } from '@/components/admin/ToastContainer';

const ADMIN_PIN = '1234';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [activeRole, setActiveRole] = useState<'admin' | 'fulfillment' | 'confirmation' | null>(null);
  const [error, setError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isSuperAdminRoute, setIsSuperAdminRoute] = useState(false);

  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login' || pathname === '/superadmin/login';
  const { activeStore, availableStores, setActiveStore, staffAccounts, updateStaffAccount, _hasHydrated } = useAdminStore(
    useShallow((s: any) => ({
      activeStore: s.activeStore,
      availableStores: s.availableStores,
      setActiveStore: s.setActiveStore,
      staffAccounts: s.staffAccounts,
      updateStaffAccount: s.updateStaffAccount,
      _hasHydrated: s._hasHydrated,
    }))
  );

  // storeReady: true once Zustand has loaded data from localStorage
  const storeReady = _hasHydrated;

  const currentStaffAccount = !isSuperAdminRoute && isAuthenticated && username
    ? staffAccounts.find((a: any) => a.name.trim().toLowerCase() === username.trim().toLowerCase())
    : null;
  const allowedStoreIds = currentStaffAccount 
    ? (currentStaffAccount.storeIds && currentStaffAccount.storeIds.length > 0 
        ? currentStaffAccount.storeIds 
        : currentStaffAccount.storeId ? [currentStaffAccount.storeId] : [])
    : [];
  const isGlobalStaff = currentStaffAccount && allowedStoreIds.length === 0;
  const isSingleStoreStaff = currentStaffAccount && allowedStoreIds.length === 1;

  // Detect route type and manage session redirect / restoration
  const lastVerifyRef = useRef(0);

  useEffect(() => {
    const superRoute = pathname.startsWith('/superadmin');
    setIsSuperAdminRoute(superRoute);

    const saved = localStorage.getItem('codadmin-dark');
    if (saved === 'true') setIsDark(true);

    const isLogin = pathname === '/admin/login' || pathname === '/superadmin/login';
    const targetLogin = superRoute ? '/superadmin/login' : '/admin/login';

    if (isLogin) return;

    let sessionAuth = sessionStorage.getItem('codadmin-auth');

    if (sessionAuth) {
      try {
        const { auth, role, user, isSuperAdmin } = JSON.parse(sessionAuth);
        if (!!isSuperAdmin === superRoute) {
          setIsAuthenticated(auth);
          setActiveRole(role);
          setUsername(user);
          return;
        } else {
          window.location.href = targetLogin;
          return;
        }
      } catch {
        sessionStorage.removeItem('codadmin-auth');
        sessionAuth = null;
      }
    }

    // Debounce server verification: skip if verified in the last 30s
    const now = Date.now();
    if (now - lastVerifyRef.current < 30000) return;
    lastVerifyRef.current = now;

    const serverVerify = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            const userData = data.user;
            setIsAuthenticated(true);
            setActiveRole(userData.role);
            setUsername(userData.username);
            sessionStorage.setItem('codadmin-auth', JSON.stringify({
              auth: true, role: userData.role, user: userData.username,
              username: userData.username, isSuperAdmin: !!userData.isSuperAdmin
            }));
            return;
          }
        }
      } catch {
        // Network error — fall through to redirect
      }
      window.location.href = targetLogin;
    };

    serverVerify();
  }, [pathname]);

  // Enforce store-specific staff restriction
  useEffect(() => {
    if (storeReady && isAuthenticated && username && !isSuperAdminRoute) {
      const usernameClean = username.trim().toLowerCase();
      const account = staffAccounts.find(
        (a: any) => a.name.trim().toLowerCase() === usernameClean
      );
      if (account) {
        const accountStoreIds = account.storeIds && account.storeIds.length > 0 
          ? account.storeIds 
          : account.storeId ? [account.storeId] : [];

        if (accountStoreIds.length > 0) {
          const isCurrentlyAllowed = activeStore && accountStoreIds.includes(activeStore.id);
          if (!isCurrentlyAllowed) {
            const firstValidStore = availableStores.find((s: any) => accountStoreIds.includes(s.id));
            if (firstValidStore) {
              setActiveStore(firstValidStore.id);
            }
          }
        }
      }
    }
  }, [storeReady, isAuthenticated, username, staffAccounts, availableStores, activeStore?.id, isSuperAdminRoute, setActiveStore]);

  const basePath = isSuperAdminRoute ? '/superadmin' : '/admin';

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('codadmin-dark', String(next));
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('codadmin-auth');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    window.location.href = isSuperAdminRoute ? '/superadmin/login' : '/admin/login';
  };

  // Render login pages directly without wrapping inside the dashboard layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-pulse flex flex-col items-center">
          <StoreIcon size={32} className="text-indigo-500 mb-4" />
          <p>Verifying session...</p>
        </div>
      </div>
    );
  }

  const navSections = [
    {
      title: 'Overview',
      links: [
        { href: basePath, label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'fulfillment', 'confirmation'] },
      ],
    },
    {
      title: 'Orders & Customers',
      links: [
        { href: `${basePath}/orders`, label: 'Orders', icon: <ShoppingCart size={18} />, roles: ['admin', 'fulfillment', 'confirmation'] },
        { href: `${basePath}/abandoned`, label: 'Abandoned Carts', icon: <Ghost size={18} />, roles: ['admin', 'confirmation'] },
        { href: `${basePath}/customers`, label: 'Customers', icon: <Users size={18} />, roles: ['admin'] },
      ],
    },
    {
      title: 'Products & Inventory',
      links: [
        { href: `${basePath}/products`, label: 'Products', icon: <Package size={18} />, roles: ['admin'] },
        { href: `${basePath}/stock`, label: 'Stock', icon: <Boxes size={18} />, roles: ['admin', 'fulfillment'] },
        { href: `${basePath}/coupons`, label: 'Coupons', icon: <Tag size={18} />, roles: ['admin'] },
      ],
    },
    {
      title: 'Storefront',
      links: [
        { href: `${basePath}/homepage`, label: 'Homepage', icon: <Home size={18} />, roles: ['admin'] },
        { href: `${basePath}/checkout`, label: 'Checkout', icon: <CreditCard size={18} />, roles: ['admin'] },
        { href: `${basePath}/promo`, label: 'Landing Pages', icon: <MonitorPlay size={18} />, roles: ['admin'] },
        { href: `${basePath}/legal`, label: 'Legal Pages', icon: <FileText size={18} />, roles: ['admin'] },
        { href: `${basePath}/translations`, label: 'Translations', icon: <Globe size={18} />, roles: ['admin'] },
      ],
    },
    {
      title: 'Growth & Analytics',
      links: [
        { href: `${basePath}/analytics`, label: 'Analytics', icon: <BarChart2 size={18} />, roles: ['admin'] },
        { href: `${basePath}/calculator`, label: 'Profit Calculator', icon: <Calculator size={18} />, roles: ['admin'] },
        { href: `${basePath}/agents`, label: 'AI Agents Hub', icon: <Bot size={18} />, roles: ['admin'] },
        { href: `${basePath}/ads-mcp`, label: 'Ads MCP Hub', icon: <Megaphone size={18} />, roles: ['admin'] },
      ],
    },
    {
      title: 'Administration',
      links: [
        { href: `${basePath}/staff`, label: 'Staff Performance', icon: <Users size={18} />, roles: ['admin'] },
        { href: `${basePath}/activity`, label: 'Activity Log', icon: <Activity size={18} />, roles: ['admin'] },
        { href: `${basePath}/help`, label: 'Help & Docs', icon: <HelpCircle size={18} />, roles: ['admin'] },
        { href: `${basePath}/settings`, label: 'Settings', icon: <Settings size={18} />, roles: ['admin'] },
      ],
    },
  ];

  return (
    <div className={`min-h-screen flex font-sans relative transition-colors duration-300 ${isDark ? 'dark bg-slate-900' : 'bg-slate-50'}`}>
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`w-64 flex-col sticky top-0 h-screen z-50 transition-all duration-300 border-r absolute md:relative ${
        isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full md:translate-x-0 hidden md:flex'
      } ${isDark
        ? 'bg-slate-950 border-slate-800'
        : 'bg-slate-900 border-slate-800'
      }`}>

        {/* Logo */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div className="font-black text-xl tracking-tighter text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <StoreIcon size={16} className="text-white" />
            </div>
            COD<span className={isSuperAdminRoute ? 'text-rose-400' : 'text-indigo-400'}>ADMIN</span>
          </div>
          {isSuperAdminRoute && (
            <span className="text-xs font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">SUPER</span>
          )}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navSections.map(section => {
            const visibleLinks = section.links.filter(l => l.roles.includes(activeRole || 'admin'));
            if (visibleLinks.length === 0) return null;
            return (
              <div key={section.title}>
                <p className="px-3 pb-1 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{section.title}</p>
                <div className="space-y-0.5">
                  {visibleLinks.map(link => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl font-semibold text-sm transition-all ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className={isActive ? 'text-white' : 'text-slate-500'}>{link.icon}</span>
                        {link.label}
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Panel */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Active Store Selector */}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <div className="text-xs text-slate-500 font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <StoreIcon size={10} /> Active Store
            </div>
            <select
              disabled={!!isSingleStoreStaff}
              value={activeStore?.id || ''}
              onChange={(e) => setActiveStore(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {availableStores.length > 0 ? (
                availableStores
                  .filter((s: any) => isGlobalStaff || !currentStaffAccount || allowedStoreIds.includes(s.id))
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.region.toUpperCase()})</option>
                  ))
              ) : (
                <option value="" disabled>No stores found</option>
              )}
            </select>
          </div>

          {/* Shift Tracking (Online/Offline) */}
          {currentStaffAccount && (
            <div className="bg-slate-800/60 rounded-xl p-3">
              <div className="text-xs text-slate-500 font-bold mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Activity size={10} /> Shift Status</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full text-white ${currentStaffAccount.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`}>
                  {currentStaffAccount.isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <button
                onClick={async () => {
                  await updateStaffAccount(currentStaffAccount.id, { isOnline: !currentStaffAccount.isOnline });
                }}
                className={`w-full py-2 px-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  currentStaffAccount.isOnline
                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${currentStaffAccount.isOnline ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`} />
                {currentStaffAccount.isOnline ? 'End Shift (Go Offline)' : 'Start Shift (Go Online)'}
              </button>
            </div>
          )}


          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-all w-full"
          >
            {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-400" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
            <span className={`ml-auto w-8 h-4 rounded-full transition-colors ${isDark ? 'bg-amber-500' : 'bg-indigo-600'} relative flex items-center`}>
              <span className={`absolute w-3 h-3 bg-white rounded-full shadow transition-all ${isDark ? 'left-4' : 'left-0.5'}`} />
            </span>
          </button>

          {/* Lock */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all w-full"
          >
            <LogOut size={18} /> Lock Console
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Bar */}
        <header className={`p-4 flex justify-between items-center md:hidden sticky top-0 z-30 shadow-md border-b transition-colors ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg transition-colors">
              <Menu size={22} />
            </button>
            <div className="font-black text-xl text-white">COD<span className="text-indigo-400">ADMIN</span></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto p-5 md:p-10 transition-colors duration-300 ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
          {children}
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}
