'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, ShippingZone, CheckoutConfig, ALGERIA_WILAYAS, COUNTRY_DATA } from '@/lib/store/useAdminStore';
import { ALGERIA_COMMUNES } from '@/lib/algeria-communes';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { Save, Truck, Plus, Trash2, MapPin, Loader2, ShoppingCart, ShieldAlert, ShieldCheck, MessageCircle, Clock, CheckCircle2, Copy, Zap, Flame } from 'lucide-react';

const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
  storeId: '',
  addressAutocomplete: true,
  autocompleteApiKey: '',
  fields: {
    showEmail: false,
    requireEmail: false,
    showLastName: false,
    showCity: true,
    showPostalCode: true,
    showProvince: true,
    showCountry: true
  },
  customFields: [],
  enableStep2Upsell: true,
  enablePostPurchaseOTO: false,
  enableTrustBanner: true,
  enableDigitalReceipt: true,
  thankYouMessage: '',
  showAddressFields: true
};



export default function AdminCheckoutEditor() {
  const { 
    activeStore, 
    shippingZones, 
    checkoutConfigs, 
    saveCheckoutConfig, 
    saveShippingZones,
    updateStore,
    availableStores,
    addActivityLog 
  } = useAdminStore();
  const { notify } = useNotificationStore();
  
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';
  
  const [config, setConfig] = useState<CheckoutConfig>({ ...DEFAULT_CHECKOUT_CONFIG, storeId: activeStore.id });
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [cloneStoreId, setCloneStoreId] = useState('');
  const [activeTab, setActiveTab] = useState<'checkout' | 'shipping'>('checkout');
  const [stickyBuyEnabled, setStickyBuyEnabled] = useState(activeStore.stickyBuyButton?.enabled ?? false);
  const [stickyBuyText, setStickyBuyText] = useState(activeStore.stickyBuyButton?.text || 'Order Now');
  const [stickyBuyCss, setStickyBuyCss] = useState(activeStore.stickyBuyButton?.customCss || '');


  useEffect(() => {
    const existing = checkoutConfigs.find(c => c.storeId === activeStore.id);
    if (existing) {
      setConfig({
        ...DEFAULT_CHECKOUT_CONFIG,
        ...existing,
        fields: { ...DEFAULT_CHECKOUT_CONFIG.fields, ...(existing.fields || {}) },
        customFields: existing.customFields || []
      });
    } else {
      setConfig({ ...DEFAULT_CHECKOUT_CONFIG, storeId: activeStore.id });
    }

    setZones(shippingZones.filter(z => z.storeId === activeStore.id));
    setStickyBuyEnabled(activeStore.stickyBuyButton?.enabled ?? false);
    setStickyBuyText(activeStore.stickyBuyButton?.text || 'Order Now');
    setStickyBuyCss(activeStore.stickyBuyButton?.customCss || '');
  }, [activeStore.id, checkoutConfigs, shippingZones, activeStore.stickyBuyButton]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Save Config to Supabase
      await saveCheckoutConfig(config);

      // Save Fraud Config to Store
      await updateStore(activeStore.id, { stickyBuyButton: { enabled: stickyBuyEnabled, text: stickyBuyText, customCss: stickyBuyCss } });

      // Save Zones to Supabase
      await saveShippingZones(activeStore.id, zones);

      notify('Checkout Settings & Shipping Zones Saved!', 'success');
      addActivityLog({
        action: 'Updated Checkout & Shipping Settings',
        detail: `Updated configuration, fraud rules, and ${zones.length} shipping zones for ${activeStore.name}`,
        storeId: activeStore.id,
        user: sessionUser
      });
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addZone = () => {
    setZones([...zones, { id: 'zone_' + Date.now(), storeId: activeStore.id, wilaya: '', commune: '', deliveryRate: 0 }]);
  };

  const updateZone = (id: string, updates: Partial<ShippingZone>) => {
    setZones(zones.map(z => z.id === id ? { ...z, ...updates } : z));
  };

  const removeZone = (id: string) => {
    setZones(zones.filter(z => z.id !== id));
  };

  const handleAddCustomField = () => {
    const label = prompt('Enter the label for the new custom field (e.g. National ID):');
    if (label && label.trim()) {
      setConfig({
        ...config,
        customFields: [
          ...config.customFields,
          { id: 'cf_' + Date.now(), label: label.trim(), required: false }
        ]
      });
    }
  };

  const handleRemoveCustomField = (id: string) => {
    setConfig({
      ...config,
      customFields: config.customFields.filter(f => f.id !== id)
    });
  };
  
  const bulkImportWilayas = (countryCode: string = 'DZ') => {
    const country = COUNTRY_DATA[countryCode] || COUNTRY_DATA['DZ'];
    const newZones = country.states.map(stateName => ({
      id: 'zone_' + Math.random().toString(36).substr(2, 9),
      storeId: activeStore.id,
      wilaya: stateName,
      commune: '',
      deliveryRate: 0
    }));
    
    // Only add states that aren't already there
    const existingStates = new Set(zones.map(z => z.wilaya));
    const toAdd = newZones.filter(z => !existingStates.has(z.wilaya));
    
    if (toAdd.length === 0) {
      notify(`All states for ${country.name} are already added.`, 'info');
      return;
    }
    
    setZones([...zones, ...toAdd]);
    notify(`Added ${toAdd.length} regions for ${country.name}.`, 'success');
  };

  const handleCloneZones = () => {
    if (!cloneStoreId) return;
    
    const sourceZones = shippingZones.filter(z => z.storeId === cloneStoreId);
    if (sourceZones.length === 0) {
      notify('The selected store has no shipping zones to clone.', 'error');
      return;
    }
    
    const clonedZones = sourceZones.map(z => ({
      ...z,
      id: 'zone_' + Math.random().toString(36).substr(2, 9),
      storeId: activeStore.id
    }));
    
    setZones(clonedZones);
    notify(`Cloned ${clonedZones.length} zones from the selected store.`, 'success');
    setCloneStoreId('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout Settings</h1>
        <p className="text-slate-500 font-medium">Configure shipping zones and checkout behavior for <span className="font-bold text-indigo-600">{activeStore.name}</span>.</p>
      </div>

      <div className="flex border-b border-slate-200 mb-8 space-x-8">
        <button
          type="button"
          onClick={() => setActiveTab('checkout')}
          className={`pb-4 font-bold transition-colors border-b-2 ${activeTab === 'checkout' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Checkout Configuration
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('shipping')}
          className={`pb-4 font-bold transition-colors border-b-2 ${activeTab === 'shipping' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Shipping Zones & Rates
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {activeTab === 'checkout' && (
          <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <MapPin className="text-indigo-600" /> General Checkout Settings
          </h2>
          <div className="space-y-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Product Page Checkout Behavior</div>
              <div className="text-sm text-slate-500 mb-4">Choose how the checkout form is presented when a customer clicks "Buy Now" on a product page.</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${config.productCheckoutType === 'redirect' || !config.productCheckoutType ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input 
                    type="radio" 
                    name="checkoutType" 
                    value="redirect" 
                    checked={config.productCheckoutType === 'redirect' || !config.productCheckoutType} 
                    onChange={() => setConfig({...config, productCheckoutType: 'redirect'})} 
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span className="ml-3 font-bold text-sm text-slate-700">Redirect to Checkout</span>
                </label>
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${config.productCheckoutType === 'popup' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input 
                    type="radio" 
                    name="checkoutType" 
                    value="popup" 
                    checked={config.productCheckoutType === 'popup'} 
                    onChange={() => setConfig({...config, productCheckoutType: 'popup'})} 
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span className="ml-3 font-bold text-sm text-slate-700">Popup Modal</span>
                </label>
                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${config.productCheckoutType === 'inline' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                  <input 
                    type="radio" 
                    name="checkoutType" 
                    value="inline" 
                    checked={config.productCheckoutType === 'inline'} 
                    onChange={() => setConfig({...config, productCheckoutType: 'inline'})} 
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span className="ml-3 font-bold text-sm text-slate-700">Inline Form</span>
                </label>
              </div>
            </div>

            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
              <div>
                <div className="font-bold text-slate-900">Address Autocomplete</div>
                <div className="text-sm text-slate-500 mt-1">Automatically suggest Wilayas and Communes as the user types their address.</div>
              </div>
              <input type="checkbox" checked={config.addressAutocomplete} onChange={e => setConfig({...config, addressAutocomplete: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
            </label>

            {config.addressAutocomplete && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 ml-6 animate-in fade-in">
                <label className="block text-sm font-bold text-slate-700 mb-2">Google Maps API Key</label>
                <input 
                  type="text" 
                  value={config.autocompleteApiKey || ''}
                  onChange={e => setConfig({...config, autocompleteApiKey: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm"
                  placeholder="AIzaSyB..."
                />
                <p className="text-xs text-slate-500 mt-2">Required for Google Places autocomplete to function.</p>
              </div>
            )}
          </div>

          <h3 className="font-bold text-slate-900 mt-6 mb-4">Checkout Fields Configuration</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-700">Show Email Field</span>
              <input type="checkbox" checked={config.fields.showEmail} onChange={e => setConfig({...config, fields: {...config.fields, showEmail: e.target.checked}})} className="w-5 h-5 rounded text-indigo-600" />
            </label>
            {config.fields.showEmail && (
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer ml-6">
                <span className="font-bold text-slate-700">Make Email Required</span>
                <input type="checkbox" checked={config.fields.requireEmail} onChange={e => setConfig({...config, fields: {...config.fields, requireEmail: e.target.checked}})} className="w-5 h-5 rounded text-indigo-600" />
              </label>
            )}
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-700">Split First & Last Name</span>
              <input type="checkbox" checked={config.fields.showLastName} onChange={e => setConfig({...config, fields: {...config.fields, showLastName: e.target.checked}})} className="w-5 h-5 rounded text-indigo-600" />
            </label>
          </div>

          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900">Custom Extra Fields</h3>
              <button type="button" onClick={handleAddCustomField} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                <Plus size={14} /> Add Field
              </button>
            </div>
            <div className="space-y-3">
              {config.customFields?.map(field => (
                <div key={field.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-700">{field.label}</div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs font-bold text-slate-500">Required</span>
                      <input 
                        type="checkbox" 
                        checked={field.required}
                        onChange={e => {
                          const updated = config.customFields.map(f => f.id === field.id ? { ...f, required: e.target.checked } : f);
                          setConfig({ ...config, customFields: updated });
                        }}
                        className="w-4 h-4 rounded text-indigo-600"
                      />
                    </label>
                    <button type="button" onClick={() => handleRemoveCustomField(field.id)} className="text-rose-500 hover:text-rose-700 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {(!config.customFields || config.customFields.length === 0) && (
                <div className="text-sm text-slate-500 italic p-3 text-center border border-dashed border-slate-300 rounded-xl">No custom fields added.</div>
              )}
            </div>
          </div>
        </div>

        {/* Conversion & CRO */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ShoppingCart className="text-indigo-600" /> Conversion & Optimization (CRO)
          </h2>
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-700 mb-2">Checkout Layout Flow</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <label className={`cursor-pointer flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${config.layout !== '1-step' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}>
                  <div className="flex h-5 items-center mt-0.5">
                    <input type="radio" name="checkout_layout" checked={config.layout !== '1-step'} onChange={() => setConfig({...config, layout: '2-step'})} className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">2-Step (Default)</div>
                    <div className="text-xs text-slate-500 mt-1">Info & Upsells first, Delivery Address & Submit next.</div>
                  </div>
                </label>
                <label className={`cursor-pointer flex items-start gap-3 p-3 rounded-lg border-2 transition-all ${config.layout === '1-step' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300'}`}>
                  <div className="flex h-5 items-center mt-0.5">
                    <input type="radio" name="checkout_layout" checked={config.layout === '1-step'} onChange={() => setConfig({...config, layout: '1-step'})} className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">1-Step (Single Page)</div>
                    <div className="text-xs text-slate-500 mt-1">All fields and Order Summary on one scrolling page.</div>
                  </div>
                </label>
              </div>
            </div>

            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
              <div>
                <div className="font-bold text-slate-900">Enable Post-Purchase OTO</div>
                <div className="text-sm text-slate-500 mt-1">Show a one-time offer after order confirmed.</div>
              </div>
              <input type="checkbox" checked={config.enablePostPurchaseOTO} onChange={e => setConfig({...config, enablePostPurchaseOTO: e.target.checked})} className="w-5 h-5 rounded text-indigo-600" />
            </label>



            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
              <div>
                <div className="font-bold text-slate-900">Digital Receipts</div>
                <div className="text-sm text-slate-500 mt-1">Show the email capture block for digital receipts on Thank You page.</div>
              </div>
              <input type="checkbox" checked={config.enableDigitalReceipt !== false} onChange={e => setConfig({...config, enableDigitalReceipt: e.target.checked})} className="w-5 h-5 rounded text-indigo-600" />
            </label>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-indigo-500" /> Thank You Page Custom Message
              </label>
              <textarea 
                rows={3} 
                value={config.thankYouMessage || ''} 
                onChange={e => setConfig({...config, thankYouMessage: e.target.value})} 
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm resize-none"
                placeholder="Your order is now being processed..."
              />
            </div>
          </div>
        </div>

        {/* Urgency & Trust Engine */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Flame className="text-orange-500" /> Urgency & Trust Engine
          </h2>
          <div className="space-y-6">
            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-orange-300 transition-colors">
              <div>
                <div className="font-bold text-slate-900">Enable Scarcity Widgets</div>
                <div className="text-sm text-slate-500 mt-1">Show live viewers, low stock warnings, and trust badges on product pages.</div>
              </div>
              <input 
                type="checkbox" 
                checked={config.fields?.scarcityConfig?.enabled ?? true} 
                onChange={e => setConfig({...config, fields: {...config.fields, scarcityConfig: {...(config.fields.scarcityConfig || { stockText: '', viewersText: '', ordersTodayText: '', verifiedText: '', fastDeliveryText: '' }), enabled: e.target.checked}}})} 
                className="w-5 h-5 rounded text-orange-600 focus:ring-orange-500" 
              />
            </label>

            {(config.fields?.scarcityConfig?.enabled ?? true) && (
              <div className="space-y-4 pl-6 border-l-2 border-orange-100 animate-in fade-in">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Low Stock Warning Text</label>
                  <input 
                    type="text" 
                    value={config.fields?.scarcityConfig?.stockText ?? 'Only {stock} items left in stock!'}
                    onChange={e => setConfig({...config, fields: {...config.fields, scarcityConfig: {...(config.fields.scarcityConfig || {enabled:true,stockText:'',viewersText:'',ordersTodayText:'',verifiedText:'',fastDeliveryText:''}), stockText: e.target.value}}})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-600 outline-none font-medium text-sm"
                    placeholder="Only {stock} items left in stock!"
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {'{stock}'} to show the random stock number.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Live Viewers Text</label>
                  <input 
                    type="text" 
                    value={config.fields?.scarcityConfig?.viewersText ?? '{viewers} people viewing this'}
                    onChange={e => setConfig({...config, fields: {...config.fields, scarcityConfig: {...(config.fields.scarcityConfig || {enabled:true,stockText:'',viewersText:'',ordersTodayText:'',verifiedText:'',fastDeliveryText:''}), viewersText: e.target.value}}})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-600 outline-none font-medium text-sm"
                    placeholder="{viewers} people viewing this"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Orders Today Text</label>
                  <input 
                    type="text" 
                    value={config.fields?.scarcityConfig?.ordersTodayText ?? '{orders} orders today'}
                    onChange={e => setConfig({...config, fields: {...config.fields, scarcityConfig: {...(config.fields.scarcityConfig || {enabled:true,stockText:'',viewersText:'',ordersTodayText:'',verifiedText:'',fastDeliveryText:''}), ordersTodayText: e.target.value}}})}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-600 outline-none font-medium text-sm"
                    placeholder="{orders} orders today"
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {'{orders}'} for a random number of orders.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Verified Product Text</label>
                    <input 
                      type="text" 
                      value={config.fields?.scarcityConfig?.verifiedText ?? 'Verified Product'}
                      onChange={e => setConfig({...config, fields: {...config.fields, scarcityConfig: {...(config.fields.scarcityConfig || {enabled:true,stockText:'',viewersText:'',ordersTodayText:'',verifiedText:'',fastDeliveryText:''}), verifiedText: e.target.value}}})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-600 outline-none font-medium text-sm"
                      placeholder="Verified Product"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Fast Delivery Text</label>
                    <input 
                      type="text" 
                      value={config.fields?.scarcityConfig?.fastDeliveryText ?? 'Fast Delivery'}
                      onChange={e => setConfig({...config, fields: {...config.fields, scarcityConfig: {...(config.fields.scarcityConfig || {enabled:true,stockText:'',viewersText:'',ordersTodayText:'',verifiedText:'',fastDeliveryText:''}), fastDeliveryText: e.target.value}}})}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm"
                      placeholder="Fast Delivery"
                    />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500">
                  <span className="font-bold text-slate-700">Tip:</span> Leave any text field completely empty to hide that specific badge. For example, clearing the Fast Delivery text will hide the Fast Delivery badge.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Address & Field Controls */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <MapPin className="text-indigo-600" /> Address & Field Controls
          </h2>
          
          <div className="space-y-6">
            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
              <div>
                <div className="font-bold text-slate-900">Show Detailed Address Fields</div>
                <div className="text-sm text-slate-500 mt-1">Enable Wilaya, Commune, and Address inputs at checkout.</div>
              </div>
              <input type="checkbox" checked={config.showAddressFields !== false} onChange={e => setConfig({...config, showAddressFields: e.target.checked})} className="w-5 h-5 rounded text-indigo-600" />
            </label>

            {config.showAddressFields !== false && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-indigo-100">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-slate-700">Show City</span>
                  <input type="checkbox" checked={config.fields.showCity !== false} onChange={e => setConfig({...config, fields: {...config.fields, showCity: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600" />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-slate-700">Show Postal Code</span>
                  <input type="checkbox" checked={config.fields.showPostalCode !== false} onChange={e => setConfig({...config, fields: {...config.fields, showPostalCode: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600" />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-slate-700">Show Province</span>
                  <input type="checkbox" checked={config.fields.showProvince !== false} onChange={e => setConfig({...config, fields: {...config.fields, showProvince: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600" />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-slate-700">Show Country</span>
                  <input type="checkbox" checked={config.fields.showCountry !== false} onChange={e => setConfig({...config, fields: {...config.fields, showCountry: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600" />
                </label>
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer shadow-sm">
                  <span className="text-sm font-bold text-slate-700">Show Delivery Type (Home/Desk)</span>
                  <input type="checkbox" checked={config.fields.showDeliveryType === true} onChange={e => setConfig({...config, fields: {...config.fields, showDeliveryType: e.target.checked}})} className="w-4 h-4 rounded text-indigo-600" />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Buy Button Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <ShoppingCart className="w-6 h-6 text-indigo-600" /> Sticky Buy Button
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <div>
                <label className="font-bold text-sm text-slate-700 dark:text-slate-300">Enable Sticky Buy Button</label>
                <p className="text-xs text-slate-500 mt-1">Shows a fixed bottom bar with buy button when users scroll past the main CTA.</p>
              </div>
              <button
                type="button"
                onClick={() => setStickyBuyEnabled(!stickyBuyEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors ${stickyBuyEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${stickyBuyEnabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Button Text</label>
              <input
                type="text"
                value={stickyBuyText}
                onChange={e => setStickyBuyText(e.target.value)}
                placeholder="Order Now"
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
              />
              <p className="text-xs text-slate-500 mt-2">Text displayed on the sticky buy button.</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Custom CSS</label>
              <textarea
                value={stickyBuyCss}
                onChange={e => setStickyBuyCss(e.target.value)}
                placeholder=".sh-sticky-bar { background: #000; }&#10;.sh-sticky-bar-price { color: #fff; }&#10;.sh-sticky-bar-button { background: #ff6600; }"
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                spellCheck={false}
              />
              <p className="text-xs text-slate-500 mt-2">
                Available classes: <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar</code> (outer bar), 
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-inner</code> (inner row),
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-price</code> (price text),
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-compare</code> (compare price),
                <code className="bg-slate-200 dark:bg-slate-950 px-1 py-0.5 rounded text-xs">.sh-sticky-bar-button</code> (buy button).
              </p>
            </div>
          </div>
        </div>
        </div>
        )}

        {/* Shipping Zones */}
        {activeTab === 'shipping' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="text-indigo-600" /> Shipping Zones & Rates
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <select 
                  onChange={(e) => bulkImportWilayas(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase outline-none px-1 py-0.5 cursor-pointer"
                  defaultValue=""
                >
                  <option value="" disabled>Bulk Add...</option>
                  {Object.entries(COUNTRY_DATA).map(([code, data]) => (
                    <option key={code} value={code}>{data.name}</option>
                  ))}
                </select>
                <Zap size={12} className="text-slate-400 mr-1" />
              </div>
              <button type="button" onClick={addZone} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-xs hover:bg-indigo-100 transition-colors">
                <Plus size={16} /> Add Zone
              </button>
            </div>
          </div>

          <div className="mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-indigo-900 text-sm">Clone from Store</div>
              <div className="text-xs text-indigo-700">Import all zones and rates from another of your stores.</div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select 
                value={cloneStoreId} 
                onChange={e => setCloneStoreId(e.target.value)}
                className="flex-1 md:w-48 p-2 rounded-lg border border-indigo-200 bg-white text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Select Store...</option>
                {availableStores.filter(s => s.id !== activeStore.id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button 
                type="button" 
                onClick={handleCloneZones}
                disabled={!cloneStoreId}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs hover:bg-indigo-700 disabled:bg-slate-300 flex items-center gap-2 transition-colors"
              >
                <Copy size={14} /> Clone
              </button>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 mb-6">Define specific delivery rates for Wilayas (States) and Communes. Leave Commune blank to apply the rate to the entire Wilaya.</p>
          
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Wilaya / State</label>
                    <select value={zone.wilaya} onChange={e => updateZone(zone.id, { wilaya: e.target.value, commune: '' })} required className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-sm bg-white">
                      <option value="">Select Wilaya</option>
                      {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      <option value="Other">Other / International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Commune (Optional)</label>
                    {zone.wilaya && ALGERIA_COMMUNES[zone.wilaya] ? (
                      <select value={zone.commune} onChange={e => updateZone(zone.id, { commune: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm bg-white">
                        <option value="">All Communes</option>
                        {Array.from(new Set(ALGERIA_COMMUNES[zone.wilaya])).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={zone.commune} onChange={e => updateZone(zone.id, { commune: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="e.g. Bab Ezzouar" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Home Rate ({activeStore.currency})</label>
                    <input type="number" min="0" value={zone.deliveryRate} onChange={e => updateZone(zone.id, { deliveryRate: Number(e.target.value) })} required className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-indigo-600 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Desk Rate ({activeStore.currency})</label>
                    <input type="number" min="0" value={zone.deskRate || ''} onChange={e => updateZone(zone.id, { deskRate: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-indigo-600 text-sm" placeholder="Same as Home" />
                  </div>
                </div>
                <button type="button" onClick={() => removeZone(zone.id)} className="self-start mt-6 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            ))}
            {zones.length === 0 && (
              <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-medium">
                No shipping zones configured. Click "Add Zone".
              </div>
            )}
          </div>
        </div>
        )}

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 active:scale-95 transition-all text-white px-8 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200"
          >
            {isSaving ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={20} /> 
                Save Checkout Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
