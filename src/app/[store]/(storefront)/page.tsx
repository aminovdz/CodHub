'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Star, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { resolveStore } from '@/lib/store/useAdminStore';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';
import RichHtmlContent from '@/components/RichHtmlContent';
import { useTranslation } from '@/lib/hooks/useTranslation';

export default function StorefrontPage({ params }: { params: Promise<{ store: string }> }) {
  const resolvedParams = use(params);
  const storeSlug = resolvedParams.store;
  // Currency will be initialized after store is fetched
  
  const { availableStores, homepages, products, categories } = useStorefrontStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const { t } = useTranslation(region);
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');
  const homepageConfig = store ? homepages.find(h => h.storeId === store.id) : undefined;
  
  const [isMounted, setIsMounted] = useState(false);
  const [isSubdomain, setIsSubdomain] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    setIsSubdomain(window.location.hostname.startsWith(`${storeSlug.toLowerCase()}.`));
  }, [storeSlug]);

  const basePath = isSubdomain ? '' : `/${storeSlug}`;

  if (!isMounted) return <div className="min-h-screen bg-slate-50" />;

  // Default to something visually appealing if no blocks
  const defaultBlocks = [
    { id: 'b_hero', type: 'hero' as const, content: JSON.stringify({title: t('hero.title', 'منتجات متميزة. الدفع عند الاستلام.'), subtitle: t('hero.subtitle', 'لا حاجة لبطاقة ائتمان. افحص طلبك قبل الدفع.')}) },
    { id: 'b_grid', type: 'product_grid' as const, content: '', productIds: [] }
  ];

  const blocks = homepageConfig?.blocks?.length ? homepageConfig.blocks : defaultBlocks;
  const storeProducts = products.filter(p => !store || p.storeId === store.id);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24" dir="rtl">
      {blocks.map(block => {
        
        if (block.type === 'hero') {
          let data = { title: '', subtitle: '' };
          try { data = JSON.parse(block.content); } catch (e) {}
          return (
            <div key={block.id} className="bg-indigo-950 text-white py-16 px-4 mb-12">
              <div className="max-w-6xl mx-auto text-center md:text-right md:flex items-center justify-between">
                <div className="md:w-1/2">
                  <div className="inline-block bg-indigo-500/30 text-indigo-200 font-bold px-3 py-1 rounded-full text-sm mb-4 border border-indigo-400/30">
                    ⚡ {t('hero.flashDelivery', 'توصيل سريع متاح')}
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight tracking-tight">
                    {data.title || 'منتجات متميزة. الدفع عند الاستلام.'}
                  </h1>
                  <p className="text-indigo-200 text-lg md:text-xl font-medium max-w-md mx-auto md:mx-0">
                    {data.subtitle || 'لا حاجة لبطاقة ائتمان. افحص طلبك قبل الدفع.'}
                  </p>
                </div>
              </div>
            </div>
          );
        }

        if (block.type === 'product_grid') {
          // If no specific productIds selected, show all active products for this store
          const gridProducts = block.productIds && block.productIds.length > 0 
            ? storeProducts.filter(p => (block.productIds as string[]).includes(p.id) && p.active !== false)
            : storeProducts.filter(p => p.active !== false);

          return (
            <div key={block.id} className="max-w-6xl mx-auto px-4 mb-12">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-2xl font-black text-slate-900">{t('store.trending', 'رائج الآن')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {gridProducts.map(product => {
                  const priceToDisplay = typeof product.price === 'number' ? product.price : (product.price as any)[region];
                  const slug = (product as any).seo_slug || (product as any).seoSlug || product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return (
                    <Link key={product.id} href={`${basePath}/products/${slug}`} className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:border-indigo-300 transition-all duration-300 flex flex-col">
                      <div className="aspect-[4/5] bg-slate-100 relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={product.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'} 
                          alt={product.title} 
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-slate-800">{(product as any).stars_rate || (product as any).starsRate || 4.9}</span>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-grow">
                        <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
                          {product.category || 'منتج'}
                        </div>
                        <h3 className="font-bold text-slate-900 leading-snug mb-3 flex-grow line-clamp-2">
                          {product.title}
                        </h3>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="font-black text-xl text-slate-900 flex items-center gap-1 flex-row-reverse">
                            <span className="text-sm font-bold text-slate-400">{currency}</span> {priceToDisplay}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center text-slate-400 transition-colors">
                            <ChevronRight size={20} className="rotate-180" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {gridProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-500 font-medium bg-white rounded-2xl border border-slate-200">
                    {t('store.noProducts', 'لا توجد منتجات متاحة في الوقت الحالي.')}
                  </div>
                )}
              </div>
            </div>
          );
        }

        if (block.type === 'category_grid') {
          const catsToShow = block.categoryIds && block.categoryIds.length > 0 ? block.categoryIds : categories;
          return (
            <div key={block.id} className="max-w-6xl mx-auto px-4 mb-12">
              <div className="flex overflow-x-auto pb-4 hide-scrollbar gap-3">
                <button className="whitespace-nowrap px-6 py-2.5 bg-slate-900 text-white font-bold rounded-full text-sm transition-colors shadow-lg">
                  {t('store.allProducts', 'جميع المنتجات')}
                </button>
                {catsToShow.map((cat, i) => (
                  <button key={i} className="whitespace-nowrap px-6 py-2.5 bg-white text-slate-600 hover:bg-slate-200 font-bold rounded-full text-sm transition-colors border border-slate-200 shadow-sm">
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === 'features') {
          return (
            <div key={block.id} className="max-w-6xl mx-auto px-4 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(block.features || []).map((f, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 mb-1">{f.title}</h3>
                      <p className="text-sm font-medium text-slate-500">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === 'text') {
          return (
            <div key={block.id} className="max-w-4xl mx-auto px-4 mb-12 text-center">
              <p className="text-lg md:text-xl font-medium text-slate-600 leading-relaxed">
                {block.content}
              </p>
            </div>
          );
        }

        if (block.type === 'html') {
          return (
            <div key={block.id} className="w-full mb-12">
              <RichHtmlContent html={block.content} region={region} storeSlug={storeSlug} />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
