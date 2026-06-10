'use client';

import { useEffect } from 'react';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';

type PixelEvent = 'InitiateCheckout' | 'Purchase';

interface EventData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_type?: string;
}

export function usePixelEvent(eventName: PixelEvent, data?: EventData) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Facebook
    if ((window as any).fbq) {
      (window as any).fbq('track', eventName, data);
    }
    
    // TikTok
    if ((window as any).ttq) {
      if (eventName === 'Purchase') {
        (window as any).ttq.track('CompletePayment', data);
      } else {
        (window as any).ttq.track(eventName, data);
      }
    }

    // Snapchat
    if ((window as any).snaptr) {
      if (eventName === 'InitiateCheckout') {
        (window as any).snaptr('track', 'START_CHECKOUT', data);
      } else if (eventName === 'Purchase') {
        (window as any).snaptr('track', 'PURCHASE', { price: data?.value, currency: data?.currency });
      }
    }

    // Pinterest
    if ((window as any).pintrk) {
      if (eventName === 'InitiateCheckout') {
        (window as any).pintrk('track', 'checkout', { value: data?.value, currency: data?.currency });
      } else if (eventName === 'Purchase') {
        (window as any).pintrk('track', 'checkout', { value: data?.value, currency: data?.currency });
      }
    }
  }, [eventName, JSON.stringify(data)]);
}
