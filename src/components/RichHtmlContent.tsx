'use client';

import { useMemo } from 'react';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { AutoResizingIframe } from './AutoResizingIframe';
import { useRouter } from 'next/navigation';

interface Props {
  html: string;
  region: string;
  storeSlug: string;
  utmSource?: string;
  utmCampaign?: string;
}

type Segment =
  | { type: 'html'; content: string }
  | { type: 'checkout'; productId: string };

/**
 * Splits raw HTML at [CHECKOUT_FORM:xxx] shortcodes and renders
 * React <CheckoutForm> components directly inline.
 *
 * No portals, no setTimeout, no DOM lookups — just synchronous
 * string splitting + React rendering in a single pass.
 */
export default function RichHtmlContent({ html, region, storeSlug, utmSource, utmCampaign }: Props) {
  const router = useRouter();
  
  const segments: Segment[] = useMemo(() => {
    if (!html) return [];



    // Match all possible encodings of the shortcode:
    //   [CHECKOUT_FORM:uuid]       — raw
    //   &#91;CHECKOUT_FORM:uuid&#93;  — HTML entity encoded
    //   %5BCHECKOUT_FORM:uuid%5D   — URL encoded
    //   [product_checkout id="uuid"] — legacy syntax
    const SHORTCODE_RE =
      /(?:\[|&#91;|%5B)(?:product_checkout\s+id="([^"]+)"|CHECKOUT_FORM(?:\s*:\s*([a-zA-Z0-9._-]+))?)(?:\]|&#93;|%5D)/g;

    const result: Segment[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = SHORTCODE_RE.exec(html)) !== null) {
      // Push the HTML before this shortcode
      if (match.index > lastIndex) {
        result.push({ type: 'html', content: html.slice(lastIndex, match.index) });
      }

      // Push the checkout form segment
      const productId = match[1] || match[2] || '';
      result.push({ type: 'checkout', productId });

      lastIndex = match.index + match[0].length;
    }

    // Push any remaining HTML after the last shortcode
    if (lastIndex < html.length) {
      result.push({ type: 'html', content: html.slice(lastIndex) });
    }

    // If no shortcodes were found, return the whole thing as one HTML segment
    if (result.length === 0) {
      result.push({ type: 'html', content: html });
    }



    return result;
  }, [html]);


  return (
    <div className="w-full">
      {segments.map((seg, i) => {
        if (seg.type === 'checkout') {
          return (
            <div key={`checkout-${i}`} id="checkout" className="w-full max-w-2xl mx-auto px-4 py-8 relative z-10">
              <CheckoutForm
                storeSlug={storeSlug}
                embedded={true}
                forceProductId={seg.productId}
              />
            </div>
          );
        }

        // HTML segment — render with AutoResizingIframe to guarantee exact styling as preview
        return (
          <div key={`html-${i}`} className="w-full">
            <AutoResizingIframe html={seg.content} onCheckout={() => {
              const basePath = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost') ? '' : `/${storeSlug}`;
              router.push(`${basePath}/checkout`);
            }} />
          </div>
        );
      })}
    </div>
  );
}
