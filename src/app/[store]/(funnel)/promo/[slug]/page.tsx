'use client';

import { use, useState, useEffect } from 'react';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import RichHtmlContent from '@/components/RichHtmlContent';
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
        <RichHtmlContent html={activeVariant.htmlContent} region={region} storeSlug={resolvedParams.store} utmSource={utmSource} utmCampaign={utmCampaign} />
      </div>
    </>
  );
}
