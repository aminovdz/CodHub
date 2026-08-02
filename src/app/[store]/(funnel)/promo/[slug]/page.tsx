'use client';

import { use, useState, useEffect } from 'react';
import { resolveStore } from '@/lib/store/useAdminStore';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';
import RichHtmlContent from '@/components/RichHtmlContent';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PromoLandingPage({ params }: { params: Promise<{ store: string, slug: string }> }) {
  const resolvedParams = use(params);
  const storeSlug = resolvedParams.store;
  const slug = decodeURIComponent(resolvedParams.slug);
  const { availableStores, _hasHydrated, isLoading } = useStorefrontStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const searchParams = useSearchParams();

  const utmSource = searchParams.get('utm_source') || undefined;
  const utmCampaign = searchParams.get('utm_campaign') || undefined;

  const [activeVariant, setActiveVariant] = useState<any>(null);
  const [pageNotFound, setPageNotFound] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!store?.id) return;

    const fetchLandingPage = async () => {
      try {
        setIsFetching(true);
        // First try to find by slug
        const { data: matchedPages, error } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('store_id', store.id)
          .ilike('slug', slug)
          .eq('published', true);

        if (error || !matchedPages || matchedPages.length === 0) {
          setPageNotFound(true);
          setIsFetching(false);
          return;
        }

        let pageToRender = matchedPages[0];

        // Check if it's an A/B test config
        try {
          const config = JSON.parse(pageToRender.html_content || pageToRender.htmlContent);
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
            
            // Fetch the actual variant page
            const { data: variantPage } = await supabase
              .from('landing_pages')
              .select('*')
              .eq('id', selectedId)
              .single();
              
            if (variantPage) {
              pageToRender = variantPage;
            }
          }
        } catch (e) {
          // Not JSON, just a normal page
        }

        // Map snake_case to camelCase since we fetched directly
        if (pageToRender.html_content) {
          pageToRender.htmlContent = pageToRender.html_content;
        }

        setActiveVariant(pageToRender);

        // Fire tracking event for view
        fetch('/api/tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'Landing Page View', variantId: pageToRender.id, storeId: store.id })
        }).catch(console.error);

      } catch (err) {
        console.error('Error fetching landing page:', err);
        setPageNotFound(true);
      } finally {
        setIsFetching(false);
      }
    };

    fetchLandingPage();
  }, [slug, store?.id]);

  // Show spinner while data is still loading
  if (!_hasHydrated || isLoading || isFetching) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <p className="text-slate-500 font-bold">Loading promo...</p>
      </div>
    );
  }

  if (pageNotFound || !activeVariant) {
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
