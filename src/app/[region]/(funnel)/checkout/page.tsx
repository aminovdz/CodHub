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
  const [utmSource, setUtmSource] = useState<string>('');  
  const [utmCampaign, setUtmCampaign] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Always mark as mounted on client — do NOT rely on external script onLoad for this
  useEffect(() => {
    setIsMounted(true);
    // Read UTM data from sessionStorage (captured by UTMTracker on landing)
    setUtmSource(sessionStorage.getItem('utm_source') || '');
    setUtmCampaign(sessionStorage.getItem('utm_campaign') || '');
  }, []);
  
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

          setDetailedAddress(`${streetNumber} ${route}`.trim() || place.name || '');
          setCity(cityVal);
          setProvince(stateVal);
          setCountry(countryVal);
          setPostalCode(postalVal);

          if (region === 'dz' || region === 'ro' || region === 'co') {
            if (stateVal) setWilaya(stateVal);
            if (cityVal) setCommune(cityVal);
          }
        }
      });
    }
  }, [isMounted, checkoutConfig]);

  // Automatically capture country based on store/region
  useEffect(() => {
    const regionNames: Record<string, string> = {
      dz: 'Algeria',
      es: 'Spain',
      ro: 'Romania',
      co: 'Colombia',
      fr: 'France',
      it: 'Italy'
    };
    if (store?.region) {
      const resolved = regionNames[store.region.toLowerCase()] || store.region.toUpperCase();
      setCountry(resolved);
    } else if (region) {
      const resolved = regionNames[region.toLowerCase()] || region.toUpperCase();
      setCountry(resolved);
    }
  }, [store?.region, region]);

  // Derive unique Wilayas and their Communes from admin config
  let uniqueWilayas = Array.from(new Set(zones.map(z => z.wilaya).filter(w => w && w.trim() !== '')));
  const communesByWilaya = (w: string) => zones.filter(z => z.wilaya === w).map(z => z.commune);

  // If no shipping zones are configured, auto-generate states based on the country
  if (uniqueWilayas.length === 0) {
    if (region === 'dz') {
      uniqueWilayas = ["Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira","Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda","Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla","Oran","El Bayadh","Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela","Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar","Ouled Djellal","Béni Abbès","In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa"];
    } else if (region === 'ro') {
      uniqueWilayas = ["Alba","Arad","Argeș","Bacău","Bihor","Bistrița-Năsăud","Botoșani","Brașov","Brăila","Buzău","Caraș-Severin","Călărași","Cluj","Constanța","Covasna","Dâmbovița","Dolj","Galați","Giurgiu","Gorj","Harghita","Hunedoara","Ialomița","Iași","Ilfov","Maramureș","Mehedinți","Mureș","Neamț","Olt","Prahova","Satu Mare","Sălaj","Sibiu","Suceava","Teleorman","Timiș","Tulcea","Vaslui","Vâlcea","Vrancea","București"];
    } else if (region === 'co') {
      uniqueWilayas = ["Amazonas","Antioquia","Arauca","Atlántico","Bolívar","Boyacá","Caldas","Caquetá","Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca","Guainía","Guaviare","Huila","La Guajira","Magdalena","Meta","Nariño","Norte de Santander","Putumayo","Quindío","Risaralda","San Andrés y Providencia","Santander","Sucre","Tolima","Valle del Cauca","Vaupés","Vichada","Bogotá"];
    } else if (region === 'sa') {
      uniqueWilayas = ["Riyadh","Makkah","Madinah","Eastern Province","Asir","Tabuk","Hail","Northern Borders","Jizan","Najran","Al Baha","Al Jouf","Qassim"];
    } else if (region === 'ae') {
      uniqueWilayas = ["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"];
    }
  }  
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
    if (province) {
      const zone = zones.find(z => z.wilaya.trim().toLowerCase() === province.trim().toLowerCase());
      if (zone) return zone.deliveryRate;
    }
    return 0;
  }, [wilaya, commune, province, zones, region, checkoutConfig]);

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

  // Abandoned cart timer ref
  const abandonedCartTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startAbandonedCartTimer = (orderId: string) => {
    if (!store?.whatsappConfig?.abandonedCartEnabled || !store?.whatsappConfig?.aisensyEnabled || !store?.whatsappConfig?.abandonedCartCampaignName) return;
    
    const delay = (store.whatsappConfig.abandonedCartDelayMinutes || 15) * 60 * 1000;
    abandonedCartTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/aisensy/abandoned-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: store.id, orderId })
        });
      } catch (e) {
        console.warn('[Abandoned Cart Timer] Failed to send notification:', e);
      }
    }, delay);
  };

  // Check for existing expired draft on mount
  useEffect(() => {
    if (draftOrderId && store?.whatsappConfig?.abandonedCartEnabled && store?.whatsappConfig?.aisensyEnabled && store?.whatsappConfig?.abandonedCartCampaignName) {
      const delay = (store.whatsappConfig.abandonedCartDelayMinutes || 15) * 60 * 1000;
      const draftCreatedKey = `abandoned_ts_${draftOrderId}`;
      const created = parseInt(sessionStorage.getItem(draftCreatedKey) || '0', 10);
      if (created && Date.now() - created >= delay) {
        fetch('/api/aisensy/abandoned-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: store.id, orderId: draftOrderId })
        }).catch(() => {});
      }
    }
  }, [draftOrderId, store?.id]);

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

      // Start abandoned cart timer + save timestamp for page-reload recovery
      sessionStorage.setItem(`abandoned_ts_${localOrderId}`, Date.now().toString());
      startAbandonedCartTimer(localOrderId);
    }

    // Fire & Forget background save to backend
    try {
      const res = await saveDraftOrder({
        id: localOrderId,
        name: customerName,
        phone: `${prefix}${phone.replace(/^0+/, '')}`,
        region: region,
        source: utmSource || undefined,
        utmCampaign: utmCampaign || undefined,
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

    // Clear abandoned cart timer
    if (abandonedCartTimerRef.current) {
      clearTimeout(abandonedCartTimerRef.current);
      abandonedCartTimerRef.current = null;
    }

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
    
    const finalOrderId = draftOrderId || `ORD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
          date: new Date().toISOString(),
          source: (utmSource as any) || undefined,
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

    // Fire Purchase Pixels
    if (typeof window !== 'undefined') {
      const val = finalTotal;
      const curr = store?.currency || 'DZD';
      if ((window as any).fbq) (window as any).fbq('track', 'Purchase', { value: val, currency: curr });
      if ((window as any).ttq) (window as any).ttq.track('CompletePayment', { value: val, currency: curr });
      if ((window as any).snaptr) (window as any).snaptr('track', 'PURCHASE', { price: val, currency: curr });
      if ((window as any).pintrk) (window as any).pintrk('track', 'checkout', { value: val, order_quantity: 1, currency: curr });
      if ((window as any).gtag) (window as any).gtag('event', 'purchase', { value: val, currency: curr, transaction_id: finalOrderId });
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
          cart,
          total: finalTotal,
          discountAmount: discountAmount,
          deliveryRate: deliveryRate,
          couponCode: appliedCoupon ? appliedCoupon.code : '',
          customFields: customFieldsData,
          source: utmSource || undefined,
          utmCampaign: utmCampaign || undefined,
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

  // NEW: Proceed directly from step 1 to step 2 (address) — upsells are now inline in step 1
  const handleProceedToAddress = async () => {
    setStep(2);

    let localOrderId = draftOrderId || `ABN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    if (!draftOrderId) setDraftOrderId(localOrderId);

    if (store) {
      setAbandonedCarts(prev => {
        const filtered = prev.filter(c => c.id !== localOrderId);
        return [{
          id: localOrderId, storeId: store.id,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          product: cart.map(c => c.name).join(', '), total: finalTotal,
          step: 'Address', date: new Date().toISOString()
        }, ...filtered];
      });
      sessionStorage.setItem(`abandoned_ts_${localOrderId}`, Date.now().toString());
      startAbandonedCartTimer(localOrderId);
    }

    try {
      const res = await saveDraftOrder({
        id: localOrderId, name: customerName,
        phone: `${prefix}${phone.replace(/^0+/, '')}`,
        region, source: utmSource || undefined, utmCampaign: utmCampaign || undefined,
      });
      if (res?.success && res.orderId && res.orderId !== localOrderId) setDraftOrderId(res.orderId);
    } catch (err) {
      console.warn('saveDraftOrder failed, using local fallback', err);
    }
  };

  const mainCartItem = cart.find(i => !i.isUpsell);
  const mainProduct = mainCartItem ? products.find(p => p.id === mainCartItem.id) : null;

  const handleQuantitySelect = (qty: number, offerPrice: number) => {
    setSelectedQuantity(qty);
    if (mainCartItem) {
      addCartItem({
        ...mainCartItem,
        price: offerPrice,
        name: `${qty}x ${mainProduct?.title || mainCartItem.name.replace(/^\dx\s/, '')}`
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans pb-28">
      <div className="max-w-lg mx-auto">

        {/* Progress Tracker — 2 steps */}
        <div className="flex items-center justify-between mb-6 px-2 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-indigo-600 -z-10 transition-all duration-500" style={{ width: step === 1 ? '0%' : '100%' }} />
          {[
            { num: 1, label: t('checkout.step1', 'Your Info') },
            { num: 2, label: t('checkout.step3', 'Delivery') },
          ].map(s => (
            <div key={s.num} className={`flex flex-col items-center ${step >= s.num ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm mb-1.5 transition-all ${step >= s.num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-500'}`}>
                {step > s.num ? '✓' : s.num}
              </div>
              <span className="text-xs font-bold">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-5 text-center border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              {t('checkout.secureCheckout', '🔒 Secure Checkout — Pay on Delivery')}
            </h2>
          </div>

          <div className="p-5 md:p-7">

            {/* ═══════════════════════════════════════════ */}
            {/* STEP 1: PRODUCT + UPSELLS + CONTACT INFO   */}
            {/* ═══════════════════════════════════════════ */}
            {step === 1 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-400">

                {/* ── Quantity Offers (Bundle Selector) ── */}
                <div className="mb-6">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    {t('checkout.selectOffer', 'Select Your Offer')}
                  </p>
                  <div className="space-y-3">
                    {[
                      { qty: 1, label: '1 Item', discount: 0, popular: false },
                      { qty: 2, label: '2 Items (Save 15%)', discount: 0.15, popular: true },
                      { qty: 3, label: '3 Items (Save 25%)', discount: 0.25, popular: false }
                    ].map(offer => {
                      // Retrieve base unit price by dividing current cart item price by its current quantity if it was already updated
                      // Or just use the original main product price.
                      const basePrice = mainProduct?.price || (mainCartItem?.price ? Math.round(mainCartItem.price / selectedQuantity) : 0);
                      const offerPrice = Math.round((basePrice * offer.qty) * (1 - offer.discount));
                      const isSelected = selectedQuantity === offer.qty;
                      
                      return (
                        <label key={offer.qty} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all relative ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                          {offer.popular && <span className="absolute -top-2.5 right-4 bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">Most Popular</span>}
                          <input type="radio" name="quantity_offer" checked={isSelected} onChange={() => handleQuantitySelect(offer.qty, offerPrice)} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 shrink-0" />
                          <div className="flex-1">
                            <p className={`font-black text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{offer.label}</p>
                            {offer.qty > 1 && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{(offerPrice / offer.qty).toFixed(0)} {currency} / item</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-lg text-indigo-600">{offerPrice} <span className="text-xs">{currency}</span></p>
                            {offer.discount > 0 && <p className="text-[10px] text-slate-400 line-through">{basePrice * offer.qty} {currency}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* ── Inline Upsells (if configured) ── */}
                {dynamicUpsells.length > 0 && checkoutConfig?.enableStep2Upsell !== false && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <PackagePlus size={15} className="text-amber-500" />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                        ⚡ {t('checkout.upsellTitle', 'Exclusive Add-ons — Limited Offer')}
                      </span>
                      {countdownSecs !== null && countdownSecs > 0 && (
                        <span className={`ml-auto text-xs font-black px-2 py-0.5 rounded-full ${countdownSecs <= 60 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-amber-100 text-amber-700'}`}>
                          ⏱ {String(Math.floor(countdownSecs / 60)).padStart(2,'0')}:{String(countdownSecs % 60).padStart(2,'0')}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {dynamicUpsells.map((upsell) => {
                        const isSelected = cart.some(i => i.id === upsell.id);
                        return (
                          <label
                            key={upsell.id}
                            className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-slate-50'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleUpsellToggle(upsell, e.target.checked)}
                              className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 shrink-0"
                            />
                            {upsell.image && (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={upsell.image} alt={upsell.name} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-900 text-sm leading-tight truncate">{upsell.name}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('checkout.upsellItemDesc', 'Highly recommended for best results')}</p>
                            </div>
                            <span className="font-black text-indigo-600 text-sm shrink-0">+{upsell.price} {currency}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Contact Info Form ── */}
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest border-t border-slate-100 pt-4">
                    {t('checkout.subtitle', '📋 Contact Information')}
                  </p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {checkoutConfig?.fields?.showLastName ? t('form.firstName', 'First Name') + ' *' : t('form.fullName', 'Full Name') + ' *'}
                    </label>
                    <input
                      type="text" value={customerName}
                      onChange={(e) => setLead(e.target.value, phone)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                      placeholder={checkoutConfig?.fields?.showLastName ? 'e.g. John' : 'e.g. John Doe'}
                    />
                  </div>
                  {checkoutConfig?.fields?.showLastName && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('form.lastName', 'Last Name')} *</label>
                      <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                        placeholder="e.g. Doe"
                      />
                    </div>
                  )}
                  {checkoutConfig?.fields?.showEmail && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {t('form.email', 'Email')} {checkoutConfig?.fields?.requireEmail ? '*' : '(Optional)'}
                      </label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                        placeholder="e.g. john@example.com"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('form.phone', 'WhatsApp Number')} *</label>
                    <div className="flex gap-2">
                      <div className="px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-600 flex items-center shrink-0">{prefix}</div>
                      <input type="tel" value={phone}
                        onChange={(e) => setLead(customerName, e.target.value.replace(/\D/g, ''))}
                        className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 tracking-wide"
                        placeholder="55 55 55 55 55"
                      />
                    </div>
                  </div>
                  {checkoutConfig?.customFields?.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{field.label} {field.required ? '*' : '(Optional)'}</label>
                      <input type="text" value={customFieldsData[field.id] || ''}
                        onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleProceedToAddress}
                  disabled={!customerName || phone.length < 8 || !isCustomFieldsValid}
                  style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                  className={`w-full mt-6 py-4 px-6 text-white font-black text-lg rounded-xl transition-all flex justify-center items-center gap-2 group ${!store?.primaryColor ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800' : 'hover:opacity-90'} disabled:bg-slate-300 disabled:cursor-not-allowed`}
                >
                  {t('checkout.next', 'Continue to Delivery')}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* STEP 2: ORDER SUMMARY + ADDRESS FORM            */}
            {/* ═══════════════════════════════════════════════ */}
            {step === 2 && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-400">

                {/* ── Order Summary Card ── */}
                <div className="bg-slate-900 rounded-2xl p-4 mb-6 text-white">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">📦 {t('checkout.orderSummary', 'Order Summary')}</p>
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-200 truncate mr-4">{item.name}</span>
                        <span className="font-black text-white shrink-0">{item.price} {currency}</span>
                      </div>
                    ))}
                    {deliveryRate > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                        <span className="text-sm font-bold text-slate-400">{t('checkout.delivery', 'Delivery')}</span>
                        <span className="font-black text-slate-300">{deliveryRate} {currency}</span>
                      </div>
                    )}
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-emerald-400">{t('checkout.discount', 'Discount')}</span>
                        <span className="font-black text-emerald-400">-{discountAmount} {currency}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-600">
                    <span className="font-black text-slate-300 text-sm uppercase tracking-wider">{t('checkout.totalDue', 'Total on Delivery')}</span>
                    <span className={`font-black text-2xl transition-transform ${isAnimatingPrice ? 'scale-110 text-rose-400' : 'text-indigo-400'}`}>{isMounted ? finalTotal : '...'} <span className="text-base">{currency}</span></span>
                  </div>
                </div>

                {/* ── Address Form ── */}
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    <MapPin size={12} className="inline mr-1" />{t('checkout.deliveryInfo', 'Delivery Address')}
                  </p>

                  {checkoutConfig?.showAddressFields !== false && (
                    <>
                      {checkoutConfig?.addressAutocomplete ? (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.preciseAddress', 'Precise Address')} *</label>
                          <input ref={addressInputRef} type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                            placeholder="Search street, flat number..."
                          />
                        </div>
                      ) : region === 'dz' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.wilaya', 'Wilaya')} *</label>
                              <select value={wilaya} onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white"
                              >
                                <option value="" disabled>Select</option>
                                {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.commune', 'Commune')} *</label>
                              <input type="text" value={commune} onChange={(e) => setCommune(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                placeholder="e.g. Bab El Oued"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.address', 'Detailed Address')} *</label>
                            <input type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                              placeholder={t('checkout.addressPlaceholder', 'e.g. Near the main post office')}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.preciseAddress', 'Address')} *</label>
                            <input ref={addressInputRef} type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                              placeholder={t('checkout.searchStreet', 'Street, building number...')}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {checkoutConfig?.fields?.showCity !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.city', 'City')} *</label>
                                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.city', 'City')}
                                />
                              </div>
                            )}
                            {checkoutConfig?.fields?.showPostalCode !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.postalCode', 'Postal Code')}</label>
                                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder="Code"
                                />
                              </div>
                            )}
                          </div>
                          {checkoutConfig?.fields?.showProvince !== false && (
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.province', 'Province / State')} *</label>
                              {uniqueWilayas.length > 0 ? (
                                <select value={province} onChange={(e) => setProvince(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white"
                                >
                                  <option value="">{t('checkout.selectProvince', 'Select Province')}</option>
                                  {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                              ) : (
                                <input type="text" value={province} onChange={(e) => setProvince(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.province', 'Province')}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {checkoutConfig?.addressAutocomplete && checkoutConfig?.autocompleteApiKey && (
                    <Script src={`https://maps.googleapis.com/maps/api/js?key=${checkoutConfig.autocompleteApiKey}&libraries=places`} />
                  )}

                  {/* Coupon */}
                  {!couponsDisabled && (
                    <div className="pt-3 border-t border-slate-100">
                      {!appliedCoupon ? (
                        <div>
                          <button onClick={() => setShowCouponInput(!showCouponInput)}
                            className="text-indigo-600 font-bold text-sm hover:underline"
                          >
                            {t('checkout.haveCoupon', '🏷️ Have a coupon?')}
                          </button>
                          {showCouponInput && (
                            <div className="flex gap-2 mt-2">
                              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 uppercase"
                                placeholder="DISCOUNT20"
                              />
                              <button onClick={handleApplyCoupon} className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                {t('checkout.apply', 'Apply')}
                              </button>
                            </div>
                          )}
                          {couponError && <p className="text-rose-500 text-xs font-bold mt-2">{couponError}</p>}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <div className="text-emerald-700 font-bold text-xs">{t('checkout.couponApplied', '✓ Coupon Applied!')}</div>
                            <div className="text-emerald-600 font-black">{appliedCoupon.type === 'fixed' ? `-${appliedCoupon.value} ${currency}` : `-${appliedCoupon.value}%`}</div>
                          </div>
                          <button onClick={handleRemoveCoupon} className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors underline">Remove</button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Delivery Note */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={addingNote} onChange={(e) => setAddingNote(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                      />
                      <span className="text-sm font-bold text-slate-600">{t('checkout.notes', '📝 Add delivery note')}</span>
                    </label>
                    {addingNote && (
                      <textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)}
                        rows={2} className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 resize-none text-sm"
                        placeholder={t('checkout.notesPlaceholder', 'Any special instructions for the delivery driver?')}
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setStep(1)}
                    className="px-5 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ← {t('checkout.back', 'Back')}
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={
                      checkoutConfig?.showAddressFields !== false
                        ? (region === 'dz' && !checkoutConfig?.addressAutocomplete
                          ? (!wilaya || !commune || !detailedAddress)
                          : (!detailedAddress || (checkoutConfig?.fields?.showCity !== false && !city) || (checkoutConfig?.fields?.showProvince !== false && !province)))
                        : false
                    }
                    style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                    className={`flex-1 py-4 px-5 text-white font-black text-lg rounded-xl transition-all flex justify-center items-center gap-2 ${!store?.primaryColor ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-[0_8px_30px_rgb(22,163,74,0.3)]' : 'hover:opacity-90'} disabled:bg-slate-300 disabled:cursor-not-allowed`}
                  >
                    <Truck size={20} />
                    {t('checkout.orderNow', 'CONFIRM ORDER')}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Floating Total Bar — only on Step 1 */}
        {step === 1 && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] py-3 px-5 z-50">
            <div className="max-w-lg mx-auto flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('checkout.totalDue', 'Total')}</div>
                <div className={`text-2xl font-black text-indigo-600 transition-transform ${isAnimatingPrice ? 'scale-110 text-rose-500' : ''}`}>
                  {isMounted ? finalTotal : '0'} <span className="text-base">{currency}</span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 font-medium">
                {isMounted ? cart.length : 0} {t('checkout.items', 'item(s)')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
