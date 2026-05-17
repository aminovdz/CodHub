'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Settings, LogOut, Store as StoreIcon,
  FileText, MonitorPlay, ShoppingCart, Home, CreditCard, ShieldAlert,
  Ghost, Menu, X, Sun, Moon, BarChart2, Boxes, Tag, Activity, Bot, Users, Globe
} from 'lucide-react';
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
  const { activeStore, availableStores, setActiveStore, staffAccounts, _hasHydrated } = useAdminStore();

  // storeReady: true once Zustand has loaded data from localStorage
  const storeReady = _hasHydrated;

  const currentStaffAccount = !isSuperAdminRoute && isAuthenticated && username
    ? staffAccounts.find(a => a.name.trim().toLowerCase() === username.trim().toLowerCase())
    : null;
  const isRestrictedStaff = currentStaffAccount && currentStaffAccount.storeId;
  const restrictedStoreId = currentStaffAccount?.storeId;

  // Detect route type once on mount (pathname is stable from here)
  useEffect(() => {
    const superRoute = pathname.startsWith('/superadmin');
    setIsSuperAdminRoute(superRoute);

    // Restore session — run only once on mount
    const saved = localStorage.getItem('codadmin-dark');
    if (saved === 'true') setIsDark(true);

    const sessionAuth = sessionStorage.getItem('codadmin-auth');
    if (sessionAuth) {
      try {
        const { auth, role, user, isSuperAdmin } = JSON.parse(sessionAuth);
        // Only restore if the session type matches the current panel
        if (!!isSuperAdmin === superRoute) {
          setIsAuthenticated(auth);
          setActiveRole(role);
          setUsername(user);
        }
        // If types don't match, just ignore (don't wipe—user may open both panels)
      } catch {
        sessionStorage.removeItem('codadmin-auth');
      }
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← Empty deps: run once on mount only

  // Update route type whenever URL changes (for navigation within the layout)
  useEffect(() => {
    setIsSuperAdminRoute(pathname.startsWith('/superadmin'));
  }, [pathname]);

  // Enforce store-specific staff restriction
  useEffect(() => {
    if (storeReady && isAuthenticated && username && !isSuperAdminRoute) {
      const usernameClean = username.trim().toLowerCase();
      const account = staffAccounts.find(
        a => a.name.trim().toLowerCase() === usernameClean
      );
      if (account && account.storeId) {
        const hasStore = availableStores.some(s => s.id === account.storeId);
        if (hasStore && activeStore?.id !== account.storeId) {
          setActiveStore(account.storeId);
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const usernameClean = username.trim().toLowerCase();

    if (isSuperAdminRoute) {
      // /superadmin → only master admin credentials work
      if (usernameClean === 'admin' && pin === ADMIN_PIN) {
        setIsAuthenticated(true);
        setActiveRole('admin');
        setError('');
        sessionStorage.setItem('codadmin-auth', JSON.stringify({
          auth: true, role: 'admin', user: 'admin', isSuperAdmin: true
        }));
      } else {
        setError('Invalid Super Admin credentials.');
        setPin('');
      }
    } else {
      // /admin → only staff accounts work (master admin cannot log in here)
      const account = staffAccounts.find(
        a => a.name.trim().toLowerCase() === usernameClean && a.pin === pin
      );
      if (account) {
        setIsAuthenticated(true);
        setActiveRole(account.role);
        setError('');
        sessionStorage.setItem('codadmin-auth', JSON.stringify({
          auth: true, role: account.role, user: account.name, isSuperAdmin: false
        }));
        // Switch immediately to assigned store on login
        if (account.storeId) {
          setActiveStore(account.storeId);
        }
      } else {
        setError('Invalid staff username or PIN. Check Settings → Staff Accounts.');
        setPin('');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
        style={{ backgroundImage: 'radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
      >
        <div className="absolute top-4 right-4">
          <button onClick={toggleDark} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <form onSubmit={handleLogin} className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full border transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <StoreIcon size={30} className="text-white" />
            </div>
            <h1 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
              COD<span className="text-indigo-500">ADMIN</span>
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isSuperAdminRoute ? 'Super Admin Access' : 'Staff Portal Login'}
            </p>
            {isSuperAdminRoute && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-black">
                <ShieldAlert size={12} /> SUPERADMIN PANEL
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {isSuperAdminRoute ? 'Admin Username' : 'Staff Name'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-colors font-bold ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              placeholder={isSuperAdminRoute ? 'admin' : 'Your staff name'}
              autoFocus
              autoComplete="off"
            />
          </div>

          <div className="mb-6">
            <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              PIN / Password
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className={`w-full px-4 py-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-[0.5em] font-mono text-2xl transition-colors ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
              placeholder="••••"
              maxLength={8}
              autoComplete="off"
            />
            {error && (
              <p className="text-rose-500 text-xs font-bold mt-3 text-center flex items-center justify-center gap-1">
                <span>⚠️</span> {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isSuperAdminRoute && !storeReady}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-wait"
          >
            {!isSuperAdminRoute && !storeReady ? 'Loading...' : 'Unlock Console'}
          </button>

          {!isSuperAdminRoute && (
            <p className="text-center text-xs text-slate-500 mt-4">
              Use the name and PIN set in <strong>Settings → Staff Accounts</strong>.
            </p>
          )}
        </form>
      </div>
    );
  }

  const navLinks = [
    { href: basePath,                label: 'Dashboard',       icon: <LayoutDashboard size={18} />, roles: ['admin', 'fulfillment', 'confirmation'] },
    { href: `${basePath}/orders`,    label: 'Orders',          icon: <ShoppingCart size={18} />,    roles: ['admin', 'fulfillment', 'confirmation'] },
    { href: `${basePath}/abandoned`, label: 'Abandoned Carts', icon: <Ghost size={18} />,           roles: ['admin', 'confirmation'] },
    { href: `${basePath}/analytics`, label: 'Analytics',       icon: <BarChart2 size={18} />,       roles: ['admin'] },
    { href: `${basePath}/customers`, label: 'Customers',       icon: <Users size={18} />,           roles: ['admin'] },
    { href: `${basePath}/stock`,     label: 'Stock',           icon: <Boxes size={18} />,           roles: ['admin', 'fulfillment'] },
    { href: `${basePath}/products`,  label: 'Products',        icon: <Package size={18} />,         roles: ['admin'] },
    { href: `${basePath}/coupons`,   label: 'Coupons',         icon: <Tag size={18} />,             roles: ['admin'] },
    { href: `${basePath}/homepage`,  label: 'Homepage',        icon: <Home size={18} />,            roles: ['admin'] },
    { href: `${basePath}/checkout`,  label: 'Checkout',        icon: <CreditCard size={18} />,      roles: ['admin'] },
    { href: `${basePath}/translations`,label: 'Translations',    icon: <Globe size={18} />,           roles: ['admin'] },
    { href: `${basePath}/legal`,     label: 'Legal Pages',     icon: <FileText size={18} />,        roles: ['admin'] },
    { href: `${basePath}/promo`,     label: 'Landing Pages',   icon: <MonitorPlay size={18} />,     roles: ['admin'] },
    { href: `${basePath}/agents`,    label: 'AI Agents Hub',   icon: <Bot size={18} />,             roles: ['admin'] },
    { href: `${basePath}/staff`,     label: 'Staff Perf.',     icon: <Users size={18} />,           roles: ['admin'] },
    { href: `${basePath}/activity`,  label: 'Activity Log',    icon: <Activity size={18} />,        roles: ['admin'] },
    { href: `${basePath}/settings`,  label: 'Settings',        icon: <Settings size={18} />,        roles: ['admin'] },
  ].filter(link => link.roles.includes(activeRole || 'admin'));

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
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navLinks.map(link => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
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
        </nav>

        {/* Bottom Panel */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Active Store Selector */}
          <div className="bg-slate-800/60 rounded-xl p-3">
            <div className="text-xs text-slate-500 font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <StoreIcon size={10} /> Active Store
            </div>
            <select
              disabled={!!isRestrictedStaff}
              value={activeStore?.id || ''}
              onChange={(e) => setActiveStore(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {availableStores.length > 0 ? (
                availableStores
                  .filter(s => !isRestrictedStaff || s.id === restrictedStoreId)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.region.toUpperCase()})</option>
                  ))
              ) : (
                <option value="" disabled>No stores found</option>
              )}
            </select>
          </div>

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
            onClick={() => setIsAuthenticated(false)}
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
            <button onClick={() => { setIsAuthenticated(false); sessionStorage.removeItem('codadmin-auth'); }} className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-colors">
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
