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
  const hasShortcodes = /\[CHECKOUT_FORM/.test(cleanHtml);
  
  const processedHtml = cleanHtml.replace(
    /\[CHECKOUT_FORM(?::([^\]]+))?\]/g, 
    (match, productId, offset) => `<div id="checkout-mount-${offset}" class="checkout-mount-point" data-product-id="${productId || ''}"></div>`
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [mountNodes, setMountNodes] = useState<Array<{ id: string, node: HTMLElement, productId: string }>>([]);

  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html dir="${isArabic ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: white; }
          /* Hide scrollbar for a seamless look */
          ::-webkit-scrollbar { width: 0px; background: transparent; }
        </style>
      </head>
      <body>
        ${processedHtml}
      </body>
    </html>
  `;

  useEffect(() => {
    if (!page) return;

    const handleLoad = () => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      
      if (hasShortcodes) {
        const nodes = Array.from(doc.querySelectorAll('.checkout-mount-point')).map(el => ({
          id: el.id,
          node: el as HTMLElement,
          productId: el.getAttribute('data-product-id') || ''
        }));
        setMountNodes(nodes);
      }
      setIframeLoaded(true);
      
      // Auto-resize iframe to fit content
      const resizeIframe = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const body = iframeRef.current.contentWindow.document.body;
          const html = iframeRef.current.contentWindow.document.documentElement;
          const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
          iframeRef.current.style.height = height + 'px';
        }
      };
      
      resizeIframe();
      const interval = setInterval(resizeIframe, 500); // Check periodically for dynamic content height changes
      
      return () => clearInterval(interval);
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleLoad);
      // If it's already loaded
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        handleLoad();
      }
    }
    
    return () => {
      if (iframe) iframe.removeEventListener('load', handleLoad);
    };
  }, [processedHtml, hasShortcodes, page]);

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


  return (
    <div className="w-full min-h-screen bg-white">
      <iframe 
        ref={iframeRef}
        srcDoc={iframeSrcDoc}
        className="w-full border-none block"
        style={{ minHeight: '100vh', overflow: 'hidden' }}
        scrolling="no"
        title={page.title}
      />
      
      {/* Portal the React checkout forms into the iframe's mount points */}
      {iframeLoaded && mountNodes.map(({ id, node, productId }) => 
        createPortal(
          <div key={id} className="px-4 py-8 w-full max-w-lg mx-auto">
            <InlineOrderForm productId={productId} region={region} />
          </div>,
          node
        )
      )}
    </div>
  );
}
