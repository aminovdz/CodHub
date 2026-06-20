'use client';

import { use, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { createPortal } from 'react-dom';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import InlineOrderForm from '@/components/InlineOrderForm';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function PromoLandingPage({ params }: { params: Promise<{ store: string, slug: string }> }) {
  const resolvedParams = use(params);
  const storeSlug = resolvedParams.store;
  const slug = resolvedParams.slug;
  const { availableStores, landingPages, _hasHydrated } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const searchParams = useSearchParams();

  const utmSource = searchParams.get('utm_source') || undefined;
  const utmCampaign = searchParams.get('utm_campaign') || undefined;

  const matchedPages = store
    ? landingPages.filter(p => p.storeId === store.id && p.slug.toLowerCase() === slug.toLowerCase() && p.published)
    : [];

  const [activeVariant, setActiveVariant] = useState<any>(null);

  useEffect(() => {
    if (matchedPages.length > 0 && !activeVariant) {
      let pageToRender = matchedPages[0];
      
      // Check if it's an A/B test config
      try {
        const config = JSON.parse(pageToRender.htmlContent);
        if (config.isAbTest && config.variants?.length === 2) {
          const storageKey = `ab_variant_${slug}`;
          const savedVariantId = localStorage.getItem(storageKey);
          
          let selectedId = savedVariantId;
          if (!selectedId || !config.variants.includes(selectedId)) {
            const trafficSplit = config.trafficSplit || 50;
            const rand = Math.random() * 100;
            selectedId = rand < trafficSplit ? config.variants[0] : config.variants[1];
            localStorage.setItem(storageKey, selectedId as string);
          }
          
          // Find the actual variant page
          const actualPage = landingPages.find(p => p.id === selectedId);
          if (actualPage) {
            pageToRender = actualPage;
          }
        }
      } catch (e) {
        // Not JSON, just a normal page
      }

      setActiveVariant(pageToRender);

      // Fire tracking event for view
      fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Landing Page View', variantId: pageToRender.id, storeId: store!.id })
      }).catch(console.error);
    }
  }, [matchedPages, activeVariant, slug, store]);

  const [processedHtml, setProcessedHtml] = useState('');
  const [mountNodes, setMountNodes] = useState<{id: string, node: HTMLElement, productId: string}[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // This effect runs whenever we get a new activeVariant
  useEffect(() => {
    if (!activeVariant) return;

    let html = activeVariant.htmlContent;
    // Inject Tailwind explicitly if not already there
    if (!html.includes('cdn.tailwindcss.com')) {
      html = `<script src="https://cdn.tailwindcss.com"></script>` + html;
    }

    setProcessedHtml(html);
  }, [activeVariant]);

  const [hasShortcodes, setHasShortcodes] = useState(false);

  // This effect parses the rendered HTML for our specific shortcodes
  useEffect(() => {
    if (!containerRef.current || !processedHtml || hasShortcodes) return;

    // We look for any text nodes containing [product_checkout id="..."]
    const regex = /\[product_checkout id="([^"]+)"\]/g;
    
    // Simplest way: replace the shortcode in the raw HTML with a unique mount point
    let newHtml = processedHtml;
    let match;
    const newMounts: {id: string, productId: string}[] = [];
    
    // We use a safe copy of the string to avoid infinite loops if we mutate while matching
    const tempHtml = processedHtml;
    
    while ((match = regex.exec(tempHtml)) !== null) {
      const productId = match[1];
      const uniqueId = `checkout-mount-${productId}-${Math.random().toString(36).substr(2, 9)}`;
      newMounts.push({ id: uniqueId, productId });
      
      // Replace just this specific instance of the shortcode
      newHtml = newHtml.replace(match[0], `<div id="${uniqueId}"></div>`);
    }

    if (newMounts.length > 0) {
      setProcessedHtml(newHtml);
      setHasShortcodes(true);
      
      // Need to wait for React to render the new HTML with the div containers
      setTimeout(() => {
        const nodes = newMounts.map(m => {
          const el = document.getElementById(m.id);
          return el ? { id: m.id, node: el, productId: m.productId } : null;
        }).filter(Boolean) as {id: string, node: HTMLElement, productId: string}[];
        
        setMountNodes(nodes);
      }, 50);
    } else {
      setHasShortcodes(true); // checked, none found
    }
  }, [processedHtml, hasShortcodes, activeVariant]);

  // Show spinner while data is still loading from Supabase
  if (!_hasHydrated || (matchedPages.length > 0 && !activeVariant)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-bold">Loading promo...</p>
      </div>
    );
  }

  if (matchedPages.length === 0 || !activeVariant) {
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
              <InlineOrderForm productId={productId} region={region} utmSource={utmSource} utmCampaign={utmCampaign} />
            </div>,
            node
          )
        )}
      </div>
    </>
  );
}
