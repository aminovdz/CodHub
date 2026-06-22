'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFunnelStore } from '@/lib/store/useFunnelStore';
import { ShoppingBag, ShieldCheck, Truck, Star, ArrowLeft, CheckCircle2, AlertCircle, Loader2, PackagePlus, X, RefreshCw, HeadphonesIcon, TrendingUp, ThumbsUp } from 'lucide-react';
import StickyBuyButton from '@/components/StickyBuyButton';
import Link from 'next/link';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { resolveStore } from '@/lib/store/useAdminStore';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';
import RichHtmlContent from '@/components/RichHtmlContent';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { ScarcityEngine } from '@/components/checkout/ScarcityEngine';

// Using same mock data here for simplicity until DB connected
const PRODUCTS = [
  {
    id: 'prod_1',
    slug: 'magnetic-posture-corrector',
    title: 'Magnetic Posture Corrector Pro',
    category: 'Health & Wellness',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    price: { dz: 3900, ro: 79, co: 65000 },
    originalPrice: { dz: 6900, ro: 129, co: 120000 },
    rating: 4.8,
    reviews: 124,
    soldCount: 1240,
    description: "Align your spine and reduce back pain instantly. Made with breathable, high-quality neoprene, this posture corrector uses magnetic therapy to relieve muscle tension. Invisible under clothing."
  },
  {
    id: 'prod_2',
    slug: 'massage-gun-elite',
    title: 'Deep Tissue Massage Gun Elite',
    category: 'Health & Wellness',
    image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&q=80&w=800',
    price: { dz: 8900, ro: 199, co: 145000 },
    originalPrice: { dz: 14900, ro: 299, co: 250000 },
    rating: 4.9,
    reviews: 89,
    soldCount: 890,
    description: "Recover faster with 30-speed high-torque vibration. Includes 6 interchangeable heads for targeted muscle relief. Ultra-quiet motor and 6-hour battery life."
  },
  {
    id: 'prod_3',
    slug: 'smart-led-strip',
    title: 'Sync RGB Smart LED Strip (5M)',
    category: 'Smart Home',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    price: { dz: 2500, ro: 49, co: 45000 },
    originalPrice: { dz: 4500, ro: 89, co: 80000 },
    rating: 4.6,
    reviews: 312,
    soldCount: 3120,
    description: "Transform any room with 16 million colors. Syncs with music and controls via smartphone app. Easy peel-and-stick installation."
  },
  {
    id: 'prod_4',
    slug: 'wireless-earbuds-x1',
    title: 'Noise Cancelling Earbuds X1',
    category: 'Tech Gadgets',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800',
    price: { dz: 4500, ro: 89, co: 85000 },
    originalPrice: { dz: 8000, ro: 149, co: 150000 },
    rating: 4.7,
    reviews: 201,
    soldCount: 2010,
    description: "Crystal clear audio with Active Noise Cancellation. 24-hour total playtime with the wireless charging case. IPX4 water resistant for workouts."
  }
];

export default function ProductPage({ params }: { params: Promise<{ store: string, slug: string }> }) {
  const resolvedParams = use(params);
  const storeSlug = resolvedParams.store;
  const slug = resolvedParams.slug;
  const router = useRouter();
  const { products, availableStores, _hasHydrated, checkoutConfigs } = useStorefrontStore();
  const store = resolveStore(availableStores, storeSlug);
  const checkoutConfig = store ? checkoutConfigs.find(c => c.storeId === store.id) : undefined;
  const region = store?.region || storeSlug;
  const { t } = useTranslation(region);
  const decodedSlug = decodeURIComponent(slug);
  const product = products.find(p => p.seoSlug === decodedSlug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === decodedSlug) || PRODUCTS.find(p => p.slug === decodedSlug);
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');
  const regionLower = region?.toLowerCase() || '';
  const isArabic = ['dz', 'sa', 'ae', 'ma', 'eg', 'ar'].includes(regionLower);

  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedCrossSells, setSelectedCrossSells] = useState<string[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const { buyNow, addCartItem } = useFunnelStore();

  const crossSellProducts = useMemo(() => {
    const relatedRaw = (product as any)?.relatedProducts;
    if (!relatedRaw || !products.length) return [];
    const relatedIds = relatedRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
    return relatedIds
      .map((idOrTitle: string) => products.find(p => p.id === idOrTitle || p.title.toLowerCase().includes(idOrTitle.toLowerCase())))
      .filter((p: any): p is NonNullable<typeof p> => !!p && p.id !== product?.id && p.active !== false)
      .slice(0, 2); 
  }, [(product as any)?.relatedProducts, products, product?.id]);

  useEffect(() => {
    if (!hasAutoSelected && product && (product as any).variants && (product as any).variants.length > 0) {
      const inStockVariants = (product as any).variants.filter((v: any) => v.stock > 0);
      if (inStockVariants.length > 0 && !selectedVariant) {
        setSelectedVariant(inStockVariants[0]);
      } else if (!selectedVariant) {
        setSelectedVariant((product as any).variants[0]);
      }
      setHasAutoSelected(true);
    }
  }, [product, hasAutoSelected]);

  useEffect(() => {
    if (product) {
      const title = (product as any).seoTitle || product.title;
      const desc = (product as any).seoDescription || (product as any).shortDesc || (product as any).description || '';
      document.title = title;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', desc);
    }
  }, [product]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-indigo-600 mr-2" size={32} />
        <span className="font-bold text-lg">Loading Product...</span>
      </div>
    );
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center font-black text-2xl text-slate-400">Product not found</div>;
  }

  const productImages = (product as any).images?.length ? (product as any).images : [product.image];
  const currentImage = productImages[selectedImageIndex] || product.image;

  const handleBuyNow = () => {
    if ((product as any).variants && (product as any).variants.length > 0 && !selectedVariant) {
      alert('Please select a variant first.');
      return;
    }

    const basePrice = typeof product.price === 'number' ? product.price : (product.price as any)[region];
    const finalPrice = (selectedVariant && selectedVariant.priceModifier > 0) ? selectedVariant.priceModifier : basePrice;

    buyNow({
      id: product.id,
      name: product.title + (selectedVariant ? ` - ${selectedVariant.label}` : ''),
      price: finalPrice,
      isUpsell: false,
      imageUrl: product.image,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.label
    });

    selectedCrossSells.forEach(csId => {
      const csProduct = products.find(p => p.id === csId);
      if (csProduct) {
        const csPrice = typeof csProduct.price === 'number' ? csProduct.price : (csProduct.price as any)[region];
        addCartItem({ id: csProduct.id, name: csProduct.title, price: csPrice, isUpsell: true, imageUrl: csProduct.image });
      }
    });
    
    if (checkoutConfig?.productCheckoutType === 'popup') {
      setIsCheckoutModalOpen(true);
    } else if (checkoutConfig?.productCheckoutType === 'inline') {
      const el = document.getElementById('inline-checkout-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
      const basePath = isCustomDomain ? '' : `/${storeSlug}`;
      router.push(`${basePath}/checkout`);
    }
  };

  const basePrice = typeof product.price === 'number' ? product.price : (product.price as any)[region];
  const finalPrice = (selectedVariant && selectedVariant.priceModifier > 0) ? selectedVariant.priceModifier : basePrice;
  const compareAt = (product as any).compareAtPrice || (product as any).originalPrice?.[region];
  const finalCompareAt = compareAt ? compareAt : null;
  const discountPercent = finalCompareAt ? Math.round(((finalCompareAt - finalPrice) / finalCompareAt) * 100) : 0;
  const isSoldOut = (product as any).disableOutOfStockPurchases && ((product as any).stock || 0) <= 0;

  const rating = (product as any).starsRate || (product as any).rating || 5.0;
  const reviewsCount = (product as any).reviewsCount || (product as any).reviews || 0;
  const soldCount = (product as any).soldCount || Math.floor(reviewsCount * 5.4);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-28" dir={isArabic ? 'rtl' : 'ltr'}>
      
      {/* TOP NOTIFICATION BANNER */}
      <div className="bg-indigo-600 text-white text-xs font-bold text-center py-2 px-4 sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md">
        <span>⚡ {t('product.topBanner', 'Flash Offer — Free shipping to all regions & Cash on Delivery')}</span>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4 md:pt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex flex-col md:flex-row gap-0">
            
            {/* LEFT: IMAGE GALLERY (Mobile First Order) */}
            <div className="w-full md:w-1/2 bg-slate-50 relative border-b md:border-b-0 md:border-r border-slate-200">
              {/* Floating Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <span className="bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1">
                  🔥 Best Seller
                </span>
                {discountPercent > 0 && (
                  <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm">
                    -{discountPercent}%
                  </span>
                )}
              </div>

              <div 
                className="aspect-square w-full relative cursor-zoom-in group"
                onClick={() => setIsZoomed(true)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'}
                  alt={product.title}
                  className="w-full h-full object-cover object-center transition-opacity duration-300 group-hover:opacity-90"
                />
              </div>
              
              {/* Thumbnails below image */}
              {productImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto p-4 bg-white">
                  {productImages.map((img: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        selectedImageIndex === i
                          ? 'border-indigo-600 ring-2 ring-indigo-100 shadow-sm'
                          : 'border-slate-200 hover:border-slate-400 opacity-70 hover:opacity-100'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: PRODUCT INFO & ACTION */}
            <div className="w-full md:w-1/2 flex flex-col p-5 md:p-8">
              
              {/* Category */}
              <div className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">
                {product.category}
              </div>
              
              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight tracking-tight mb-3">
                {product.title}
              </h1>

              {/* Social Proof Row */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {(reviewsCount > 0) && (
                  <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-900">{rating} ({reviewsCount})</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                  <TrendingUp size={14} className="text-emerald-500" />
                  <span>{soldCount} orders completed</span>
                </div>
              </div>

              {/* Pricing Block */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 flex flex-col items-start">
                {finalCompareAt && (
                   <div className="flex items-center gap-2 mb-1">
                     <span className="text-slate-400 font-bold line-through text-sm">{finalCompareAt} {currency}</span>
                     <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Save {finalCompareAt - finalPrice} {currency}</span>
                   </div>
                )}
                <div className="text-3xl md:text-4xl font-black text-slate-900 flex items-end gap-1">
                  {finalPrice} <span className="text-lg text-slate-500 font-bold mb-1">{currency}</span>
                </div>
              </div>

              {/* Scarcity / Urgency */}
              <div className="mb-6">
                <ScarcityEngine productId={product.id} config={checkoutConfig?.fields?.scarcityConfig} />
              </div>

              {/* Variants Selector */}
              {(product as any).variants && (product as any).variants.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Select Option:</h3>
                  <div className="flex flex-wrap gap-2">
                    {(product as any).variants.map((variant: any) => {
                      const isSelected = selectedVariant?.id === variant.id;
                      const isOutOfStock = variant.stock <= 0;
                      // Simple detection to see if variant is a color
                      const isColor = /color|colour|couleur/i.test(variant.label) || variant.label.match(/^(red|blue|green|black|white|yellow|pink|gray|grey)$/i);
                      
                      return (
                        <button
                          key={variant.id}
                          disabled={isOutOfStock}
                          onClick={() => setSelectedVariant(isSelected ? null : variant)}
                          style={isSelected && store?.primaryColor && !isColor ? { borderColor: store.primaryColor, backgroundColor: store.primaryColor + '10', color: store.primaryColor } : {}}
                          className={`relative px-4 py-2 rounded-full border-2 font-bold transition-all flex items-center justify-center gap-2
                            ${isSelected && !store?.primaryColor && !isColor
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                              : isSelected && store?.primaryColor && !isColor
                                ? 'shadow-sm'
                                : isOutOfStock
                                  ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                                  : isColor 
                                    ? `border-slate-300 hover:border-slate-400 ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                            }
                          `}
                        >
                          {isColor && (
                            <span 
                               className="w-4 h-4 rounded-full inline-block border border-black/10 shadow-inner" 
                               style={{ backgroundColor: variant.label.toLowerCase() }}
                            ></span>
                          )}
                          <span className="text-sm">{variant.label}</span>
                          
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-[2px] bg-slate-400 rotate-[-12deg]"></div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedVariant && selectedVariant.stock <= 0 && (
                    <div className="mt-2 flex items-center gap-1 text-rose-600 text-xs font-bold">
                      <AlertCircle size={14} /> Out of stock
                    </div>
                  )}
                </div>
              )}

              {/* Call to Action Button */}
              <div id="buy-button-section" className="mt-2 mb-6">
                <button 
                  onClick={handleBuyNow}
                  disabled={isSoldOut || (selectedVariant && selectedVariant.stock <= 0)}
                  style={(!isSoldOut && !(selectedVariant && selectedVariant.stock <= 0) && store?.primaryColor) ? { backgroundColor: store.primaryColor } : {}}
                  className={`w-full transition-all text-white font-black py-4 md:py-5 rounded-2xl flex flex-col items-center justify-center gap-1 ${
                    isSoldOut || (selectedVariant && selectedVariant.stock <= 0) 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                    : (!store?.primaryColor ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] shadow-[0_8px_30px_rgb(79,70,229,0.3)]' : 'hover:scale-[1.02] shadow-[0_8px_30px_rgba(0,0,0,0.2)]') + ' active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xl md:text-2xl">
                    <ShoppingBag size={24} />
                    {isSoldOut || (selectedVariant && selectedVariant.stock <= 0) ? t('checkout.soldOut', 'SOLD OUT') : t('checkout.orderNow', 'Order Now')}
                  </div>
                  <span className="text-xs md:text-sm font-semibold opacity-90">Pay on Delivery</span>
                </button>
              </div>

              {/* Inline Trust Bar (Small Grid) */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Truck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">Free & Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <ShieldCheck size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">100% Satisfaction</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
                    <RefreshCw size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">Easy Returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                    <HeadphonesIcon size={16} />
                  </div>
                  <span className="text-xs font-bold text-slate-600">24/7 Support</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* INLINE CHECKOUT SECTION (If enabled) */}
        {checkoutConfig?.productCheckoutType === 'inline' && (
          <div id="inline-checkout-section" className="mt-8 mb-8">
             <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-indigo-600 p-4 flex flex-col items-center justify-center text-white">
                 <h2 className="text-lg md:text-xl font-black text-center flex items-center gap-2">
                   <ShieldCheck size={24} />
                   Complete Your Order Securely
                 </h2>
                 <p className="text-indigo-200 text-xs md:text-sm font-semibold mt-1 text-center">Cash on Delivery - You will not pay until you receive the order.</p>
               </div>
               <div className="p-4 md:p-6 bg-slate-50/50">
                 <CheckoutForm storeSlug={storeSlug} embedded={true} />
               </div>
             </div>
          </div>
        )}

        {/* DESCRIPTION & FEATURES SECTION */}
        <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-8">
          <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
            <ThumbsUp className="text-indigo-600" />
            Product Details
          </h2>
          
          {((product as any).mainDesc || (product as any).description) && (
            <div className="prose prose-slate prose-lg max-w-none text-slate-700">
              <RichHtmlContent html={(product as any).mainDesc || (product as any).description} region={region} storeSlug={storeSlug} />
            </div>
          )}

          {(product as any).blocks && (product as any).blocks.length > 0 && (
            <div className="space-y-10 mt-10">
              {(product as any).blocks.map((block: any) => {
                if (block.type === 'features') {
                  return (
                    <div key={block.id} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(block.features || []).map((f: any, i: number) => (
                        <div key={i} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-start gap-4">
                          <div className="bg-white shadow-sm p-2 rounded-xl text-indigo-600 shrink-0">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 mb-1">{f.title}</h3>
                            <p className="text-sm font-medium text-slate-500">{f.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }
                if (block.type === 'text') {
                  return (
                    <div key={block.id} className="text-center px-4 bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                      <p className="text-base md:text-lg text-indigo-900 font-bold leading-relaxed">
                        {block.content}
                      </p>
                    </div>
                  );
                }
                if (block.type === 'html') {
                  return (
                    <RichHtmlContent key={block.id} html={block.content} region={region} storeSlug={storeSlug} />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* CUSTOMER REVIEWS SECTION */}
        <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-200 p-5 md:p-8 overflow-hidden">
          <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-wider flex items-center gap-2">
            <Star className="text-amber-400 fill-amber-400" />
            Customer Reviews
          </h2>
          
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            {/* Summary */}
            <div className="md:w-1/3 flex flex-col items-center justify-center bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <div className="text-5xl font-black text-slate-900 mb-2">{rating.toFixed(1)}</div>
              <div className="flex text-amber-400 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} className={i < Math.floor(rating) ? "fill-current" : ""} />
                ))}
              </div>
              <p className="text-sm font-bold text-slate-500">Based on {reviewsCount} reviews</p>
            </div>
            
            {/* Progress Bars */}
            <div className="md:w-2/3 flex flex-col justify-center space-y-2">
              {[
                { stars: 5, pct: 78 },
                { stars: 4, pct: 15 },
                { stars: 3, pct: 5 },
                { stars: 2, pct: 1 },
                { stars: 1, pct: 1 }
              ].map(row => (
                <div key={row.stars} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <span className="w-12 text-right">{row.stars} Stars</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${row.pct}%` }}></div>
                  </div>
                  <span className="w-8 text-slate-400 text-xs">{row.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review Cards (Mock) */}
          <div className="space-y-4">
            {[
              { name: 'Amine K.', city: 'Algiers', review: 'Excellent quality, exactly as described. Delivery was fast within 24 hours.', initials: 'AK', color: 'bg-indigo-100 text-indigo-700' },
              { name: 'Sarah M.', city: 'Oran', review: 'Very satisfied with the product. Will definitely buy again from this store.', initials: 'SM', color: 'bg-emerald-100 text-emerald-700' },
              { name: 'Karim D.', city: 'Constantine', review: 'Customer service was very helpful when I had a question. The item is perfect.', initials: 'KD', color: 'bg-rose-100 text-rose-700' }
            ].map((rv, i) => (
              <div key={i} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3 items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${rv.color}`}>
                      {rv.initials}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                        {rv.name} <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                      <div className="text-xs text-slate-500 font-medium">{rv.city}</div>
                    </div>
                  </div>
                  <div className="flex text-amber-400">
                    <Star size={14} className="fill-current" />
                    <Star size={14} className="fill-current" />
                    <Star size={14} className="fill-current" />
                    <Star size={14} className="fill-current" />
                    <Star size={14} className="fill-current" />
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-700">{rv.review}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-24"></div> {/* Spacer to prevent sticky button overlap */}

      {/* Image Zoom Lightbox */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <img
            src={currentImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'}
            alt={product.title}
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
          <button className="absolute top-6 right-6 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={32} />
          </button>
        </div>
      )}

      {/* Popup Checkout Modal */}
      {checkoutConfig?.productCheckoutType === 'popup' && isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-in zoom-in-95 duration-200">
             <button onClick={() => setIsCheckoutModalOpen(false)} className="absolute top-4 right-4 z-50 bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-full transition-colors shadow-sm">
               <X size={24} />
             </button>
             <div className="p-1 sm:p-2 mt-8">
               <CheckoutForm storeSlug={storeSlug} embedded={true} />
             </div>
           </div>
        </div>
      )}

      {/* STICKY MOBILE BUY BUTTON */}
      <StickyBuyButton
        enabled={store?.stickyBuyButton?.enabled ?? true}
        onBuy={handleBuyNow}
        price={finalPrice}
        comparePrice={compareAt}
        currency={store?.currency || 'DZD'}
        buttonText={store?.stickyBuyButton?.text || 'Order Now'}
        disabled={isSoldOut}
        customCss={store?.stickyBuyButton?.customCss}
      />
    </div>
  );
}
