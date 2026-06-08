'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export function UTMTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Explicit click-id checks first (highest confidence)
    let resolvedSource: string | null = null;

    if (searchParams.get('fbclid')) {
      resolvedSource = 'facebook';
    } else if (searchParams.get('ttclid')) {
      resolvedSource = 'tiktok';
    } else if (searchParams.get('ScCid') || searchParams.get('scclid')) {
      resolvedSource = 'snapchat';
    } else {
      // Fall back to explicit utm_source parameter
      const utmSource = searchParams.get('utm_source') || searchParams.get('source');
      if (utmSource) {
        const s = utmSource.toLowerCase();
        if (s.includes('facebook') || s.includes('fb') || s.includes('meta')) resolvedSource = 'facebook';
        else if (s.includes('tiktok') || s.includes('tt')) resolvedSource = 'tiktok';
        else if (s.includes('snap')) resolvedSource = 'snapchat';
        else if (s.includes('direct')) resolvedSource = 'direct';
        else resolvedSource = 'other';
      }
    }

    const utmMedium = searchParams.get('utm_medium');
    const utmCampaign = searchParams.get('utm_campaign');

    // Only overwrite if not already set in this session (first-touch attribution)
    if (resolvedSource && !sessionStorage.getItem('utm_source')) {
      sessionStorage.setItem('utm_source', resolvedSource);
    }
    if (utmMedium && !sessionStorage.getItem('utm_medium')) {
      sessionStorage.setItem('utm_medium', utmMedium);
    }
    if (utmCampaign && !sessionStorage.getItem('utm_campaign')) {
      sessionStorage.setItem('utm_campaign', utmCampaign);
    }
  }, [searchParams]);

  return null;
}
