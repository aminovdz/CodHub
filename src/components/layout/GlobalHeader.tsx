'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronDown, Menu, X } from 'lucide-react';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';

const GlobalHeader = memo(function GlobalHeader({ region }: { region: string }) {
  const store = useStorefrontStore((state) => state.activeStore);
  const isPathRouting = typeof window !== 'undefined' && (
    window.location.pathname === `/${region}` || 
    window.location.pathname.startsWith(`/${region}/`)
  );
  const basePath = isPathRouting ? `/${region}` : '';
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const theme = store?.theme;
  const announcementText = store?.translations?.brand?.announcementText || 'Free Shipping on all orders!'; // Fallback to old property or default
  
  return (
    <>
      {theme?.hero && (theme.hero.announcementBgColor || theme.hero.announcementMarquee) && (
        <div 
          style={{ 
            backgroundColor: theme.hero.announcementBgColor || '#4F46E5',
            color: theme.hero.announcementTextColor || '#FFFFFF'
          }}
          className="w-full text-center py-2 px-4 text-xs font-bold overflow-hidden"
        >
          {theme.hero.announcementMarquee ? (
            <div className="whitespace-nowrap animate-marquee">
              {announcementText}
            </div>
          ) : (
            <div>{announcementText}</div>
          )}
        </div>
      )}
      <header className="store-header backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between relative">
          
          <div className="flex items-center gap-8 z-10">
            <Link href={basePath || '/'} className="font-black text-2xl tracking-tighter text-[var(--color-text)] truncate max-w-[200px]">
              {store?.logoUrl ? (
                <img src={store.logoUrl} alt={store?.name || 'Logo'} className="h-8 w-auto object-contain" />
              ) : (
                store?.name || <>COD<span style={{ color: 'var(--color-primary)' }}>HUB</span></>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          {store?.navigation && store.navigation.length > 0 && (
            <nav className="hidden lg:flex items-center justify-center gap-6 absolute left-1/2 -translate-x-1/2 w-full max-w-2xl">
              {store.navigation.map((navItem) => (
                <div key={navItem.id} className="relative group">
                  <Link href={navItem.url.startsWith('http') ? navItem.url : `${basePath}${navItem.url}`} className="flex items-center gap-1 text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] py-4 transition-colors">
                    {navItem.label}
                    {navItem.subItems && navItem.subItems.length > 0 && <ChevronDown className="w-3 h-3 opacity-50 group-hover:rotate-180 transition-transform" />}
                  </Link>
                  
                  {navItem.subItems && navItem.subItems.length > 0 && (
                    <div className="absolute top-[calc(100%-8px)] left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all translate-y-2 group-hover:translate-y-0 z-50 p-2">
                      <div className="grid grid-cols-1 gap-1">
                        {navItem.subItems.map((sub) => (
                          <Link key={sub.id} href={sub.url.startsWith('http') ? sub.url : `${basePath}${sub.url}`} className="block px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[var(--color-primary)] hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors">
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-4 z-10">
            <div className="hidden md:block bg-slate-100/50 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--color-text)] opacity-70 uppercase tracking-wider">
              {region.toUpperCase()}
            </div>
            <button className="relative p-2 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
              <ShoppingBag size={24} />
            </button>
            
            {/* Mobile Menu Toggle */}
            {store?.navigation && store.navigation.length > 0 && (
              <button 
                className="lg:hidden relative p-2 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && store?.navigation && store.navigation.length > 0 && (
          <div className="lg:hidden absolute top-full left-0 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xl max-h-[70vh] overflow-y-auto">
            <div className="p-4 flex flex-col gap-2">
              {store.navigation.map((navItem) => (
                <div key={navItem.id} className="flex flex-col gap-1">
                  <Link 
                    href={navItem.url.startsWith('http') ? navItem.url : `${basePath}${navItem.url}`} 
                    className="font-bold text-lg text-slate-900 dark:text-white py-3 border-b border-slate-100 dark:border-slate-800"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {navItem.label}
                  </Link>
                  {navItem.subItems && navItem.subItems.length > 0 && (
                    <div className="pl-4 py-2 flex flex-col gap-3">
                      {navItem.subItems.map(sub => (
                        <Link 
                          key={sub.id} 
                          href={sub.url.startsWith('http') ? sub.url : `${basePath}${sub.url}`} 
                          className="font-medium text-slate-600 dark:text-slate-400"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>
    </>
  );
});

export default GlobalHeader;
