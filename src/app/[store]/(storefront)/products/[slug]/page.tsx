'use client';

import { use, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useFunnelStore } from '@/lib/store/useFunnelStore';
import { ShoppingBag, ShieldCheck, Truck, Star, AlertCircle, Loader2, PackagePlus, PackageX, X, Headset } from 'lucide-react';
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
  const findProduct = (p: any) => {
    const titleSlug = p.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return p.seo_slug === decodedSlug || p.seo_slug === slug || p.seoSlug === decodedSlug || p.seoSlug === slug || titleSlug === decodedSlug || titleSlug === slug;
  };
  const product = products.find(findProduct) || PRODUCTS.find(p => p.slug === decodedSlug || p.slug === slug);
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');
  const regionLower = region?.toLowerCase() || '';
  const isArabic = true; // Force RTL and Arabic alignment for now as requested by user

  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedCrossSells, setSelectedCrossSells] = useState<string[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  const { buyNow, addCartItem } = useFunnelStore();

  // Resolve cross-sell products from the relatedProducts field
  const crossSellProducts = useMemo(() => {
    const relatedRaw = (product as any)?.relatedProducts || (product as any)?.related_products;
    if (!relatedRaw || !products.length) return [];
    const relatedIds = relatedRaw.split(',').map((s: string) => s.trim()).filter(Boolean);
    return relatedIds
      .map((idOrTitle: string) => products.find(p => p.id === idOrTitle || p.title.toLowerCase().includes(idOrTitle.toLowerCase())))
      .filter((p: any): p is NonNullable<typeof p> => !!p && p.id !== product?.id && p.active !== false)
      .slice(0, 2); 
  }, [(product as any)?.relatedProducts, (product as any)?.related_products, products, product?.id]);

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
      const title = (product as any).seo_title || (product as any).seoTitle || product.title;
      const desc = (product as any).seo_description || (product as any).seoDescription || (product as any).short_desc || (product as any).shortDesc || (product as any).description || '';
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

  const basePrice = product ? (typeof product.price === 'number' ? product.price : (product.price as any)[region]) : 0;
  const finalPrice = (selectedVariant && selectedVariant.priceModifier > 0) ? selectedVariant.priceModifier : basePrice;

  // Auto-sync product to cart so the embedded checkout form shows the correct price/item immediately
  useEffect(() => {
    if (product && checkoutConfig?.productCheckoutType === 'inline') {
      buyNow({
        id: product.id,
        name: product.title + (selectedVariant ? ` - ${selectedVariant.label}` : ''),
        price: finalPrice,
        isUpsell: false,
        imageUrl: product.image,
        variantId: selectedVariant?.id,
        variantName: selectedVariant?.label
      });
    }
  }, [product, selectedVariant, region, buyNow, checkoutConfig, finalPrice]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
        <span className="font-bold text-lg text-slate-700">جاري تحميل المنتج...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4 text-slate-300">
          <PackageX size={64} />
        </div>
        <div className="text-2xl font-black text-slate-800 mb-2">لم يتم العثور على المنتج</div>
        <div className="text-slate-500 mb-8 max-w-md text-center">عذراً، لم نتمكن من العثور على المنتج الذي تبحث عنه. يرجى التحقق من الرابط.</div>
        
        {/* Debug info */}
        <div className="text-left bg-slate-50 p-4 rounded-xl text-sm text-slate-600 border border-slate-200 max-w-2xl w-full">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-2">معلومات التشخيص:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><span className="font-bold">الرابط المطلوب:</span> {slug}</p>
              <p><span className="font-bold">الرابط مفكك التشفير:</span> {decodedSlug}</p>
              <p><span className="font-bold">المتجر:</span> {store?.name || 'غير معروف'}</p>
            </div>
            <div>
              <p><span className="font-bold">المنتجات في قاعدة البيانات:</span> {products.length}</p>
            </div>
          </div>
          <div className="mt-2">
            <p className="font-bold text-slate-700">الروابط المتاحة:</p>
            <ul className="list-disc pl-5 mt-1 max-h-32 overflow-y-auto">
              {products.slice(0, 10).map((p: any, i) => (
                <li key={i} className="font-mono">{p.seo_slug || p.seoSlug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} <span className="text-xs text-slate-400">({p.title})</span></li>
              ))}
              {products.length > 10 && <li>... و {products.length - 10} المزيد</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const rawImages = (product as any).images || [];
  const productImages = Array.from(new Set([product.image, ...rawImages])).filter(Boolean) as string[];
  const currentImage = productImages[selectedImageIndex] || product.image;

  const storeWhatsapp = store?.whatsappConfig?.thankYouEnabled ? store.whatsappConfig.thankYouNumber : null;

  const handleWhatsApp = () => {
    const num = storeWhatsapp || '';
    if (!num) return;
    const msg = `مرحباً، أود طلب: ${product.title} ${selectedVariant ? `(${selectedVariant.label})` : ''}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleBuyNow = () => {
    if ((product as any).enableVariants && (!selectedVariant || selectedVariant.stock <= 0)) {
      alert('الرجاء اختيار خيار أولاً.');
      return;
    }

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
    
    // 3. Push to checkout or open modal
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

  const compareAt = (product as any).compare_at_price || (product as any).compareAtPrice || (product as any).originalPrice?.[region];
  const finalCompareAt = compareAt ? compareAt : null;
  const isSoldOut = (product as any).disableOutOfStockPurchases && ((product as any).stock || 0) <= 0;

  return (
    <div className="min-h-screen bg-white font-sans pb-24" dir="rtl">
      {/* Top Ticker */}
      <div className="bg-indigo-950 text-white text-center text-xs md:text-sm font-bold py-2 px-4 tracking-wide">
        ⚡ توصيل سريع — الدفع عند الاستلام ✓
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4 md:pt-8">
        
        {/* HERO IMAGE */}
        <div 
          className="relative aspect-square md:aspect-[4/3] bg-slate-100 rounded-3xl overflow-hidden mb-4 group cursor-zoom-in shadow-sm"
          onClick={() => setIsZoomed(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'}
            alt={product.title}
            className="w-full h-full object-cover object-center transition-opacity duration-300 group-hover:opacity-90"
          />
          <div className="absolute top-4 right-4 bg-amber-500 text-slate-900 text-xs font-black px-3 py-1.5 rounded-lg shadow-sm">
            🔥 الأكثر مبيعاً
          </div>
          {checkoutConfig?.fields?.scarcityConfig?.enabled && (
             <div className="absolute top-4 left-4 bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-sm">
               ⏱ عرض محدود
             </div>
          )}
        </div>
        
        {/* Image Thumbnails */}
        {productImages.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto pb-2 mb-6 hide-scrollbar">
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

        {/* TRUST STRIP */}
        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-50 border border-slate-100 rounded-2xl p-3 shadow-sm">
          <div className="flex flex-col items-center text-center gap-1.5">
            <Truck size={22} className="text-indigo-600" />
            <span className="text-[10px] md:text-xs font-bold text-slate-700 leading-tight">توصيل سريع</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1.5">
            <ShieldCheck size={22} className="text-indigo-600" />
            <span className="text-[10px] md:text-xs font-bold text-slate-700 leading-tight">أصلي 100%</span>
          </div>
          <div className="flex flex-col items-center text-center gap-1.5">
             <Headset size={22} className="text-indigo-600" />
             <span className="text-[10px] md:text-xs font-bold text-slate-700 leading-tight">دعم على مدار الساعة</span>
          </div>
        </div>

        {/* TITLE & RATING */}
        <div className="mb-6 text-center md:text-right">
          {(((product as any).stars_rate || (product as any).starsRate) > 0 || ((product as any).reviews_count || (product as any).reviewsCount) > 0) && (
            <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < Math.floor((product as any).stars_rate || (product as any).starsRate || 5) ? "fill-current" : ""} />)}
              </div>
              <span className="text-sm font-bold text-slate-600">{(product as any).stars_rate || (product as any).starsRate || 4.9} • ({(product as any).reviews_count || (product as any).reviewsCount || 128} تقييم)</span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-3 tracking-tight">
            {product.title}
          </h1>
          <p className="text-slate-500 text-base md:text-lg font-medium leading-relaxed">
            {(product as any).short_desc || (product as any).shortDesc || "اطلب اليوم وادفع عند الاستلام."}
          </p>
        </div>

        {/* PRICE BOX */}
        <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-5 mb-8 flex items-center justify-between shadow-sm">
           <div>
             <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">السعر الحالي</p>
             <div className="flex items-end gap-2">
               <span className="text-4xl font-black text-indigo-900 leading-none">{finalPrice}</span>
               <span className="text-lg font-bold text-indigo-600 pb-1">{currency}</span>
             </div>
           </div>
           {finalCompareAt && (
             <div className="text-left">
                <div className="text-slate-400 font-bold line-through mb-1 text-sm md:text-base">{finalCompareAt} {currency}</div>
                <div className="bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-sm inline-block">
                  توفير {Math.round(((finalCompareAt - finalPrice) / finalCompareAt) * 100)}%
                </div>
             </div>
           )}
        </div>

        <div className="mb-6">
          <ScarcityEngine productId={product.id} config={checkoutConfig?.fields?.scarcityConfig} />
        </div>

        {/* Variants Selector */}
        {(product as any).variants && (product as any).variants.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">اختر:</h3>
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
                <AlertCircle size={16} /> نفدت الكمية
              </div>
            )}
          </div>
        )}

        {/* Call to Action (If not using inline checkout) */}
        {checkoutConfig?.productCheckoutType !== 'inline' && (
          <div id="buy-button-section" className="mb-12">
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
              {isSoldOut || (selectedVariant && selectedVariant.stock <= 0) ? 'نفدت الكمية' : 'اطلب الآن - وادفع لاحقاً'}
            </button>
            <p className="text-center text-xs font-bold text-slate-400 mt-4 uppercase tracking-widest">
              لا حاجة لبطاقة ائتمان
            </p>
          </div>
        )}

        {/* CHECKOUT FORM INLINE */}
        {checkoutConfig?.productCheckoutType === 'inline' && (
          <div id="inline-checkout-section" className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden mb-12">
            <div className="bg-slate-50 border-b border-slate-100 p-4 text-center">
               <h2 className="text-lg font-black text-slate-800 flex items-center justify-center gap-2">
                 <ShoppingBag size={20} className="text-indigo-600"/> معلومات التوصيل
               </h2>
            </div>
            <div className="p-4 md:p-6">
              <CheckoutForm storeSlug={storeSlug} embedded={true} />
              
              {/* WHATSAPP BUTTON */}
              {storeWhatsapp && (
                <button
                   onClick={handleWhatsApp}
                   className="w-full mt-4 bg-[#25d366] hover:bg-[#1ebe5d] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
                >
                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                   الطلب عبر واتساب
                </button>
              )}
            </div>
          </div>
        )}

        {/* LONG DESCRIPTION */}
        {((product as any).main_desc || (product as any).mainDesc || (product as any).description) && (
          <div className="mb-12 max-w-4xl mx-auto prose prose-slate prose-lg text-slate-700">
            <RichHtmlContent html={(product as any).main_desc || (product as any).mainDesc || (product as any).description} region={region} storeSlug={storeSlug} />
          </div>
        )}

        {/* REVIEWS SECTION */}
        <div className="mb-12 border-t border-slate-100 pt-12">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex justify-between items-center">
            آراء العملاء
            <span className="text-sm text-amber-500 font-bold flex items-center gap-1">
              <Star size={16} className="fill-current"/> {(product as any).stars_rate || (product as any).starsRate || 4.8}
            </span>
          </h3>
          
          <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div className="flex justify-between items-start mb-2">
                 <div className="flex gap-3">
                   <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">ي.م</div>
                   <div>
                     <p className="font-bold text-slate-900 text-sm">يوسف م.</p>
                   </div>
                 </div>
                 <div className="flex text-amber-400">
                   {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-current" />)}
                 </div>
               </div>
               <p className="text-sm text-slate-600 mt-2">منتج ممتاز وتوصيل سريع. خيار الدفع عند الاستلام رائع جداً. أنصح به بشدة!</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div className="flex justify-between items-start mb-2">
                 <div className="flex gap-3">
                   <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">س.أ</div>
                   <div>
                     <p className="font-bold text-slate-900 text-sm">سارة أ.</p>
                   </div>
                 </div>
                 <div className="flex text-amber-400">
                   {[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-current" />)}
                 </div>
               </div>
               <p className="text-sm text-slate-600 mt-2">خدمة العملاء كانت متعاونة جداً على الواتساب. المنتج مطابق للوصف تماماً.</p>
             </div>
          </div>
        </div>

        {/* WHY CHOOSE US / FEATURES */}
        <div className="mb-12 border-t border-slate-100 pt-12">
          <h3 className="text-xl font-black text-slate-900 mb-6 text-center">لماذا تختارنا؟</h3>
          <div className="space-y-4">
             <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-indigo-600 mt-1"><Truck size={24} /></div>
                <div>
                  <h4 className="font-bold text-slate-900">توصيل سريع</h4>
                  <p className="text-sm text-slate-500">توصيل خلال 48-72 ساعة إلى باب منزلك.</p>
                </div>
             </div>
             <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-indigo-600 mt-1"><ShieldCheck size={24} /></div>
                <div>
                  <h4 className="font-bold text-slate-900">أصلي 100%</h4>
                  <p className="text-sm text-slate-500">نضمن جودة كل منتج.</p>
                </div>
             </div>
          </div>
        </div>

        {/* FAQ SECTION */}
        <div className="mb-12 border-t border-slate-100 pt-12">
          <h3 className="text-xl font-black text-slate-900 mb-6 text-center">الأسئلة الشائعة</h3>
          <div className="space-y-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">متى سأستلم طلبي؟</h4>
                <p className="text-sm text-slate-600">سيتم توصيل طلبك خلال 48 إلى 72 ساعة عمل من تأكيد الطلب.</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">هل يمكنني الدفع عند الاستلام؟</h4>
                <p className="text-sm text-slate-600">نعم، نحن نوفر خدمة الدفع عند الاستلام لجميع عملائنا. لا تحتاج لبطاقة ائتمان.</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">كيف يمكنني تتبع طلبي؟</h4>
                <p className="text-sm text-slate-600">سيتواصل معك فريق خدمة العملاء لتزويدك بتفاصيل التتبع وموعد وصول المندوب.</p>
             </div>
          </div>
        </div>

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

      <StickyBuyButton
        enabled={store?.stickyBuyButton?.enabled ?? true}
        onBuy={() => {
          if (checkoutConfig?.productCheckoutType === 'inline') {
            document.getElementById('inline-checkout-section')?.scrollIntoView({ behavior: 'smooth' });
          } else {
            handleBuyNow();
          }
        }}
        price={finalPrice}
        comparePrice={compareAt}
        currency={store?.currency || 'DZD'}
        buttonText={store?.stickyBuyButton?.text || 'اطلب الآن'}
        disabled={isSoldOut}
        customCss={store?.stickyBuyButton?.customCss}
      />
    </div>
  );
}
