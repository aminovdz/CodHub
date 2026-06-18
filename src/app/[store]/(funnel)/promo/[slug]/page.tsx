'use client';

import { use } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import InlineOrderForm from '@/components/InlineOrderForm';
import { Loader2 } from 'lucide-react';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

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


  const hasShortcodes = /\[CHECKOUT_FORM/.test(cleanHtml);
  
  // Replace shortcodes with mount points
  const processedHtml = cleanHtml.replace(
    /\[CHECKOUT_FORM(?::([^\]]+))?\]/g, 
    (match, productId, offset) => `<div id="checkout-mount-${offset}" class="checkout-mount-point" data-product-id="${productId || ''}"></div>`
  );

  const [mountNodes, setMountNodes] = useState<Array<{ id: string, node: HTMLElement, productId: string }>>([]);

  useEffect(() => {
    if (hasShortcodes) {
      const nodes = Array.from(document.querySelectorAll('.checkout-mount-point')).map(el => ({
        id: el.id,
        node: el as HTMLElement,
        productId: el.getAttribute('data-product-id') || ''
      }));
      setMountNodes(nodes);
    }
  }, [processedHtml, hasShortcodes]);

  return (
    <>
      <Script src="https://cdn.tailwindcss.com" strategy="lazyOnload" />
      <div 
        className="min-h-screen bg-white" 
        dir={isArabic ? 'rtl' : 'ltr'}
        dangerouslySetInnerHTML={{ __html: processedHtml }}
      />
      {mountNodes.map(({ id, node, productId }) => 
        createPortal(
          <div className="px-4 py-2 w-full max-w-lg mx-auto">
            <InlineOrderForm productId={productId} region={region} />
          </div>,
          node
        )
      )}
    </>
  );
}
