'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createPortal } from 'react-dom';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import InlineOrderForm from '@/components/InlineOrderForm';
import { Loader2 } from 'lucide-react';

export default function PromoLandingPage({ params }: { params: Promise<{ store: string, slug: string }> }) {
  const resolvedParams = use(params);
  const storeSlug = resolvedParams.store;
  const slug = resolvedParams.slug;
  const { availableStores, landingPages, _hasHydrated } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;

  const variants = store
    ? landingPages.filter(p => p.storeId === store.id && p.slug.toLowerCase() === slug.toLowerCase() && p.published)
    : [];

  const [activeVariant, setActiveVariant] = useState<any>(null);

  useEffect(() => {
    if (variants.length > 0 && !activeVariant) {
      // Check for saved variant in localStorage
      const storageKey = `ab_variant_${slug}`;
      const savedVariantId = localStorage.getItem(storageKey);
      
      let selected = variants.find(v => v.id === savedVariantId);
      
      // If no saved variant or saved variant was deleted, pick a random one
      if (!selected) {
        const randomIndex = Math.floor(Math.random() * variants.length);
        selected = variants[randomIndex];
        localStorage.setItem(storageKey, selected.id);
      }
      
      setActiveVariant(selected);

      // Fire tracking event for view
      fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Landing Page View', variantId: selected.id, storeId: store!.id })
      }).catch(console.error);
    }
  }, [variants.length, activeVariant, slug, store]);

  const cleanHtml = activeVariant ? activeVariant.htmlContent.replace(/className=/g, 'class=') : '';
  const hasShortcodes = /\[CHECKOUT_FORM/.test(cleanHtml);
  
  const processedHtml = cleanHtml.replace(
    /\[CHECKOUT_FORM(?::([^\]]+))?\]/g, 
    (match: string, productId: string, offset: number) => `<div id="checkout-mount-${offset}" class="checkout-mount-point w-full my-8" data-product-id="${productId || ''}"></div>`
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [mountNodes, setMountNodes] = useState<Array<{ id: string, node: HTMLElement, productId: string }>>([]);

  useEffect(() => {
    // 1. Setup Tailwind CDN dynamically
    const scriptId = 'tailwind-cdn-dynamic';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }

    // 2. Map mount nodes for checkout form portals
    if (activeVariant && containerRef.current && hasShortcodes) {
      const nodes = Array.from(containerRef.current.querySelectorAll('.checkout-mount-point')).map(el => ({
        id: el.id,
        node: el as HTMLElement,
        productId: el.getAttribute('data-product-id') || ''
      }));
      setMountNodes(nodes);
    }

    // 3. Cleanup on unmount
    return () => {
      const script = document.getElementById(scriptId);
      if (script) script.remove();
      const style = document.getElementById('tailwind-style');
      if (style) style.remove();
    };
  }, [processedHtml, hasShortcodes, activeVariant]);

  // Show spinner while data is still loading from Supabase
  if (!_hasHydrated || (variants.length > 0 && !activeVariant)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-bold">Loading promo...</p>
      </div>
    );
  }

  if (variants.length === 0 || !activeVariant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-slate-900 mb-4">Promo Page Not Found</h1>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-h-screen bg-white">
        <div 
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: processedHtml }} 
          className="w-full"
        />
        
        {mountNodes.map(({ id, node, productId }) => 
          createPortal(
            <div key={id} className="px-4 py-8 w-full max-w-lg mx-auto">
              <InlineOrderForm productId={productId} region={region} />
            </div>,
            node
          )
        )}
      </div>
    </>
  );
}
