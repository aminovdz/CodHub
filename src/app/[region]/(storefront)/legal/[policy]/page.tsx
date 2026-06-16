'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';

// Mocks removed

export default function LegalPage({ params }: { params: Promise<{ region: string, policy: string }> }) {
  const resolvedParams = use(params);
  const region = resolvedParams.region as 'dz' | 'ro' | 'co';
  const policySlug = resolvedParams.policy;

  const { legalPages, availableStores } = useAdminStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const store = resolveStore(availableStores, region);
  const currentPolicy = store ? legalPages.find(p => p.storeId === store.id && p.slug.trim().toLowerCase() === policySlug.trim().toLowerCase()) : undefined;

  if (!isMounted) return null;

  if (!currentPolicy) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-black text-slate-900 mb-4">Policy Not Found</h1>
        {(() => {
          const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
          const basePath = isCustomDomain ? '/' : `/${region}`;
          return <Link href={basePath} className="text-indigo-600 font-bold hover:underline">Return to Store</Link>;
        })()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-12">
        <div 
          className="prose prose-slate prose-indigo max-w-none prose-h1:text-3xl prose-h1:md:text-4xl prose-h1:font-black prose-h1:text-slate-900 prose-h1:mb-8 prose-h1:border-b prose-h1:border-slate-100 prose-h1:pb-6 prose-h2:font-black prose-h2:mt-8 prose-p:font-medium prose-p:text-slate-600"
          dangerouslySetInnerHTML={{ __html: currentPolicy.htmlContent }}
        />
      </div>
    </div>
  );
}
