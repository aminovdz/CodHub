'use client';

import { use, useEffect, useState, useRef, useMemo } from 'react';
import { useFunnelStore, CartItem } from '@/lib/store/useFunnelStore';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { ShieldCheck, Truck, ArrowRight, PackagePlus, MapPin, Edit3 } from 'lucide-react';
import { saveDraftOrder, submitOrder } from '@/lib/actions/funnelActions';
import { useAdminStore, resolveStore, Coupon } from '@/lib/store/useAdminStore';
import { useTranslation } from '@/lib/hooks/useTranslation';

export default function CheckoutPage({ params }: { params: Promise<{ region: string }> }) {
  const resolvedParams = use(params);
  const region = resolvedParams.region;
  const { t } = useTranslation(region);
  // Prefix and Currency will be initialized after store is fetched
  
  const [step, setStep] = useState(1);
  const [isAnimatingPrice, setIsAnimatingPrice] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Local Address State
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [detailedAddress, setDetailedAddress] = useState(''); // Landmark for DZ, full for RO/CO
  const [email, setEmail] = useState('');
  const [lastName, setLastName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);

  const { availableStores, shippingZones, checkoutConfigs, setOrders, products, setProducts, setAbandonedCarts, coupons, setCoupons, addActivityLog } = useAdminStore();
  const store = resolveStore(availableStores, region);
  const zones = store ? shippingZones.filter(z => z.storeId === store.id) : [];
  const checkoutConfig = store ? checkoutConfigs.find(c => c.storeId === store.id) : undefined;
  const prefix = store?.phonePrefix || (region === 'dz' ? '+213' : region === 'ro' ? '+40' : '+57');
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');

  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isMounted && checkoutConfig?.addressAutocomplete && checkoutConfig?.autocompleteApiKey && typeof (window as any).google !== 'undefined' && addressInputRef.current) {
      const autocomplete = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, {
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.address_components) {
          let streetNumber = '';
          let route = '';
          let cityVal = '';
          let stateVal = '';
          let countryVal = '';
          let postalVal = '';

          place.address_components.forEach((comp: any) => {
            const types = comp.types;
            if (types.includes('street_number')) streetNumber = comp.long_name;
            if (types.includes('route')) route = comp.long_name;
            if (types.includes('locality')) cityVal = comp.long_name;
            if (types.includes('administrative_area_level_1')) stateVal = comp.long_name;
            if (types.includes('country')) countryVal = comp.long_name;
            if (types.includes('postal_code')) postalVal = comp.long_name;
          });

          setDetailedAddress(`${streetNumber} ${route}`.trim());
          setCity(cityVal);
          setProvince(stateVal);
          setCountry(countryVal);
          setPostalCode(postalVal);
        }
      });
    }
  }, [isMounted, checkoutConfig]);

  // Derive unique Wilayas and their Communes from admin config
  const uniqueWilayas = Array.from(new Set(zones.map(z => z.wilaya)));
  const communesByWilaya = (w: string) => zones.filter(z => z.wilaya === w).map(z => z.commune);
  
  const { 
    customerName, phone, draftOrderId, cart, getTotalPrice,
    setLead, setDraftOrderId, addCartItem, removeCartItem, 
    setAddressData, setDeliveryInstructions, deliveryInstructions, setStatus
  } = useFunnelStore();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPrice = getTotalPrice();

  const deliveryRate = useMemo(() => {
    if (region === 'dz' && !checkoutConfig?.addressAutocomplete) {
      let zone = zones.find(z => z.wilaya === wilaya && z.commune === commune);
      if (!zone) {
        zone = zones.find(z => z.wilaya === wilaya && (!z.commune || z.commune.trim() === ''));
      }
      return zone ? zone.deliveryRate : 0;
    }
    return 0;
  }, [wilaya, commune, zones, region, checkoutConfig]);

  // Calculate discount
  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === 'fixed') {
      return appliedCoupon.value;
    }
    return (totalPrice * appliedCoupon.value) / 100;
  }, [appliedCoupon, totalPrice]);

  const finalTotal = Math.max(0, totalPrice - discountAmount) + deliveryRate;

  const couponsDisabled = useMemo(() => {
    return cart.some(item => {
      const p = products.find(p => p.id === item.id);
      return p?.disableCoupons;
    });
  }, [cart, products]);

  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) return;

    const c = coupons.find(c => c.storeId === store?.id && c.code.toLowerCase() === couponCode.trim().toLowerCase());
    
    if (!c || !c.active) {
      setCouponError('Invalid or inactive coupon.');
      return;
    }
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) {
      setCouponError('Coupon has expired.');
      return;
    }
    if (c.maxUses && c.usedCount >= c.maxUses) {
      setCouponError('Coupon usage limit reached.');
      return;
    }
    if (c.minOrderValue && totalPrice < c.minOrderValue) {
      setCouponError(`Minimum order value is ${c.minOrderValue} ${currency}.`);
      return;
    }
    
    setAppliedCoupon(c);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // Redirect to store if cart is empty, UNLESS there's a ?product= ID to auto-populate
  useEffect(() => {
    const productId = searchParams.get('product');
    if (productId && cart.length === 0) {
      const prod = products.find(p => p.id === productId);
      if (prod) {
        addCartItem({ id: prod.id, name: prod.title, price: prod.price, isUpsell: false });
        return;
      }
    }
    if (cart.length === 0 && !productId) {
      router.push(`/${region}`);
    }
  }, [cart.length, region, router, searchParams, products, addCartItem]);

  // Price Animation Trigger
  const prevPriceRef = useRef(totalPrice);
  useEffect(() => {
    if (totalPrice !== prevPriceRef.current) {
      setIsAnimatingPrice(true);
      setTimeout(() => setIsAnimatingPrice(false), 500);
      prevPriceRef.current = totalPrice;
    }
  }, [totalPrice]);

  // Lead Capture -> Draft Order (Debounced / On Step 1 Complete)
  const handleProceedToStep2 = async () => {
    // If no upsells configured or disabled, skip to step 3
    if (dynamicUpsells.length === 0 || checkoutConfig?.enableStep2Upsell === false) {
      setStep(3);
    } else {
      setStep(2);
    }
    
    let localOrderId = draftOrderId || `ABN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    // Always set draft order ID locally so we can track it across steps instantly
    if (!draftOrderId) {
      setDraftOrderId(localOrderId);
    }

    // Synchronous local state capture (guarantees Abandoned Cart appears even if network hangs)
    if (store) {
      setAbandonedCarts(prev => {
        // remove existing if updating
        const filtered = prev.filter(c => c.id !== localOrderId);
        return [{
          id: localOrderId,
          storeId: store.id,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          product: cart.map(c => c.name).join(', '),
          total: finalTotal,
          step: 'Upsell / Shipping',
          date: new Date().toISOString()
        }, ...filtered];
      });
    }

    // Fire & Forget background save to backend
    try {
      const res = await saveDraftOrder({
        id: localOrderId, // use the local order ID we just generated
        name: customerName,
        phone: `${prefix}${phone.replace(/^0+/, '')}`,
        region: region
      });
      if (res?.error) {
        console.error("saveDraftOrder returned error:", res.error);
      }
      // Optionally update local tracking if backend returned a UUID, but local tracking works fine for now
      if (res?.success && res.orderId && res.orderId !== localOrderId) {
         setDraftOrderId(res.orderId);
      }
    } catch (err) {
      console.warn("Server saveDraftOrder failed or is not configured, using local fallback", err);
    }
  };

  const handleProceedToStep3 = () => setStep(3);

  // Countdown timer — fires when entering step 2
  useEffect(() => {
    if (step === 2 && checkoutConfig && (checkoutConfig.countdownMinutes ?? 5) > 0) {
      const totalSecs = (checkoutConfig.countdownMinutes ?? 5) * 60;
      setCountdownSecs(totalSecs);
      const interval = setInterval(() => {
        setCountdownSecs(prev => {
          if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, checkoutConfig]);

  const handleComplete = async () => {
    setStatus('CONFIRMING');
    
    // Build address object
    const finalAddress = region === 'dz' 
      ? { wilaya, commune, landmark: detailedAddress }
      : { 
          address: detailedAddress, 
          city, 
          postalCode, 
          province, 
          country 
        };

    setAddressData(finalAddress);
    
    // Final Submission
    
    const finalOrderId = draftOrderId || `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Update Local Dashboard instantly
    if (store) {
      setOrders(prev => [
        {
          id: finalOrderId,
          storeId: store.id,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          address: region === 'dz' 
            ? detailedAddress + (Object.entries(customFieldsData).map(([k,v]) => ` | ${checkoutConfig?.customFields?.find(f=>f.id===k)?.label}: ${v}`).join(''))
            : `${detailedAddress}` + (Object.entries(customFieldsData).map(([k,v]) => ` | ${checkoutConfig?.customFields?.find(f=>f.id===k)?.label}: ${v}`).join('')),
          city: region !== 'dz' ? city : undefined,
          postalCode: region !== 'dz' ? postalCode : undefined,
          province: region !== 'dz' ? province : undefined,
          country: region !== 'dz' ? country : undefined,
          wilaya: (region === 'dz' && !checkoutConfig?.addressAutocomplete) ? wilaya : undefined,
          commune: (region === 'dz' && !checkoutConfig?.addressAutocomplete) ? commune : undefined,
          product: cart.map(c => c.name).join(', '),
          total: finalTotal,
          status: 'PENDING_AGENT_CONFIRMATION',
          date: new Date().toISOString()
        },
        ...prev
      ]);

      // Log Activity
      addActivityLog({
        storeId: store.id,
        user: 'Customer',
        action: 'Order Created',
        detail: `New order ${finalOrderId} for ${finalTotal} ${currency}`
      });

      // Remove from abandoned carts using the locally tracked draftOrderId
      if (draftOrderId) {
        setAbandonedCarts(prev => prev.filter(c => c.id !== draftOrderId));
      }

      // Mark coupon as used
      if (appliedCoupon) {
        setCoupons(prev => prev.map(c => c.id === appliedCoupon.id ? { ...c, usedCount: c.usedCount + 1 } : c));
      }

      // Decrement stock and check for stockout
      let stockoutProduct = '';
      setProducts(prev => prev.map(p => {
        const inCart = cart.find(c => c.id === p.id);
        if (inCart) {
          const newStock = Math.max(0, (p.stock || 0) - 1);
          if (newStock === 0 && (p.stock || 0) > 0) {
            stockoutProduct = p.title;
          }
          return { ...p, stock: newStock };
        }
        return p;
      }));

      // Fire email notification asynchronously
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: store.name,
          orderId: finalOrderId,
          total: finalTotal,
          currency: store.currency,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          region: store.region,
          resendApiKey: store.resendApiKey,
          notifyEmail: store.notifyEmail
        })
      }).catch(err => console.error("Email notification failed:", err));

      if (stockoutProduct) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeName: store.name,
            orderId: finalOrderId,
            total: 0,
            currency: store.currency,
            customer: stockoutProduct,
            phone: '',
            region: store.region,
            resendApiKey: store.resendApiKey,
            notifyEmail: store.notifyEmail,
            type: 'stockout'
          })
        }).catch(err => console.error("Stockout notification failed:", err));
      }
    }

    // Redirect user instantly for snappy UI
    setStatus('SUCCESS');
    router.push(`/${region}/thank-you`);

    // Fire and forget server action in background
    if (draftOrderId) {
      try {
        await submitOrder(draftOrderId, region, {
          address: finalAddress,
          instructions: addingNote ? deliveryInstructions : '',
          cart
        });
      } catch (err) {
        console.warn("Server submitOrder failed or is not configured, using local fallback", err);
      }
    }
  };

  const dynamicUpsells = useMemo(() => {
    // Pre-purchase upsells (Maximizer)
    const cartMainItems = cart.filter(i => !i.isUpsell);
    const upsellList: any[] = [];
    
    cartMainItems.forEach(item => {
      const p = products.find(prod => prod.id === item.id);
      if (p?.maximizerUpsells) {
        p.maximizerUpsells.forEach(cfg => {
          const target = products.find(tp => tp.id === cfg.targetProductId);
          if (target) {
            upsellList.push({
              id: cfg.id,
              productId: cfg.targetProductId,
              name: cfg.titleOverride || target.title,
              price: cfg.customPrice,
              image: cfg.customImage || target.image
            });
          }
        });
      }
    });

    return upsellList;
  }, [cart, products]);

  const handleUpsellToggle = (item: any, checked: boolean) => {
    if (checked) {
      addCartItem({ id: item.id, name: item.name, price: item.price, isUpsell: true });
    } else {
      removeCartItem(item.id);
    }
  };



  const isCustomFieldsValid = checkoutConfig?.customFields?.every(f => !f.required || !!customFieldsData[f.id]) ?? true;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 font-sans pb-32">

      <div className="max-w-2xl mx-auto">
        
        {/* Progress Tracker */}
        <div className="flex items-center justify-between mb-8 px-4 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
          
          {[
            { num: 1, label: t('checkout.step1', 'Details') },
            { num: 2, label: t('checkout.step2', 'Add-ons') },
            { num: 3, label: t('checkout.step3', 'Shipping') }
          ].map(s => (
            <div key={s.num} className={`flex flex-col items-center ${step >= s.num ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-colors ${step >= s.num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-500'}`}>
                {s.num}
              </div>
              <span className="text-sm font-bold">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative">
          {/* Header */}
          <div className="bg-indigo-600 p-6 text-white text-center">
            <h2 className="text-2xl font-black uppercase tracking-wide">
              {t('checkout.secureCheckout', 'SECURE CHECKOUT')}
            </h2>
          </div>

          <div className="p-6 md:p-8">
            {/* STEP 1: LEAD CAPTURE */}
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-500">
                <h3 className="text-xl font-bold text-slate-800 mb-6">{t('checkout.subtitle', 'Who is receiving this order?')}</h3>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      {checkoutConfig?.fields?.showLastName ? t('form.firstName', 'First Name') + ' *' : t('form.fullName', 'Full Name') + ' *'}
                    </label>
                    <input 
                      type="text" 
                      value={customerName}
                      onChange={(e) => setLead(e.target.value, phone)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-900"
                      placeholder={checkoutConfig?.fields?.showLastName ? 'e.g. John' : 'e.g. John Doe'}
                    />
                  </div>
                  {checkoutConfig?.fields?.showLastName && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">{t('form.lastName', 'Last Name')} *</label>
                      <input 
                        type="text" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-900"
                        placeholder="e.g. Doe"
                      />
                    </div>
                  )}
                  {checkoutConfig?.fields?.showEmail && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {t('form.email', 'Email Address')} {checkoutConfig?.fields?.requireEmail ? '*' : '(Optional)'}
                      </label>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-900"
                        placeholder="e.g. john@example.com"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t('form.phone', 'WhatsApp Number')} *</label>
                    <div className="flex gap-2">
                      <div className="px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-600 flex items-center">
                        {prefix}
                      </div>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setLead(customerName, e.target.value.replace(/\\D/g, ''))}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-900 tracking-wide"
                        placeholder="55 55 55 55 55"
                      />
                    </div>
                  </div>
                  {checkoutConfig?.customFields?.map(field => (
                    <div key={field.id} className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        {field.label} {field.required ? '*' : '(Optional)'}
                      </label>
                      <input 
                        type="text" 
                        value={customFieldsData[field.id] || ''}
                        onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all placeholder:text-slate-400 font-bold text-slate-900"
                      />
                    </div>
                  ))}
                </div>

                <button 
                  onClick={handleProceedToStep2}
                  disabled={!customerName || phone.length < 8 || !isCustomFieldsValid}
                  style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                  className={`w-full mt-8 py-4 px-6 text-white ${!store?.primaryColor && 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'} disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-bold text-lg transition-all flex justify-center items-center gap-2 group`}
                >
                  {t('checkout.next', 'Continue')}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* STEP 2: THE MAXIMIZER */}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-500">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <PackagePlus className="text-indigo-600" /> {t('checkout.upsellTitle', 'Wait! Add another to your order')}
                  </h3>
                  {countdownSecs !== null && countdownSecs > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-black ${
                      countdownSecs <= 60 
                        ? 'bg-rose-100 text-rose-600 animate-pulse' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span>⏱</span>
                      <span>{String(Math.floor(countdownSecs / 60)).padStart(2,'0')}:{String(countdownSecs % 60).padStart(2,'0')}</span>
                    </div>
                  )}
                  {countdownSecs === 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-black bg-slate-100 text-slate-500">
                      ⏱ Expired
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-sm mb-6">{t('checkout.upsellDesc', 'Exclusive one-time offers for our new customers.')}</p>

                <div className="space-y-4">
                  {dynamicUpsells.map((upsell) => {
                    const isSelected = cart.some(i => i.id === upsell.id);
                    return (
                      <label 
                        key={upsell.id} 
                        className={`flex items-start gap-4 p-5 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
                      >
                        <div className="mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => handleUpsellToggle(upsell, e.target.checked)}
                            className="w-6 h-6 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                        </div>
                        {upsell.image && (
                          <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                             <img src={upsell.image} alt={upsell.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-900">{upsell.name}</span>
                            <span className="font-black text-indigo-600">+{upsell.price} {currency}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{t('checkout.upsellItemDesc', 'Highly recommended addition to complete your setup.')}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-4 mt-8">
                  <button onClick={() => setStep(1)} className="px-6 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200">{t('checkout.back', 'Back')}</button>
                  <button 
                    onClick={handleProceedToStep3}
                    style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                    className={`flex-1 py-4 px-6 text-white ${!store?.primaryColor && 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'} rounded-xl font-bold text-lg transition-all flex justify-center items-center gap-2 group`}
                  >
                    {t('checkout.next', 'Continue')}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: FINAL DETAILS */}
            {step === 3 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-500">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                  <MapPin className="text-indigo-600" /> {t('checkout.deliveryInfo', 'Delivery Information')}
                </h3>

                <div className="space-y-5">
                  {/* ADDRESS RENDERER */}
                  {checkoutConfig?.showAddressFields !== false && (
                    <>
                      {checkoutConfig?.addressAutocomplete ? (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.preciseAddress', 'Start typing your precise address')} *</label>
                          <input 
                            ref={addressInputRef}
                            type="text"
                            value={detailedAddress}
                            onChange={(e) => setDetailedAddress(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                            placeholder="Search street, flat number..."
                          />
                        </div>
                      ) : region === 'dz' ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.wilaya', 'Region / State')} *</label>
                              <select 
                                value={wilaya}
                                onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900 bg-white"
                              >
                                <option value="" disabled>Select Wilaya</option>
                                {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.commune', 'City / Commune')} *</label>
                              <input 
                                type="text"
                                value={commune}
                                onChange={(e) => setCommune(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900 bg-white"
                                placeholder="e.g. Oran Center"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.address', 'Detailed Address')} *</label>
                            <input 
                              type="text"
                              value={detailedAddress}
                              onChange={(e) => setDetailedAddress(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                              placeholder={t('checkout.addressPlaceholder', 'e.g. Next to the main post office')}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.preciseAddress', 'Address *')}</label>
                            <input 
                              ref={addressInputRef}
                              type="text"
                              value={detailedAddress}
                              onChange={(e) => setDetailedAddress(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                              placeholder={t('checkout.searchStreet', 'Search street, flat number...')}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {checkoutConfig?.fields?.showCity !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.city', 'City')} *</label>
                                <input 
                                  type="text"
                                  value={city}
                                  onChange={(e) => setCity(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.city', 'City')}
                                />
                              </div>
                            )}
                            {checkoutConfig?.fields?.showPostalCode !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.postalCode', 'Postal Code')}</label>
                                <input 
                                  type="text"
                                  value={postalCode}
                                  onChange={(e) => setPostalCode(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.postalCode', 'Postal Code')}
                                />
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {checkoutConfig?.fields?.showProvince !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.province', 'Province / State')}</label>
                                <input 
                                  type="text"
                                  value={province}
                                  onChange={(e) => setProvince(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.province', 'Province')}
                                />
                              </div>
                            )}
                            {checkoutConfig?.fields?.showCountry !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">{t('checkout.country', 'Country')}</label>
                                <input 
                                  type="text"
                                  value={country}
                                  onChange={(e) => setCountry(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.country', 'Country')}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {checkoutConfig?.addressAutocomplete && checkoutConfig?.autocompleteApiKey && (
                    <Script 
                      src={`https://maps.googleapis.com/maps/api/js?key=${checkoutConfig.autocompleteApiKey}&libraries=places`}
                      onLoad={() => setIsMounted(true)} // Trigger re-effect
                    />
                  )}

                  {/* Coupon Area */}
                  {!couponsDisabled && (
                    <div className="pt-4 border-t border-slate-100">
                      {!appliedCoupon ? (
                        <div>
                          <button 
                            onClick={() => setShowCouponInput(!showCouponInput)}
                            className="text-indigo-600 font-bold text-sm mb-2 hover:underline text-left w-full"
                          >
                            {t('checkout.haveCoupon', 'Have a coupon code?')}
                          </button>
                          {showCouponInput && (
                            <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                              <input 
                                type="text"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 uppercase"
                                placeholder="e.g. DISCOUNT20"
                              />
                              <button 
                                onClick={handleApplyCoupon}
                                style={{ backgroundColor: store?.primaryColor }}
                                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                              >
                                {t('checkout.apply', 'Apply')}
                              </button>
                            </div>
                          )}
                          {couponError && <p className="text-rose-500 text-xs font-bold mt-2">{couponError}</p>}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="text-emerald-700 font-bold text-sm">{t('checkout.couponApplied', 'Coupon Applied!')}</div>
                            <div className="text-emerald-600 font-black text-lg">-{appliedCoupon.type === 'fixed' ? appliedCoupon.value + ' ' + currency : `${appliedCoupon.value}%`}</div>
                          </div>
                          <button 
                            onClick={handleRemoveCoupon}
                            className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivery Comment Area */}
                  <div className="pt-4 border-t border-slate-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={addingNote}
                        onChange={(e) => setAddingNote(e.target.checked)}
                        className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="font-bold text-slate-700 flex items-center gap-2"><Edit3 size={16}/> {t('checkout.notes', 'Add delivery instructions/comment')}</span>
                    </label>

                    {addingNote && (
                      <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                        <textarea
                          value={deliveryInstructions}
                          onChange={(e) => setDeliveryInstructions(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 resize-none text-sm"
                          placeholder={t('checkout.notesPlaceholder', 'Any specific delivery instructions for the driver?')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => {
                      if (dynamicUpsells.length === 0 || checkoutConfig?.enableStep2Upsell === false) {
                        setStep(1);
                      } else {
                        setStep(2);
                      }
                    }} 
                    className="px-6 py-5 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200"
                  >
                    {t('checkout.back', 'Back')}
                  </button>
                  <button 
                    onClick={handleComplete}
                    disabled={checkoutConfig?.showAddressFields !== false ? ((region === 'dz' && !checkoutConfig?.addressAutocomplete) ? (!wilaya || !commune || !detailedAddress) : !detailedAddress) : false}
                    style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                    className={`flex-1 py-5 px-6 text-white ${!store?.primaryColor && 'bg-green-600 hover:bg-green-700 active:bg-green-800'} disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl font-black text-xl transition-all shadow-[0_8px_30px_rgb(22,163,74,0.3)] hover:shadow-[0_8px_30px_rgb(22,163,74,0.5)] flex justify-center items-center gap-2`}
                  >
                    <Truck size={24} />
                    {t('checkout.orderNow', 'CONFIRM COD ORDER')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM ACTION BAR - TOTAL PRICE (ANIMATED) */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] py-4 px-6 z-50">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('checkout.totalDue', 'Total Due on Delivery')}</div>
            <div className={`text-3xl font-black text-indigo-600 transition-transform ${isAnimatingPrice ? 'scale-110 text-rose-500' : 'scale-100'}`}>
              {isMounted ? finalTotal : '0'} <span className="text-xl">{currency}</span>
            </div>
            {isMounted && deliveryRate > 0 && (
              <div className="text-xs font-bold text-slate-500 mt-0.5">
                {t('checkout.subtotal', 'Subtotal')}: {totalPrice} {discountAmount > 0 && `(-${discountAmount})`} • {t('checkout.delivery', 'Delivery')}: {deliveryRate}
              </div>
            )}
            {isMounted && deliveryRate === 0 && discountAmount > 0 && (
              <div className="text-xs font-bold text-slate-500 mt-0.5">
                {t('checkout.subtotal', 'Subtotal')}: {totalPrice} • {t('checkout.discount', 'Discount')}: -{discountAmount}
              </div>
            )}
          </div>
          <div className="text-right text-xs font-medium text-slate-500">
            <div>{t('checkout.includes', 'Includes')} {isMounted ? cart.length : '0'} {t('checkout.items', 'item(s)')}</div>
            {step === 2 && <div className="text-indigo-600 font-bold mt-1">{t('checkout.selectAddons', 'Select add-ons above!')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
