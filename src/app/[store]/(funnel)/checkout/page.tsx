'use client';

import { use } from 'react';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';

export default function CheckoutPage({ params }: { params: Promise<{ store: string }> }) {
  const resolvedParams = use(params);
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <CheckoutForm storeSlug={resolvedParams.store} />
    </div>
  );
}
