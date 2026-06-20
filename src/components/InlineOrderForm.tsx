'use client';

import { useState, memo } from 'react';
import { useFunnelStore } from '@/lib/store/useFunnelStore';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import { ShoppingBag, CheckCircle2, ChevronRight, Phone, User, MapPin, BadgeCheck, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { submitOrder } from '@/lib/actions/funnelActions';

const ALGERIA_WILAYAS = [
  "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
  "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
  "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara",
  "Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf",
  "Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent",
  "Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès","In Salah",
  "In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa"
];

import { useTranslation } from '@/lib/hooks/useTranslation';

interface Props {
  productId: string;
  region: string;
  utmSource?: string;
  utmCampaign?: string;
}

export default memo(function InlineOrderForm({ productId, region, utmSource, utmCampaign }: Props) {
  const router = useRouter();
  const { t } = useTranslation(region);
  const { products, shippingZones, availableStores, setOrders } = useAdminStore();
  const { setLead, addCartItem, setAddressData, setDraftOrderId, setStatus } = useFunnelStore();

  const store = resolveStore(availableStores, region);
  const product = products.find(p => p.id === productId);
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');
  const zones = store ? shippingZones.filter(z => z.storeId === store.id) : [];
  const uniqueWilayas = Array.from(new Set(zones.map(z => z.wilaya)));

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [qty, setQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!product) {
    return (
      <div className="max-w-lg mx-auto my-8 p-6 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700 font-bold">
        Product not found. Please check the product ID in your landing page shortcode.
      </div>
    );
  }

  const deliveryZone = zones.find(z => z.wilaya === wilaya && (!z.commune || z.commune.trim() === ''))
    || zones.find(z => z.wilaya === wilaya);
  const deliveryRate = deliveryZone?.deliveryRate || 0;
  const total = (product.price * qty) + deliveryRate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const orderId = `ORD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const prefix = region === 'dz' ? '+213' : region === 'ro' ? '+40' : '+57';
    const fullPhone = phone.startsWith('+') ? phone : `${prefix}${phone.replace(/^0/, '')}`;

    // Set funnel store state
    setLead(name, fullPhone);
    setDraftOrderId(orderId);
    addCartItem({ id: product.id, name: product.title, price: product.price, isUpsell: false });
    if (wilaya) setAddressData({ wilaya, commune: '', detailedAddress: '' });

    try {
      await submitOrder(orderId, region, {
        customerName: name,
        phone: fullPhone,
        address: { wilaya, commune: '', detailedAddress: '' },
        instructions: '',
        cart: [{ id: product.id, name: product.title, price: product.price * qty, isUpsell: false }],
        total: total,
        deliveryRate: deliveryRate,
        source: utmSource || undefined,
        utmCampaign: utmCampaign || undefined,
      });
    } catch {
      // Non-blocking — order is logged client-side even if server action fails
    }

    // Save to admin store
    setOrders((prev: any[]) => [{
      id: orderId,
      storeId: store?.id,
      customer: name,
      phone: fullPhone,
      address: wilaya,
      wilaya,
      commune: '',
      product: `${product.title} (x${qty})`,
      total: total,
      deliveryRate,
      status: 'PENDING_AGENT_CONFIRMATION',
      date: new Date().toISOString(),
      source: 'landing-page',
    }, ...prev]);

    // Track conversion for A/B testing
    try {
      if (typeof window !== 'undefined') {
        // Extract the slug from the URL: e.g. /my-store/promo/my-slug
        const pathParts = window.location.pathname.split('/');
        const promoIndex = pathParts.indexOf('promo');
        if (promoIndex !== -1 && pathParts.length > promoIndex + 1) {
          const slug = pathParts[promoIndex + 1];
          const variantId = localStorage.getItem(`ab_variant_${slug}`);
          if (variantId && store) {
            fetch('/api/tracking', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'Landing Page Conversion', variantId, storeId: store.id })
            }).catch(console.error);
          }
        }
      }
    } catch (e) {
      console.error('Tracking conversion failed', e);
    }

    setStatus('SUCCESS');
    setSubmitting(false);
    setDone(true);
    const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
    const basePath = isCustomDomain ? '' : `/${region}`;
    setTimeout(() => router.push(`${basePath}/thank-you`), 1200);
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto my-8 p-8 bg-emerald-50 border border-emerald-200 rounded-3xl text-center">
        <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
        <h3 className="text-2xl font-black text-slate-900 mb-2">{t('thankyou.orderConfirmed', 'Order Confirmed!')}</h3>
        <p className="text-slate-600 font-medium">{t('thankyou.orderProcessed', 'Your order is now being processed.')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto my-8">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Product summary bar */}
        <div className="bg-indigo-600 p-5 text-white flex items-center gap-4">
          {product.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt={product.title} className="w-16 h-16 object-cover rounded-xl shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-0.5">{t('checkout.includes', 'Your Order')}</div>
            <div className="font-black text-lg leading-tight truncate flex items-center gap-1.5">{product.title} <BadgeCheck size={18} className="text-emerald-400 shrink-0" /></div>
            <div className="text-indigo-200 text-sm font-bold mt-0.5">
              {product.compareAtPrice && (
                <span className="line-through mr-2 opacity-60">{product.compareAtPrice} {currency}</span>
              )}
              {product.price} {currency}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('form.fullName', 'Full Name')}</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('form.phone', 'Phone Number')}</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="05XX XX XX XX"
                className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Wilaya */}
          {region === 'dz' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('checkout.wilaya', 'Wilaya')}</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  required
                  value={wilaya}
                  onChange={e => setWilaya(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-900 bg-white appearance-none"
                >
                  <option value="">Select your Wilaya</option>
                  {(uniqueWilayas.length > 0 ? uniqueWilayas : ALGERIA_WILAYAS).map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('checkout.items', 'Quantity')}</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 font-black text-xl transition-colors">-</button>
              <span className="text-xl font-black text-slate-900 w-8 text-center">{qty}</span>
              <button type="button" onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 font-black text-xl transition-colors">+</button>
              <span className="text-sm text-slate-500 font-bold ml-2">× {product.price} {currency}</span>
            </div>
          </div>

          {/* Total */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div className="flex justify-between text-sm font-bold text-slate-500 mb-1">
              <span>{t('checkout.subtotal', 'Subtotal')}</span>
              <span>{product.price * qty} {currency}</span>
            </div>
            {deliveryRate > 0 && (
              <div className="flex justify-between text-sm font-bold text-slate-500 mb-1">
                <span>{t('checkout.delivery', 'Delivery')} ({wilaya})</span>
                <span>{deliveryRate} {currency}</span>
              </div>
            )}
            {deliveryRate === 0 && wilaya && (
              <div className="flex justify-between text-sm font-bold text-emerald-600 mb-1">
                <span>Delivery</span>
                <span>Free</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-slate-900 border-t border-slate-200 pt-2 mt-1">
              <span>{t('checkout.totalDue', 'Total Due on Delivery')}</span>
              <span className="text-indigo-600">{total} {currency}</span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 transition-all text-white font-black text-xl py-5 rounded-2xl shadow-[0_8px_30px_rgb(79,70,229,0.3)] flex items-center justify-center gap-3"
          >
            {submitting ? (
              <span className="animate-pulse">{t('checkout.confirm', 'Processing…')}</span>
            ) : (
              <>
                <ShoppingBag size={22} /> {t('checkout.orderNow', 'Order Now — Pay on Delivery')} <ChevronRight size={20} />
              </>
            )}
          </button>
          <p className="text-center text-xs font-bold text-slate-500 flex items-center justify-center gap-1.5 mt-4">
            <ShieldCheck size={16} className="text-emerald-500" /> {t('checkout.secureCheckout', 'No Credit Card · Pay when your order arrives')}
          </p>
        </form>
      </div>
    </div>
  );
});
