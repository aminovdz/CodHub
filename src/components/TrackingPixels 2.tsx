'use client';

import { memo, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';

const TrackingPixels = memo(function TrackingPixels({ region }: { region: string }) {
  const pathname = usePathname();
  const { availableStores } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const injectedRef = useRef(false);

  useEffect(() => {
    if (!store || !store.analytics || injectedRef.current) return;

    const { google, facebook, tiktok, snapchat, pinterest } = store.analytics;

    const injectPixel = (input: string, type: 'ga' | 'fb' | 'tt' | 'snap' | 'pin') => {
      if (!input || document.getElementById(`pixel-${type}-injected`)) return;

      const cleanInput = input.trim();
      const isHtmlSnippet = cleanInput.startsWith('<');

      // Create a marker script tag in head to avoid duplicate injection
      const marker = document.createElement('script');
      marker.id = `pixel-${type}-injected`;
      marker.text = `// Pixel ${type} initialized`;
      document.head.appendChild(marker);

      if (isHtmlSnippet) {
        // Parse the HTML snippet and append all script tags to document.head
        const temp = document.createElement('div');
        temp.innerHTML = cleanInput;

        Array.from(temp.childNodes).forEach((node, index) => {
          if (node.nodeName.toLowerCase() === 'script') {
            const oldScript = node as HTMLScriptElement;
            const newScript = document.createElement('script');
            newScript.id = `pixel-${type}-script-${index}`;
            newScript.type = oldScript.type || 'text/javascript';
            Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
            if (oldScript.src) {
              newScript.src = oldScript.src;
            } else {
              newScript.text = oldScript.innerHTML;
            }
            document.head.appendChild(newScript);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Append noscript/img tags to body
            document.body.appendChild(node.cloneNode(true));
          }
        });
      } else {
        // It's a plain Pixel ID! Generate the standard pixel snippet for head!
        if (type === 'ga') {
          const s1 = document.createElement('script');
          s1.async = true;
          s1.src = `https://www.googletagmanager.com/gtag/js?id=${cleanInput}`;
          document.head.appendChild(s1);

          const s2 = document.createElement('script');
          s2.text = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${cleanInput}');`;
          document.head.appendChild(s2);
        } else if (type === 'fb') {
          const s = document.createElement('script');
          s.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${cleanInput}'); fbq('track', 'PageView');`;
          document.head.appendChild(s);
        } else if (type === 'tt') {
          const s = document.createElement('script');
          s.text = `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${cleanInput}');ttq.page();}(window,document,'ttq');`;
          document.head.appendChild(s);
        } else if (type === 'snap') {
          const s = document.createElement('script');
          s.text = `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js'); snaptr('init', '${cleanInput}'); snaptr('track', 'PAGE_VIEW');`;
          document.head.appendChild(s);
        } else if (type === 'pin') {
          const s = document.createElement('script');
          s.text = `!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js"); pintrk('load', '${cleanInput}'); pintrk('page');`;
          document.head.appendChild(s);
        }
      }
    };

    if (google) injectPixel(google, 'ga');
    if (facebook) injectPixel(facebook, 'fb');
    if (tiktok) injectPixel(tiktok, 'tt');
    if (snapchat) injectPixel(snapchat, 'snap');
    if (pinterest) injectPixel(pinterest, 'pin');

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
});

export default TrackingPixels;
