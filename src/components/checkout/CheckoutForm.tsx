'use client';

import { use, useEffect, useState, useRef, useMemo } from 'react';
import { useFunnelStore, CartItem } from '@/lib/store/useFunnelStore';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { ShieldCheck, Truck, ArrowRight, PackagePlus, MapPin, Edit3, User, Phone, Mail } from 'lucide-react';
import { saveDraftOrder, submitOrder } from '@/lib/actions/funnelActions';
import { resolveStore, Coupon } from '@/lib/store/useAdminStore';
import { useStorefrontStore } from '@/lib/store/useStorefrontStore';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { usePixelEvent } from '@/hooks/usePixelEvent';
import { getCommunesForWilaya } from '@/lib/algeria-communes';

export function CheckoutForm({ storeSlug, embedded = false, forceProductId }: { storeSlug: string, embedded?: boolean, forceProductId?: string }) {
  const [step, setStep] = useState(1);
  const [isAnimatingPrice, setIsAnimatingPrice] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [utmSource, setUtmSource] = useState<string>('');  
  const [utmCampaign, setUtmCampaign] = useState<string>('');
  const [selectedOfferId, setSelectedOfferId] = useState<string>('default-1');

  const { 
    customerName, phone, draftOrderId, cart, getTotalPrice,
    setLead, setDraftOrderId, addCartItem, removeCartItem, buyNow,
    setAddressData, setDeliveryInstructions, deliveryInstructions, setStatus
  } = useFunnelStore();

  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPrice = getTotalPrice();

  const { availableStores, shippingZones, checkoutConfigs, setOrders, products, setProducts, setAbandonedCarts, coupons, setCoupons, addActivityLog, customerBlacklist } = useStorefrontStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const isArabic = ['dz', 'sa', 'ae', 'ma', 'eg', 'ar'].includes(region.toLowerCase());
  const { t } = useTranslation(region);
  const currency = store ? t(`currency.${store.currency.toLowerCase()}`, store.currency) : (region === 'ro' ? 'RON' : region === 'co' ? 'COP' : 'DZD');
  const zones = store ? shippingZones.filter(z => z.storeId === store.id) : [];
  const checkoutConfig = store ? checkoutConfigs.find(c => c.storeId === store.id) : undefined;
  const prefix = store?.phonePrefix || (region === 'dz' ? '+213' : region === 'ro' ? '+40' : '+57');
  const isOneStep = checkoutConfig?.layout === '1-step';

  // Track InitiateCheckout
  const cartIds = cart.map(i => i.id);
  usePixelEvent('InitiateCheckout', {
    value: totalPrice,
    currency,
    content_ids: cartIds,
    content_type: 'product'
  });

  // Always mark as mounted on client — do NOT rely on external script onLoad for this
  useEffect(() => {
    setIsMounted(true);
    // Read UTM data from sessionStorage (captured by UTMTracker on landing)
    setUtmSource(sessionStorage.getItem('utm_source') || '');
    setUtmCampaign(sessionStorage.getItem('utm_campaign') || '');
  }, []);

  // Force single product if used on a landing page via forceProductId
  useEffect(() => {
    if (forceProductId && products.length > 0) {
      const primaryItem = cart.find(i => !i.isUpsell);
      if (!primaryItem || primaryItem.id !== forceProductId) {
        const p = products.find(prod => prod.id === forceProductId);
        if (p) {
          buyNow({ id: p.id, name: p.title, price: p.price, isUpsell: false });
        }
      }
    }
  }, [forceProductId, products, cart, buyNow]);
  
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
  const [deliveryType, setDeliveryType] = useState<'home' | 'desk'>('home');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);

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
          setWilaya(stateVal);
          setCommune(cityVal);

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

  // Auto-select and apply the default quantity offer when the cart product changes
  useEffect(() => {
    const state = useFunnelStore.getState();
    const mainItem = state.cart.find(i => !i.isUpsell);
    if (!mainItem) return;
    
    // We already have a specific quantity chosen from the product page
    const currentQty = mainItem.quantity || 1;

    const product = products.find(p => p.id === mainItem.id);
    if (product?.quantityOffers && product.quantityOffers.length > 0) {
       const matchedOffer = product.quantityOffers.find(o => o.qty === currentQty);
       if (matchedOffer) setSelectedOfferId(matchedOffer.id);
       else if (currentQty === 1) setSelectedOfferId('default-1');
    } else {
       if (currentQty === 1) setSelectedOfferId('default-1');
    }
    
    // We only set selected quantity if it's already defined via URL or previous step (like in cart),
    // but we won't auto-select a default offer.
    // If the cart doesn't have a quantity or has 1, we still want to keep the radio buttons unselected 
    // unless they explicitly chose one. By default, selectedOfferId is matched.
    // We will just let the user explicitly click if they want a bundle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

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
    if (!embedded && cart.length === 0 && !productId) {
      const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
      router.push(isCustomDomain ? '/' : `/${region}`);
    }
  }, [cart.length, region, router, searchParams, products, addCartItem, embedded]);

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
    if (!store?.whatsappConfig?.abandonedCartEnabled || !store?.whatsappConfig?.metaEnabled || !store?.whatsappConfig?.metaAbandonedCartTemplateName) return;
    
    const delay = (store.whatsappConfig.abandonedCartDelayMinutes || 15) * 60 * 1000;
    abandonedCartTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/meta/abandoned-cart', {
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
    if (draftOrderId && store?.whatsappConfig?.abandonedCartEnabled && store?.whatsappConfig?.metaEnabled && store?.whatsappConfig?.metaAbandonedCartTemplateName) {
      const delay = (store.whatsappConfig.abandonedCartDelayMinutes || 15) * 60 * 1000;
      const draftCreatedKey = `abandoned_ts_${draftOrderId}`;
      const created = parseInt(sessionStorage.getItem(draftCreatedKey) || '0', 10);
      if (created && Date.now() - created >= delay) {
        fetch('/api/meta/abandoned-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: store.id, orderId: draftOrderId })
        }).catch(() => {});
      }
    }
  }, [draftOrderId, store?.id]);

  // Auto-Save Draft Order for Abandoned Carts when user types info (crucial for 1-step checkout or embedded forms)
  useEffect(() => {
    const isValidPhone = phone && (phone.startsWith('0') ? phone.length >= 10 : phone.length >= 9);
    const hasName = customerName && customerName.length > 2;

    if (isValidPhone && hasName) {
      const handler = setTimeout(async () => {
        let localOrderId = draftOrderId;
        let isNew = false;
        if (!localOrderId) {
          localOrderId = `ABN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
          setDraftOrderId(localOrderId);
          isNew = true;
        }

        if (store) {
          setAbandonedCarts((prev: any[]) => {
            const filtered = prev.filter(c => c.id !== localOrderId);
            return [{
              id: localOrderId,
              storeId: store.id,
              customer: `${customerName} ${lastName || ''}`.trim(),
              phone: `${prefix}${phone.replace(/^0+/, '')}`,
              product: cart.map(c => c.isUpsell ? `[Add-on] ${c.name}` : c.name).join(', '),
              total: finalTotal,
              step: isOneStep ? 'Checkout' : 'Contact Info',
              date: new Date().toISOString()
            }, ...filtered];
          });
          
          if (isNew) {
            sessionStorage.setItem(`abandoned_ts_${localOrderId}`, Date.now().toString());
            startAbandonedCartTimer(localOrderId);
          }
        }

        try {
          const res = await saveDraftOrder({
            id: localOrderId,
            name: customerName,
            phone: `${prefix}${phone.replace(/^0+/, '')}`,
            region,
            storeId: store?.id,
            source: utmSource || undefined,
            utmCampaign: utmCampaign || undefined,
            product: cart.map(c => c.isUpsell ? `[Add-on] ${c.name}` : c.name).join(', '),
          });
          if (res?.success && res.orderId && res.orderId !== localOrderId) {
            setDraftOrderId(res.orderId);
          }
        } catch (err) {
          console.warn('[Auto-Save Draft] Failed:', err);
        }
      }, 2000); // 2 second debounce

      return () => clearTimeout(handler);
    }
  }, [phone, customerName, lastName, draftOrderId, store, prefix, cart, finalTotal, region, utmSource, utmCampaign, isOneStep]);


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
      setAbandonedCarts((prev: any[]) => {
        // remove existing if updating
        const filtered = prev.filter(c => c.id !== localOrderId);
        return [{
          id: localOrderId,
          storeId: store.id,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          product: cart.map(c => c.isUpsell ? `[Add-on] ${c.name}` : c.name).join(', '),
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
        storeId: store?.id,
        source: utmSource || undefined,
        utmCampaign: utmCampaign || undefined,
        product: cart.map(c => c.isUpsell ? `[Add-on] ${c.name}` : c.name).join(', '),
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

  // Countdown timer removed in favor of Trust Banner

  const handleComplete = async () => {
    // Check blacklist first
    if (store && customerBlacklist) {
      const isBlacklisted = customerBlacklist.some(b => b.storeId === store.id && b.phone === phone);
      if (isBlacklisted) {
        alert(t('checkout.error.blacklisted', 'We cannot process your order at this time. Please contact support.'));
        return;
      }
    }

    setStatus('CONFIRMING');

    // Clear abandoned cart timer
    if (abandonedCartTimerRef.current) {
      clearTimeout(abandonedCartTimerRef.current);
      abandonedCartTimerRef.current = null;
    }

    // Build address object
    const finalAddress = region === 'dz' 
      ? { wilaya, commune, landmark: `[${deliveryType === 'desk' ? 'Stop Desk' : 'Home Delivery'}] ${detailedAddress}` }
      : { 
          address: `[${deliveryType === 'desk' ? 'Stop Desk' : 'Home Delivery'}] ${detailedAddress}`, 
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
      setOrders((prev: any[]) => [
        {
          id: finalOrderId,
          storeId: store.id,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          address: region === 'dz' 
            ? `[${deliveryType === 'desk' ? 'Stop Desk' : 'Home Delivery'}] ` + detailedAddress + (Object.entries(customFieldsData).map(([k,v]) => ` | ${checkoutConfig?.customFields?.find(f=>f.id===k)?.label}: ${v}`).join(''))
            : `[${deliveryType === 'desk' ? 'Stop Desk' : 'Home Delivery'}] ` + `${detailedAddress}` + (Object.entries(customFieldsData).map(([k,v]) => ` | ${checkoutConfig?.customFields?.find(f=>f.id===k)?.label}: ${v}`).join('')),
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
        setAbandonedCarts((prev: any[]) => prev.filter((c: any) => c.id !== draftOrderId));
      }

      // Mark coupon as used
      if (appliedCoupon) {
        setCoupons((prev: any[]) => prev.map((c: any) => c.id === appliedCoupon.id ? { ...c, usedCount: c.usedCount + 1 } : c));
      }

      // Decrement stock and check for stockout
      let stockoutProduct = '';
      setProducts((prev: any[]) => prev.map((p: any) => {
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

      // Get staff emails assigned to this store
      const staffAssignments = (store?.translations as any)?.staffAssignments || {};
      const staffEmailsMap = (store?.translations as any)?.staffEmails || {};
      const staffEmailsToNotify: string[] = [];

      if (store?.id) {
        Object.keys(staffAssignments).forEach(staffId => {
          const assignedStores = staffAssignments[staffId] || [];
          if (assignedStores.includes(store.id)) {
            const email = staffEmailsMap[staffId];
            if (email && /^\\S+@\\S+\\.\\S+$/.test(email)) {
               staffEmailsToNotify.push(email);
            }
          }
        });
      }

      // Fire email notification asynchronously
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: store?.name || '',
          orderId: finalOrderId,
          total: finalTotal,
          currency: store?.currency || '',
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          region: store?.region || '',
          resendApiKey: store?.resendApiKey,
          notifyEmail: store?.notifyEmail,
          staffEmails: staffEmailsToNotify
        })
      }).catch(err => console.error("Email notification failed:", err));

      if (stockoutProduct) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeName: store?.name || '',
            orderId: finalOrderId,
            total: 0,
            currency: store?.currency || '',
            customer: stockoutProduct,
            phone: '',
            region: store?.region || '',
            resendApiKey: store?.resendApiKey,
            notifyEmail: store?.notifyEmail,
            staffEmails: staffEmailsToNotify,
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

    // Await the server action BEFORE navigation so it doesn't get cancelled by the browser
    if (finalOrderId) {
      try {
        await submitOrder(finalOrderId, region, {
          customerName,
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          address: finalAddress,
          instructions: addingNote ? deliveryInstructions : '',
          cart,
          total: finalTotal,
          discountAmount: discountAmount,
          deliveryRate: deliveryRate,
          couponCode: appliedCoupon ? appliedCoupon.code : '',
          customFields: customFieldsData,
          storeId: store?.id,
          source: utmSource || undefined,
          utmCampaign: utmCampaign || undefined,
        });
      } catch (err) {
        console.warn("Server submitOrder failed or is not configured, using local fallback", err);
      }
    }

    // Redirect user after submission
    setStatus('SUCCESS');
    const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
    router.push(isCustomDomain ? '/thank-you' : `/${storeSlug}/thank-you`);
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
              name: cfg.titleOverride ? `${cfg.titleOverride} (${target.title})` : target.title,
              price: Number(cfg.customPrice),
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
      setAbandonedCarts((prev: any[]) => {
        const filtered = prev.filter(c => c.id !== localOrderId);
        return [{
          id: localOrderId, storeId: store.id,
          customer: `${customerName} ${lastName}`.trim(),
          phone: `${prefix}${phone.replace(/^0+/, '')}`,
          product: cart.map(c => c.isUpsell ? `[Add-on] ${c.name}` : c.name).join(', '), total: finalTotal,
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
        region, storeId: store?.id, source: utmSource || undefined, utmCampaign: utmCampaign || undefined,
        product: cart.map(c => c.isUpsell ? `[Add-on] ${c.name}` : c.name).join(', '),
      });
      if (res?.success && res.orderId && res.orderId !== localOrderId) setDraftOrderId(res.orderId);
    } catch (err) {
      console.warn('saveDraftOrder failed, using local fallback', err);
    }
  };

  const mainCartItem = cart.find(i => !i.isUpsell);
  const mainProduct = mainCartItem ? products.find(p => p.id === mainCartItem.id) : null;

  const quantityOffers = useMemo(() => {
    let offers = (mainProduct?.quantityOffers && mainProduct.quantityOffers.length > 0)
      ? [...mainProduct.quantityOffers]
      : [];
      
    if (offers.length > 0 && !offers.some(o => o.qty === 1)) {
       // Insert default 1 quantity offer
       offers.unshift({
         id: 'default-1',
         qty: 1,
         label: `1x ${mainProduct?.title || 'Item'}`,
         price: mainProduct?.price || 0
       });
    }
    offers.sort((a,b) => a.qty - b.qty);
    return offers;
  }, [mainProduct]);

  const handleQuantitySelect = (offer: any) => {
    setSelectedOfferId(offer.id);
    if (mainCartItem) {
      // Replace cart item entirely (remove old, add new with correct price)
      const updatedItem = {
        ...mainCartItem,
        name: offer.qty > 1 ? `${mainProduct?.title || mainCartItem.name} (${offer.label})` : (mainProduct?.title || mainCartItem.name),
        price: Number(offer.price),
        quantity: Number(offer.qty),
      };
      addCartItem(updatedItem);
    }
  };

  return (
    <div className={`font-sans ${embedded ? '' : 'min-h-screen bg-slate-50 py-8 px-4 pb-28'}`}>
      <div className="max-w-lg mx-auto">

        {/* Progress Tracker — 2 steps */}
        {!isOneStep && (
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
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-5 text-center border-b border-slate-100">


          </div>

          <div className="p-5 md:p-7">

            {/* ═══════════════════════════════════════════ */}
            {/* STEP 1: PRODUCT + UPSELLS + CONTACT INFO   */}
            {/* ═══════════════════════════════════════════ */}
            {(step === 1 || isOneStep) && (
              <div className="animate-in slide-in-from-right-4 fade-in duration-400">

                {/* ── Quantity Offers (Bundle Selector) ── */}
                {quantityOffers.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    {t('checkout.selectOffer', 'اختر العرض الخاص بك')}
                  </p>
                  <div className="space-y-3">
                    {quantityOffers.map(offer => {
                      const isSelected = selectedOfferId === offer.id;
                      const perItem = offer.qty > 1 ? Math.round(offer.price / offer.qty) : null;
                      return (
                        <label key={offer.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all relative ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}>
                          {offer.badge && <span className="absolute -top-2.5 right-4 bg-rose-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm">{offer.badge}</span>}
                          <input type="radio" name="quantity_offer" checked={isSelected} onChange={() => handleQuantitySelect(offer)} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-500 shrink-0" />
                          <div className="flex-1">
                            <p className={`font-black text-sm ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>{offer.label}</p>
                            {perItem && <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{perItem} {currency} / للقطعة</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-lg text-indigo-600">{offer.price} <span className="text-xs">{currency}</span></p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* ── Inline Upsells (if configured) ── */}
                {dynamicUpsells.length > 0 && checkoutConfig?.enableStep2Upsell !== false && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <PackagePlus size={15} className="text-amber-500" />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                        ⚡ {t('checkout.upsellTitle', 'إضافات حصرية — عرض محدود')}
                      </span>
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
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{t('checkout.upsellItemDesc', 'موصى به بشدة للحصول على أفضل النتائج')}</p>
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
                    {t('checkout.subtitle', '📋 معلومات الاتصال')}
                  </p>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      {checkoutConfig?.fields?.showLastName ? t('form.firstName', 'الاسم الأول') + ' *' : t('form.fullName', 'الاسم الكامل') + ' *'}
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text" value={customerName}
                        onChange={(e) => setLead(e.target.value, phone)}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                        placeholder={checkoutConfig?.fields?.showLastName ? 'e.g. John' : 'e.g. John Doe'}
                      />
                    </div>
                  </div>
                  {checkoutConfig?.fields?.showLastName && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('form.lastName', 'اللقب')} *</label>
                      <div className="relative">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                          placeholder="e.g. Doe"
                        />
                      </div>
                    </div>
                  )}
                  {checkoutConfig?.fields?.showEmail && (
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {t('form.email', 'البريد الإلكتروني')} {checkoutConfig?.fields?.requireEmail ? '*' : '(اختياري)'}
                      </label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                          placeholder="e.g. john@example.com"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('form.phone', 'رقم الهاتف')} *</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="tel" value={phone} dir="ltr" maxLength={10}
                        onChange={(e) => setLead(customerName, e.target.value.replace(/\D/g, ''))}
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900 tracking-wide text-left"
                        placeholder="0555 55 55 55"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{t('checkout.phoneHelper', 'أدخل رقمك يبدأ بـ 0 (مثال 0555 12 34 56)')}</p>
                  </div>
                  {checkoutConfig?.customFields?.map(field => (
                    <div key={field.id}>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">{field.label} {field.required ? '*' : '(اختياري)'}</label>
                      <input type="text" value={customFieldsData[field.id] || ''}
                        onChange={(e) => setCustomFieldsData({ ...customFieldsData, [field.id]: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-bold text-slate-900"
                      />
                    </div>
                  ))}
                </div>

                {/* ── Order Bumps (Cross-Sells) ── */}
                {mainProduct?.orderBumps && mainProduct.orderBumps.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {mainProduct.orderBumps.map(bump => {
                      const isBumpAdded = cart.some(i => i.id === bump.id);
                      return (
                        <label key={bump.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isBumpAdded ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 hover:border-amber-300 bg-slate-50'}`}>
                          <input 
                            type="checkbox" 
                            checked={isBumpAdded}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const targetProduct = bump.targetProductId ? products.find(p => p.id === bump.targetProductId) : null;
                                const bumpName = targetProduct ? targetProduct.title : bump.title;
                                addCartItem({ id: bump.id, name: bumpName, price: Number(bump.price), isUpsell: true, isBump: true, imageUrl: bump.image });
                              } else {
                                removeCartItem(bump.id);
                              }
                            }}
                            className="mt-1 w-5 h-5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 shrink-0" 
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-slate-900">{bump.title}</span>
                              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">+{bump.price} {currency}</span>
                            </div>
                            {bump.description && <p className="text-xs font-bold text-slate-500 mt-1">{bump.description}</p>}
                          </div>
                          {bump.image && (
                            <img src={bump.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-200 shrink-0" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}

                {!isOneStep && (
                  <button
                    type="button"
                    onClick={handleProceedToAddress}
                    disabled={!customerName || (phone.startsWith('0') ? phone.length < 10 : phone.length < 9) || !isCustomFieldsValid}
                    style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                    className={`w-full mt-6 py-4 px-6 text-white font-black text-lg rounded-xl transition-all flex justify-center items-center gap-2 group ${!store?.primaryColor ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800' : 'hover:opacity-90'} disabled:bg-slate-300 disabled:cursor-not-allowed`}
                  >
                    {t('checkout.next', 'متابعة لمعلومات التوصيل')}
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* STEP 2: ORDER SUMMARY + ADDRESS FORM            */}
            {/* ═══════════════════════════════════════════════ */}
            {(step === 2 || isOneStep) && (
              <div className={`animate-in slide-in-from-right-4 fade-in duration-400 ${isOneStep ? 'mt-8 pt-8 border-t-2 border-slate-100 border-dashed' : ''}`}>



                {/* ── Address Form ── */}
                <div className="space-y-4">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    <MapPin size={12} className="inline mr-1" />{t('checkout.deliveryInfo', 'عنوان التوصيل')}
                  </p>

                  <div className="flex gap-3 mb-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === 'home' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>
                      <input type="radio" checked={deliveryType === 'home'} onChange={() => setDeliveryType('home')} className="hidden" />
                      <span className="font-bold text-sm">🏠 {t('checkout.homeDelivery', 'توصيل للمنزل')}</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${deliveryType === 'desk' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'}`}>
                      <input type="radio" checked={deliveryType === 'desk'} onChange={() => setDeliveryType('desk')} className="hidden" />
                      <span className="font-bold text-sm">🏢 {t('checkout.stopDesk', 'توصيل للمكتب')}</span>
                    </label>
                  </div>

                  {checkoutConfig?.showAddressFields !== false && (
                    <>
                      {region === 'dz' ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.wilaya', 'الولاية')} *</label>
                              <div className="relative">
                                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select value={wilaya} onChange={(e) => { setWilaya(e.target.value); setCommune(''); }}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white appearance-none"
                                >
                                  <option value="" disabled>Select</option>
                                  {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.commune', 'البلدية')} *</label>
                              <div className="relative">
                                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select value={commune} onChange={(e) => setCommune(e.target.value)}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white appearance-none"
                                >
                                  <option value="" disabled>Select</option>
                                  {getCommunesForWilaya(wilaya).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                          {/* Only show detailed address for Home Delivery */}
                          {deliveryType === 'home' && (
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.address', 'العنوان بالتفصيل')} *</label>
                              <div className="relative">
                                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                  ref={checkoutConfig?.addressAutocomplete ? addressInputRef : undefined}
                                  type="text" 
                                  value={detailedAddress} 
                                  onChange={(e) => setDetailedAddress(e.target.value)}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.addressPlaceholder', 'مثال: بجوار البريد المركزي')}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          {deliveryType === 'home' && (
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.preciseAddress', 'العنوان بالتفصيل')} *</label>
                              <input ref={addressInputRef} type="text" value={detailedAddress} onChange={(e) => setDetailedAddress(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                placeholder={t('checkout.searchStreet', 'الشارع، رقم المبنى...')}
                              />
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            {checkoutConfig?.fields?.showCity !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.city', 'المدينة')} *</label>
                                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.city', 'المدينة')}
                                />
                              </div>
                            )}
                            {checkoutConfig?.fields?.showPostalCode !== false && (
                              <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.postalCode', 'الرمز البريدي')}</label>
                                <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder="Code"
                                />
                              </div>
                            )}
                          </div>
                          {checkoutConfig?.fields?.showProvince !== false && (
                            <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('checkout.province', 'المقاطعة / الولاية')} *</label>
                              {uniqueWilayas.length > 0 ? (
                                <select value={province} onChange={(e) => setProvince(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 bg-white"
                                >
                                  <option value="">{t('checkout.selectProvince', 'اختر الولاية')}</option>
                                  {uniqueWilayas.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                              ) : (
                                <input type="text" value={province} onChange={(e) => setProvince(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                                  placeholder={t('checkout.province', 'الولاية')}
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
                          <button type="button" onClick={() => setShowCouponInput(!showCouponInput)}
                            className="text-indigo-600 font-bold text-sm hover:underline"
                          >
                            {t('checkout.haveCoupon', '🏷️ لديك كوبون خصم؟')}
                          </button>
                          {showCouponInput && (
                            <div className="flex gap-2 mt-2">
                              <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 uppercase"
                                placeholder="أدخل رمز الكوبون..."
                              />
                              <button type="button" onClick={handleApplyCoupon} className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                {t('checkout.apply', 'تطبيق')}
                              </button>
                            </div>
                          )}
                          {couponError && <p className="text-rose-500 text-xs font-bold mt-2">{couponError}</p>}
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <div className="text-emerald-700 font-bold text-xs">{t('checkout.couponApplied', '✓ تم تطبيق الكوبون!')}</div>
                            <div className="text-emerald-600 font-black">{appliedCoupon.type === 'fixed' ? `-${appliedCoupon.value} ${currency}` : `-${appliedCoupon.value}%`}</div>
                          </div>
                          <button type="button" onClick={handleRemoveCoupon} className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors underline">{t('checkout.remove', 'إزالة')}</button>
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
                      <span className="text-sm font-bold text-slate-600">{t('checkout.notes', '📝 إضافة ملاحظة للتوصيل')}</span>
                    </label>
                    {addingNote && (
                      <textarea value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)}
                        rows={2} className="w-full mt-2 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 resize-none text-sm"
                        placeholder={t('checkout.notesPlaceholder', 'أي تعليمات خاصة لسائق التوصيل؟')}
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  {!isOneStep && (
                    <button type="button" onClick={() => setStep(1)}
                      className="px-5 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                    >
                      ← {t('checkout.back', 'رجوع')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={
                      (isOneStep && (!customerName || (phone.startsWith('0') ? phone.length < 10 : phone.length < 9) || !isCustomFieldsValid)) ||
                      (checkoutConfig?.showAddressFields !== false
                        ? (region === 'dz'
                          ? (!wilaya || !commune || (deliveryType === 'home' && !detailedAddress))
                          : ((deliveryType === 'home' && !detailedAddress) || (checkoutConfig?.fields?.showCity !== false && !city) || (checkoutConfig?.fields?.showProvince !== false && !province)))
                        : false)
                    }
                    style={store?.primaryColor ? { backgroundColor: store.primaryColor } : {}}
                    className={`flex-1 py-4 px-5 text-white font-black text-lg rounded-xl transition-all flex justify-center items-center gap-2 ${!store?.primaryColor ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-[0_8px_30px_rgb(22,163,74,0.3)]' : 'hover:opacity-90'} disabled:bg-slate-300 disabled:cursor-not-allowed`}
                  >
                    <Truck size={20} />
                    {t('checkout.orderNow', 'تأكيد الطلب')} - {isMounted ? finalTotal : '...'} {currency}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Floating Total Bar — only on Step 1 */}
        {step === 1 && !embedded && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] py-3 px-5 z-50">
            <div className="max-w-lg mx-auto flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('checkout.totalDue', 'الإجمالي')}</div>
                <div className={`text-2xl font-black text-indigo-600 transition-transform ${isAnimatingPrice ? 'scale-110 text-rose-500' : ''}`}>
                  {isMounted ? finalTotal : '0'} <span className="text-base">{currency}</span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400 font-medium">
                {isMounted ? cart.length : 0} {t('checkout.items', 'منتج')}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
