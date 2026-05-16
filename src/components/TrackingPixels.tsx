'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';

export default function TrackingPixels({ region }: { region: string }) {
  const pathname = usePathname();
  const { availableStores } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!store || !store.analytics || injectedRef.current) return;

    const { google, facebook, tiktok, snapchat, pinterest } = store.analytics;

    const injectRawHtml = (htmlString: string, idPrefix: string) => {
      if (!htmlString || document.getElementById(`${idPrefix}-container`)) return;

      const container = document.createElement('div');
      container.id = `${idPrefix}-container`;
      // We'll append this to body or head. But head is safer for pixels.
      // Wait, div inside head is invalid HTML, but browsers allow it. 
      // Better to just append the elements themselves.
      
      const temp = document.createElement('div');
      temp.innerHTML = htmlString.trim();

      Array.from(temp.childNodes).forEach((node, index) => {
        if (node.nodeName.toLowerCase() === 'script') {
          const oldScript = node as HTMLScriptElement;
          const newScript = document.createElement('script');
          newScript.id = `${idPrefix}-script-${index}`;
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          document.head.appendChild(newScript);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // non-script tags (like noscript img) can be appended to body
          document.body.appendChild(node.cloneNode(true));
        }
      });
    };

    if (google) injectRawHtml(google, 'ga');
    if (facebook) injectRawHtml(facebook, 'fb');
    if (tiktok) injectRawHtml(tiktok, 'tt');
    if (snapchat) injectRawHtml(snapchat, 'snap');
    if (pinterest) injectRawHtml(pinterest, 'pin');

    injectedRef.current = true;
  }, [store?.analytics]);

  // Track page views on route changes for SPAs
  useEffect(() => {
    if (!store || !store.analytics) return;
    
    // Simple pageview triggers if the objects exist on window
    if (typeof window !== 'undefined') {
      if ((window as any).fbq) (window as any).fbq('track', 'PageView');
      if ((window as any).ttq) (window as any).ttq.page();
      if ((window as any).snaptr) (window as any).snaptr('track', 'PAGE_VIEW');
      if ((window as any).pintrk) (window as any).pintrk('page');
    }
  }, [pathname, store?.analytics]);

  return null;
}
