'use client';

import { use } from 'react';
import Link from 'next/link';
import { useAdminStore } from '@/lib/store/useAdminStore';
import InlineOrderForm from '@/components/InlineOrderForm';

// Split HTML content on [CHECKOUT_FORM:productId] shortcodes
// Returns an array of segments: { type: 'html' | 'form', content: string, productId?: string }
function parseShortcodes(html: string) {
  const segments: Array<{ type: 'html' | 'form'; content: string; productId?: string }> = [];
  const regex = /\[CHECKOUT_FORM(?::([^\]]+))?\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(html)) !== null) {
    // HTML before this shortcode
    if (match.index > lastIndex) {
      segments.push({ type: 'html', content: html.slice(lastIndex, match.index) });
    }
    // The inline form
    segments.push({ type: 'form', content: match[0], productId: match[1] || '' });
    lastIndex = match.index + match[0].length;
  }

  // Remaining HTML after last shortcode
  if (lastIndex < html.length) {
    segments.push({ type: 'html', content: html.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'html' as const, content: html }];
}

export default function PromoLandingPage({ params }: { params: Promise<{ region: string, slug: string }> }) {
  const resolvedParams = use(params);
  const region = resolvedParams.region as 'dz' | 'ro' | 'co';
  const slug = resolvedParams.slug;
  
  const { landingPages, availableStores } = useAdminStore();
  const store = availableStores.find(s => s.region === region);
  const page = store ? landingPages.find(p => p.storeId === store.id && p.slug === slug) : undefined;

  if (!page || !page.published) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-slate-900 mb-4">Promo Page Not Found</h1>
        <p className="text-slate-500 mb-6">This landing page might have expired or does not exist.</p>
        <Link href={`/${region}`} className="text-indigo-600 font-bold hover:underline">Return to Store</Link>
      </div>
    );
  }

  const segments = parseShortcodes(page.htmlContent);
  const hasShortcodes = segments.some(s => s.type === 'form');

  // Simple case: no shortcodes → render as before
  if (!hasShortcodes) {
    return (
      <div className="min-h-screen bg-white" dangerouslySetInnerHTML={{ __html: page.htmlContent }} />
    );
  }

  // Mixed: render HTML segments interleaved with React checkout forms
  return (
    <div className="min-h-screen bg-white">
      {segments.map((seg, i) => {
        if (seg.type === 'form') {
          return (
            <div key={i} className="px-4 py-2">
              <InlineOrderForm productId={seg.productId || ''} region={region} />
            </div>
          );
        }
        return (
          <div key={i} dangerouslySetInnerHTML={{ __html: seg.content }} />
        );
      })}
    </div>
  );
}
