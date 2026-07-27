'use client';

import { memo } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';

const GlobalHeader = memo(function GlobalHeader({ region }: { region: string }) {
  const { availableStores } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith(`${region.toLowerCase()}.`);
  const basePath = isSubdomain ? '' : `/${region}`;

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
      <header className="bg-[var(--color-background)]/95 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={basePath || '/'} className="font-black text-2xl tracking-tighter text-[var(--color-text)] truncate max-w-[200px]">
          {store?.logoUrl ? (
            <img src={store.logoUrl} alt={store?.name || 'Logo'} className="h-8 w-auto object-contain" />
          ) : (
            store?.name || <>COD<span style={{ color: 'var(--color-primary)' }}>HUB</span></>
          )}
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden md:block bg-slate-100/50 px-3 py-1.5 rounded-full text-xs font-bold text-[var(--color-text)] opacity-70 uppercase tracking-wider">
            {region.toUpperCase()}
          </div>
          <button className="relative p-2 text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
            <ShoppingBag size={24} />
          </button>
        </div>
      </div>
      </header>
    </>
  );
});

export default GlobalHeader;
