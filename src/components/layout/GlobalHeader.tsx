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

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={basePath || '/'} className="font-black text-2xl tracking-tighter text-slate-900 truncate max-w-[200px]">
          {store?.name || <>COD<span className="text-indigo-600">HUB</span></>}
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden md:block bg-slate-100 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 uppercase tracking-wider">
            {region.toUpperCase()}
          </div>
          <button className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors">
            <ShoppingBag size={24} />
          </button>
        </div>
      </div>
    </header>
  );
});

export default GlobalHeader;
