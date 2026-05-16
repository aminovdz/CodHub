'use client';

import { useState, useEffect } from 'react';
import { useAdminStore, ShippingZone, CheckoutConfig } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { Save, Truck, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';

const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
  storeId: '',
  addressAutocomplete: true,
  autocompleteApiKey: '',
  fields: {
    showEmail: false,
    requireEmail: false,
    showLastName: false
  },
  customFields: [],
  enableStep2Upsell: true,
  enablePostPurchaseOTO: false,
  countdownMinutes: 5
};

const ALGERIA_WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra", "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret", "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda", "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem", "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arreridj", "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela", "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent", "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal", "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
];

export default function AdminCheckoutEditor() {
  const { 
    activeStore, 
    shippingZones, 
    checkoutConfigs, 
    saveCheckoutConfig, 
    saveShippingZones,
    addActivityLog 
  } = useAdminStore();
  const { notify } = useNotificationStore();
  
  const [config, setConfig] = useState<CheckoutConfig>({ ...DEFAULT_CHECKOUT_CONFIG, storeId: activeStore.id });
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
  }, [activeStore.id, checkoutConfigs, shippingZones]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // Save Config to Supabase
      await saveCheckoutConfig(config);

      // Save Zones to Supabase
      await saveShippingZones(activeStore.id, zones);

      notify('Checkout Settings & Shipping Zones Saved!', 'success');
      addActivityLog({
        action: 'Updated Checkout & Shipping Settings',
        details: `Updated configuration and ${zones.length} shipping zones for ${activeStore.name}`,
        storeId: activeStore.id,
        agentName: 'Admin'
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checkout Settings</h1>
        <p className="text-slate-500 font-medium">Configure shipping zones and checkout behavior for <span className="font-bold text-indigo-600">{activeStore.name}</span>.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* General Settings */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <MapPin className="text-indigo-600" /> General Checkout Settings
          </h2>
          
          <div className="space-y-4 mb-6">
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
              <button onClick={handleAddCustomField} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
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
                    <button onClick={() => handleRemoveCustomField(field.id)} className="text-rose-500 hover:text-rose-700 p-1">
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

        {/* Shipping Zones */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Truck className="text-indigo-600" /> Shipping Zones & Rates
            </h2>
            <button type="button" onClick={addZone} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
              <Plus size={16} /> Add Zone
            </button>
          </div>
          
          <p className="text-sm text-slate-500 mb-6">Define specific delivery rates for Wilayas (States) and Communes. Leave Commune blank to apply the rate to the entire Wilaya.</p>
          
          <div className="space-y-4">
            {zones.map((zone) => (
              <div key={zone.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Wilaya / State</label>
                    <select value={zone.wilaya} onChange={e => updateZone(zone.id, { wilaya: e.target.value })} required className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-sm bg-white">
                      <option value="">Select Wilaya</option>
                      {ALGERIA_WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                      <option value="Other">Other / International</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Commune (Optional)</label>
                    <input type="text" value={zone.commune} onChange={e => updateZone(zone.id, { commune: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="e.g. Bab Ezzouar" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Delivery Rate ({activeStore.currency})</label>
                    <input type="number" min="0" value={zone.deliveryRate} onChange={e => updateZone(zone.id, { deliveryRate: Number(e.target.value) })} required className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-indigo-600 text-sm" />
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
