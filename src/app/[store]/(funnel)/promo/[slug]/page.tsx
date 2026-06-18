'use client';

import { use } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import InlineOrderForm from '@/components/InlineOrderForm';
import { Loader2 } from 'lucide-react';

// Split HTML/JSX content on [CHECKOUT_FORM:productId] shortcodes
// Returns an array of segments: { type: 'html' | 'form', content: string, productId?: string }
function parseShortcodes(html: string) {
  const segments: Array<{ type: 'html' | 'form'; content: string; productId?: string }> = [];
  const regex = /\[CHECKOUT_FORM(?::([^\]]+))?\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    // HTML before this shortcode
    if (match.index > lastIndex) {
      segments.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    // The inline form
    segments.push({ type: 'form', content: match[0], productId: match[1] || '' });
    lastIndex = match.index + match[0].length;
  }

  // Remaining HTML after last shortcode
  if (lastIndex < html.length) {
    segments.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'html' as const, content: html }];
}

export default function PromoLandingPage({ params }: { params: Promise<{ store: string, slug: string }> }) {
  const resolvedParams = use(params);
  const storeSlug = resolvedParams.store;
  const slug = resolvedParams.slug;
  const { availableStores, landingPages, products, _hasHydrated } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  
  const regionLower = region?.toLowerCase() || '';
  const isArabic = ['dz', 'sa', 'ae', 'ma', 'eg', 'ar'].includes(regionLower);

  // Case-insensitive slug match so /dz/promo/Flash-Sale works regardless of casing saved in DB
  const page = store
    ? landingPages.find(p => p.storeId === store.id && p.slug.toLowerCase() === slug.toLowerCase())
    : undefined;

  const cleanHtml = page ? page.htmlContent.replace(/className=/g, 'class=') : '';

  // Show spinner while data is still loading from Supabase
  if (!_hasHydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-bold">Loading promo...</p>
      </div>
    );
  }

  if (!page || !page.published) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-slate-900 mb-4">Promo Page Not Found</h1>
        <p className="text-slate-500 mb-6">This landing page might have expired or does not exist.</p>
        {(() => {
          const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
          const basePath = isCustomDomain ? '/' : `/${region}`;
          return <Link href={basePath} className="text-indigo-600 font-bold hover:underline">Return to Store</Link>;
        })()}
      </div>
    );
  }


  const segments = parseShortcodes(cleanHtml);
  const hasShortcodes = segments.some(s => s.type === 'form');

  // Simple case: no shortcodes → render as before
  if (!hasShortcodes) {
    return (
      <>
        <Script src="https://cdn.tailwindcss.com" strategy="lazyOnload" />
        <div 
          className="min-h-screen bg-white" 
          dir={isArabic ? 'rtl' : 'ltr'}
          dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
      </>
    );
  }

  // Mixed: render HTML segments interleaved with React checkout forms
  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="lazyOnload" />
      <div className="min-h-screen bg-white" dir={isArabic ? 'rtl' : 'ltr'}>
      {segments.map((seg, i) => {
        if (seg.type === 'form') {
          return (
            <div key={i} className="px-4 py-2">
              <InlineOrderForm productId={seg.productId || ''} region={region} />
            </div>
          );
        }
        return (
          <div 
            key={i} 
            dangerouslySetInnerHTML={{ __html: seg.content }} 
          />
        );
      })}
    </div>
    </>
  );
}
