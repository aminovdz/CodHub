'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFunnelStore } from '@/lib/store/useFunnelStore';
import { ShoppingBag, ShieldCheck, Truck, Star, ArrowLeft, CheckCircle2, AlertCircle, Loader2, PackagePlus, X } from 'lucide-react';
import StickyBuyButton from '@/components/StickyBuyButton';
import Link from 'next/link';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';

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
    description: "Crystal clear audio with Active Noise Cancellation. 24-hour total playtime with the wireless charging case. IPX4 water resistant for workouts."
  }
];

export default function ProductPage({ params }: { params: Promise<{ region: string, slug: string }> }) {
  const resolvedParams = use(params);
  const region = resolvedParams.region;
  const slug = resolvedParams.slug;
  const router = useRouter();
  const { t } = useTranslation(region);
  // Currency will be initialized after store is fetched
  
  const { products, availableStores, _hasHydrated } = useAdminStore();
  const store = resolveStore(availableStores, region);
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

  const { buyNow, addCartItem } = useFunnelStore();

  // Resolve cross-sell products from the relatedProducts field
  const crossSellProducts = useMemo(() => {
    const relatedRaw = (product as any)?.relatedProducts;
    if (!relatedRaw || !products.length) return [];
    // relatedProducts is a comma-separated string of product IDs or titles
    const relatedIds = relatedRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
    return relatedIds
      .map((idOrTitle: string) => products.find(p => p.id === idOrTitle || p.title.toLowerCase().includes(idOrTitle.toLowerCase())))
      .filter((p: any): p is NonNullable<typeof p> => !!p && p.id !== product?.id && p.active !== false)
      .slice(0, 2); // Show max 2 cross-sells
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

    // 1. Overwrite cart with just this item
    buyNow({
      id: product.id,
      name: product.title + (selectedVariant ? ` - ${selectedVariant.label}` : ''),
      price: finalPrice,
      isUpsell: false,
      imageUrl: product.image,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.label
    });

    // 2. Add any selected cross-sell items
    selectedCrossSells.forEach(csId => {
      const csProduct = products.find(p => p.id === csId);
      if (csProduct) {
        const csPrice = typeof csProduct.price === 'number' ? csProduct.price : (csProduct.price as any)[region];
        addCartItem({ id: csProduct.id, name: csProduct.title, price: csPrice, isUpsell: true, imageUrl: csProduct.image });
      }
    });
    
    // 3. Push to checkout
    router.push(`/${region}/checkout`);
  };

  const basePrice = typeof product.price === 'number' ? product.price : (product.price as any)[region];
  const finalPrice = (selectedVariant && selectedVariant.priceModifier > 0) ? selectedVariant.priceModifier : basePrice;
  const compareAt = (product as any).compareAtPrice || (product as any).originalPrice?.[region];
  const finalCompareAt = compareAt ? compareAt : null;

  const isSoldOut = (product as any).disableOutOfStockPurchases && ((product as any).stock || 0) <= 0;

  return (
    <div className="min-h-screen bg-white font-sans pb-24" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto px-4 pt-8 md:pt-12">
        <div className="flex flex-col md:flex-row gap-10 lg:gap-16">
          
          {/* IMAGE GALLERY */}
          <div className="w-full md:w-1/2">
            <div 
              className="aspect-[4/5] bg-slate-100 rounded-3xl overflow-hidden relative mb-3 cursor-zoom-in group"
              onClick={() => setIsZoomed(true)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'}
                alt={product.title}
                className="w-full h-full object-cover object-center transition-opacity duration-300 group-hover:opacity-90"
              />
            </div>
            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {productImages.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImageIndex(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedImageIndex === i
                        ? 'border-indigo-600 ring-1 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`${product.title} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* PRODUCT INFO */}
          <div className="w-full md:w-1/2 flex flex-col pt-4 md:pt-10">
            
            <div className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-3">
              {product.category}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4 tracking-tight">
              {product.title}
            </h1>

            {/* Ratings */}
            {(((product as any).starsRate && (product as any).starsRate > 0) || ((product as any).reviewsCount && (product as any).reviewsCount > 0)) && (
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} className={i < Math.floor((product as any).starsRate || 5) ? "fill-current" : ""} />
                  ))}
                </div>
                <div className="text-sm font-bold text-slate-500 underline cursor-pointer hover:text-slate-700">
                  {(product as any).reviewsCount || 0} {t('product.reviews', 'reviews')}
                </div>
              </div>
            )}

            {/* Pricing block */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6">
              <div className="flex items-end gap-3 mb-2">
                <div className="text-4xl font-black text-slate-900">
                  {finalPrice} <span className="text-xl text-slate-500 font-bold">{currency}</span>
                </div>
                {finalCompareAt && (
                  <div className="text-xl font-bold text-slate-400 line-through pb-1">
                    {finalCompareAt} {currency}
                  </div>
                )}
              </div>
              {finalCompareAt && (
                <div className="text-emerald-600 font-bold text-sm bg-emerald-100/50 inline-block px-3 py-1 rounded-full">
                  {t('product.save', 'Save')} {finalCompareAt - finalPrice} {currency}
                </div>
              )}
            </div>

            {/* Variants Selector */}
            {(product as any).variants && (product as any).variants.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Select Option:</h3>
                <div className="flex flex-wrap gap-3">
                  {(product as any).variants.map((variant: any) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const isOutOfStock = variant.stock <= 0;
                    return (
                      <button
                        key={variant.id}
                        disabled={isOutOfStock}
                        onClick={() => setSelectedVariant(isSelected ? null : variant)}
                        style={isSelected && store?.primaryColor ? { borderColor: store.primaryColor, backgroundColor: store.primaryColor + '10', color: store.primaryColor } : {}}
                        className={`relative overflow-hidden px-5 py-3 rounded-xl border-2 font-bold transition-all flex flex-col items-start
                          ${isSelected && !store?.primaryColor
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]' 
                            : isSelected && store?.primaryColor
                              ? 'shadow-[0_0_0_4px_rgba(0,0,0,0.05)]'
                              : isOutOfStock
                                ? 'border-slate-200 bg-slate-50 text-slate-400 opacity-60 cursor-not-allowed'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }
                        `}
                      >
                        <span className="text-sm">{variant.label}</span>
                        {variant.priceModifier > 0 && variant.priceModifier !== basePrice && (
                           <span className={`text-xs font-black ${isSelected ? '' : 'text-indigo-600'}`}>
                             {variant.priceModifier} {currency}
                           </span>
                        )}
                        
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
                  <div className="mt-3 flex items-center gap-2 text-rose-600 text-sm font-bold">
                    <AlertCircle size={16} /> Out of stock
                  </div>
                )}
              </div>
            )}

            {/* Short Description */}
            {(product as any).shortDesc && (
              <div className="text-slate-600 text-lg leading-relaxed font-medium mb-8">
                {(product as any).shortDesc}
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Truck size={20} />
                </div>
                <span className="font-bold text-sm leading-tight">{t('product.payOnDelivery', 'Pay on Delivery')}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <ShieldCheck size={20} />
                </div>
                <span className="font-bold text-sm leading-tight">{t('checkout.secureText', '100% Secure Checkout')}</span>
              </div>
            </div>

            {/* Call to Action */}
            <div id="buy-button-section" className="mt-auto">
              <button 
                onClick={handleBuyNow}
                disabled={isSoldOut || (selectedVariant && selectedVariant.stock <= 0)}
                style={(!isSoldOut && !(selectedVariant && selectedVariant.stock <= 0) && store?.primaryColor) ? { backgroundColor: store.primaryColor } : {}}
                className={`w-full transition-all text-white font-black text-xl py-5 rounded-2xl flex items-center justify-center gap-3 ${
                  isSoldOut || (selectedVariant && selectedVariant.stock <= 0) 
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                  : (!store?.primaryColor ? 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_8px_30px_rgb(79,70,229,0.3)]' : 'hover:opacity-90 shadow-[0_8px_30px_rgba(0,0,0,0.2)]') + ' active:scale-[0.98]'
                }`}
              >
                <ShoppingBag size={24} />
                {isSoldOut || (selectedVariant && selectedVariant.stock <= 0) ? t('checkout.soldOut', 'SOLD OUT') : t('checkout.orderNow', 'Order Now - Pay Later')}
              </button>
              <p className="text-center text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">
                {t('product.noCreditCard', 'NO CREDIT CARD NEEDED')}
              </p>
            </div>

            {/* Frequently Bought Together */}
            {crossSellProducts.length > 0 && (
              <div className="mt-8 border-t border-slate-100 pt-8">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-wider mb-4">
                  <PackagePlus size={16} className="text-indigo-600" />
                  Frequently Bought Together
                </h3>
                <div className="space-y-3">
                  {crossSellProducts.map((cs: any) => {
                    const csPrice = typeof cs.price === 'number' ? cs.price : cs.price[region];
                    const isSelected = selectedCrossSells.includes(cs.id);
                    return (
                      <label
                        key={cs.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            setSelectedCrossSells(prev =>
                              e.target.checked ? [...prev, cs.id] : prev.filter(id => id !== cs.id)
                            );
                          }}
                          className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        />
                        {cs.image && (
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={cs.image} alt={cs.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{cs.title}</p>
                          <p className="text-xs text-slate-500">Add for <span className="font-black text-indigo-600">{csPrice} {currency}</span></p>
                        </div>
                        {isSelected && <CheckCircle2 size={18} className="text-indigo-600 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <StickyBuyButton
              enabled={store?.stickyBuyButton?.enabled ?? false}
              onBuy={handleBuyNow}
              price={finalPrice}
              comparePrice={compareAt}
              currency={store?.currency || 'DZD'}
              buttonText={store?.stickyBuyButton?.text || 'Order Now'}
              disabled={isSoldOut}
              customCss={store?.stickyBuyButton?.customCss}
            />
          </div>
        </div>
      </div>

      {/* RENDER LONG DESCRIPTION & MODULAR BLOCKS */}
      <div className="max-w-6xl mx-auto px-4 mt-16 space-y-12">
        {/* Main Description */}
        {((product as any).mainDesc || (product as any).description) && (
          <div className="max-w-4xl mx-auto prose prose-slate prose-lg text-slate-700">
            <div dangerouslySetInnerHTML={{ __html: (product as any).mainDesc || (product as any).description }} />
          </div>
        )}

        {(product as any).blocks && (product as any).blocks.length > 0 && (
          <div className="space-y-10">
            {(product as any).blocks.map((block: any) => {
              if (block.type === 'features') {
                return (
                  <div key={block.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(block.features || []).map((f: any, i: number) => (
                      <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                        <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 shrink-0">
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 mb-1">{f.title}</h3>
                          <p className="text-sm font-medium text-slate-500">{f.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
              if (block.type === 'text') {
                return (
                  <div key={block.id} className="max-w-3xl mx-auto text-center px-4">
                    <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed">
                      {block.content}
                    </p>
                  </div>
                );
              }
              if (block.type === 'html') {
                return (
                  <div key={block.id} className="w-full" dangerouslySetInnerHTML={{ __html: block.content }} />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
      <div className="h-32"></div> {/* Spacer to prevent sticky button overlap */}

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
    </div>
  );
}
