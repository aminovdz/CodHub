'use client';

import { use, useState } from 'react';
import { useFunnelStore } from '@/lib/store/useFunnelStore';
import { useAdminStore, resolveStore } from '@/lib/store/useAdminStore';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { CheckCircle2, Mail, ExternalLink, MessageCircle, ShoppingBag, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getShortOrderId } from '@/lib/idHelper';
import { markOrderSelfConfirmed } from '@/lib/actions/funnelActions';
import { usePixelEvent } from '@/hooks/usePixelEvent';

export default function ThankYouPage({ params }: { params: Promise<{ region: string }> }) {
  const resolvedParams = use(params);
  const region = resolvedParams.region;
  const { t } = useTranslation(region);
  const router = useRouter();

  const { customerName, cart, getTotalPrice, email, setEmail, draftOrderId, addressData, addCartItem, buyNow } = useFunnelStore();
  const { availableStores, checkoutConfigs, products } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');
  const whatsappConfig = store?.whatsappConfig;
  const checkoutConfig = checkoutConfigs.find(c => c.storeId === store?.id);
  const totalPrice = getTotalPrice();

  // Track Purchase event
  const cartIds = cart.map(i => i.id);
  usePixelEvent('Purchase', {
    value: totalPrice,
    currency,
    content_ids: cartIds,
    content_type: 'product'
  });

  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [otoClaimed, setOtoClaimed] = useState(false);
  const [selfConfirmed, setSelfConfirmed] = useState(false);

  // Find the primary purchased product
  const primaryCartItem = cart[0];
  const primaryProduct = primaryCartItem
    ? products.find(p => p.id === primaryCartItem.id)
    : null;

  // Determine OTO product from the purchased product's config
  const otoProductId = primaryProduct?.otoProductId;
  const otoProduct = otoProductId ? products.find(p => p.id === otoProductId) : null;

  const getFormattedAddress = () => {
    if (!addressData) return '';
    if (typeof addressData === 'string') return addressData;
    const parts = [];
    if (addressData.full_address) parts.push(addressData.full_address);
    if (addressData.commune) parts.push(addressData.commune);
    if (addressData.wilaya) parts.push(addressData.wilaya);
    return parts.join(', ') || 'N/A';
  };

  // Build pre-filled WhatsApp message
  const buildWhatsAppMessage = () => {
    let msg = whatsappConfig?.thankYouMessage || 'Hello, I want to confirm my order: [ORDER_ID]';
    msg = msg.replace(/\[ORDER_ID\]/g, getShortOrderId(draftOrderId));
    msg = msg.replace(/\[NAME\]/g, customerName || 'Customer');
    msg = msg.replace(/\[PRODUCT\]/g, primaryCartItem?.name || cart.map(i => i.name).join(', ') || 'Order');
    msg = msg.replace(/\[ADDRESS\]/g, getFormattedAddress());
    return encodeURIComponent(msg);
  };

  const handleConfirmClick = async () => {
    if (draftOrderId) {
      setSelfConfirmed(true);
      await markOrderSelfConfirmed(draftOrderId);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) setEmailSubmitted(true);
  };

  const handleOtoClaim = () => {
    if (!otoProduct) return;
    buyNow({
      id: otoProduct.id,
      name: otoProduct.title,
      price: otoProduct.price,
      isUpsell: true,
      imageUrl: otoProduct.image
    });
    setOtoClaimed(true);
    setTimeout(() => router.push(`/${region}/checkout`), 800);
  };

  // Store products for "You Might Also Like" (excluding already purchased)
  const storeProducts = products
    .filter(p => p.storeId === store?.id && p.active && p.id !== otoProductId && p.id !== primaryCartItem?.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 pt-16 pb-24 px-4 font-sans flex flex-col items-center">
      <div className="max-w-4xl w-full">

        {/* ===== SUCCESS HEADER ===== */}
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-slate-100 text-center relative overflow-hidden mb-8">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-green-400 to-emerald-600"></div>

          <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={56} className="text-emerald-500" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">
            {t('thankyou.thankYou', 'Thank you')} {customerName || 'Customer'}
          </h1>
          <h2 className="text-lg font-bold text-slate-500 mb-6 flex items-center justify-center gap-1.5">
            {t('thankyou.orderConfirmed', 'Your order has been received!')}
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto leading-relaxed">
            {checkoutConfig?.thankYouMessage || `${t('thankyou.orderProcessed', 'Your order is now being processed.')} ${t('thankyou.agentCall', 'An agent will call you shortly.')}`}
          </p>

          <div className="mt-8 bg-slate-50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between mx-auto max-w-xl border border-slate-100">
            <div className="text-left mb-4 md:mb-0">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">{t('thankyou.totalAmountDue', 'TOTAL AMOUNT DUE')}</div>
              <div className="text-3xl font-black text-slate-900">{totalPrice} <span className="text-xl text-slate-500">{currency}</span></div>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200">
              {cart.length} {t('checkout.items', 'Item(s)')} • Order #{getShortOrderId(draftOrderId)}
            </div>
          </div>
        </div>

        {/* ===== WHATSAPP CTA ===== */}
        {whatsappConfig?.thankYouEnabled && whatsappConfig.thankYouNumber && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl shadow-xl overflow-hidden mb-8 p-8 text-white">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                <MessageCircle size={32} className="text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-black mb-1">
                  {selfConfirmed ? 'Order Confirmed!' : t('thankyou.priorityShipping', 'Get Priority Shipping! 🚀')}
                </h3>
                <p className="text-green-100 text-lg">
                  {selfConfirmed 
                    ? 'Thank you for confirming your order via WhatsApp. We will process it immediately!'
                    : t('thankyou.priorityDesc', 'Click to confirm your order on WhatsApp and jump the queue for fast delivery.')}
                </p>
              </div>
              <a
                href={`https://wa.me/${whatsappConfig.thankYouNumber.replace(/\D/g, '')}?text=${buildWhatsAppMessage()}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleConfirmClick}
                className="flex-shrink-0 bg-white text-green-700 font-black px-8 py-4 rounded-2xl hover:bg-green-50 transition-all flex items-center gap-2 shadow-lg text-lg active:scale-95"
              >
                <MessageCircle size={20} /> {selfConfirmed ? 'Message Sent' : t('thankyou.confirmWhatsapp', 'Confirm on WhatsApp')}
              </a>
            </div>
          </div>
        )}

        {/* ===== POST-PURCHASE OTO ===== */}
        {otoProduct && !otoClaimed && (
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-3xl shadow-2xl overflow-hidden mb-8 text-white relative">
            <div className="absolute top-4 left-4 bg-amber-400 text-amber-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Zap size={12} /> One-Time Offer
            </div>
            <div className="flex flex-col md:flex-row">
              {otoProduct.image && (
                <div className="md:w-64 h-48 md:h-auto flex-shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={otoProduct.image} alt={otoProduct.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-8 flex flex-col justify-center flex-1">
                <p className="text-indigo-200 text-sm font-bold uppercase tracking-wider mb-2">Add to your order — one time only</p>
                <h3 className="text-3xl font-black mb-2">{otoProduct.title}</h3>
                {otoProduct.shortDesc && (
                  <p className="text-indigo-200 mb-4">{otoProduct.shortDesc}</p>
                )}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl font-black">{otoProduct.price} <span className="text-xl text-indigo-300">{currency}</span></span>
                  {otoProduct.compareAtPrice && (
                    <span className="text-xl text-indigo-400 line-through">{otoProduct.compareAtPrice} {currency}</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleOtoClaim}
                    className="bg-amber-400 hover:bg-amber-300 text-amber-900 font-black px-8 py-4 rounded-2xl transition-all active:scale-95 flex items-center gap-2 shadow-lg text-lg"
                  >
                    <ShoppingBag size={20} /> Yes, Add to My Order!
                  </button>
                  <button
                    onClick={() => setOtoClaimed(true)}
                    className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-4 rounded-2xl transition-all text-sm"
                  >
                    No thanks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DIGITAL RECEIPT ===== */}
        {checkoutConfig?.enableDigitalReceipt !== false && (
          !emailSubmitted ? (
            <div className="bg-indigo-600 rounded-3xl shadow-xl overflow-hidden mb-8 p-8 md:p-10 text-white relative">
              <div className="md:flex gap-8 items-center relative z-10">
                <div className="flex-1 mb-6 md:mb-0">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                    <Mail size={24} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">{t('thankyou.digitalReceipt', 'Want a Digital Receipt?')}</h3>
                  <p className="text-indigo-100 text-lg">
                    {t('thankyou.discountText', 'Get your order summary and an exclusive 20% discount code for your next purchase.')}
                  </p>
                </div>
                <div className="flex-1">
                  <form onSubmit={handleEmailSubmit} className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('thankyou.enterEmail', 'Enter your email address...')}
                      className="flex-1 px-5 py-4 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-400"
                    />
                    <button type="submit" className="bg-indigo-950 hover:bg-black text-white px-6 py-4 rounded-xl font-bold transition-colors">
                      {t('thankyou.send', 'Send')}
                    </button>
                  </form>
                  <div className="text-xs text-indigo-300 mt-3 font-medium">{t('thankyou.noSpam', 'We respect your privacy. No spam.')}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-100 border border-green-200 rounded-2xl p-6 text-center text-green-800 font-bold mb-8">
              ✅ Discount code and receipt will be sent to your email shortly!
            </div>
          )
        )}

        {/* ===== YOU MIGHT ALSO LIKE ===== */}
        {storeProducts.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-900">{t('thankyou.mightAlsoLike', 'You Might Also Like')}</h3>
              <Link href={`/${region}`} className="text-slate-400 text-sm font-bold uppercase cursor-pointer hover:text-slate-600 transition-colors flex items-center gap-1">
                {t('thankyou.backToStore', 'Back to Store')} <ExternalLink size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {storeProducts.map((prod) => (
                <Link
                  href={`/${region}/products/${prod.seoSlug || prod.id}`}
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {prod.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.image} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <ShieldCheck size={32} />
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-grow flex flex-col">
                    <h4 className="font-bold text-slate-900 mb-1 leading-tight flex-grow">{prod.title}</h4>
                    <div className="font-black text-indigo-600 text-lg mt-2">{prod.price} <span className="text-sm">{currency}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
