'use client';

import { useState } from 'react';
import { Save, Globe, Type, Store as StoreIcon, Plus, Trash2, Code, Key, Copy, ListTree, MessageCircle, ShieldAlert, Users, ShoppingCart, Edit2, X } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { DEFAULT_TRANSLATIONS } from '@/lib/translations';
import { useEffect } from 'react';

export default function AdminSettingsPage() {
  const { 
    activeStore, availableStores, addStore, updateStore, removeStore, 
    orderStatuses, addOrderStatus, removeOrderStatus, 
    categories, setCategories, checkoutConfigs, saveCheckoutConfig, 
    globalApiKey, setGlobalApiKey, claudeApiKey, setClaudeApiKey, 
    openAiApiKey, setOpenAiApiKey, openRouterApiKey, setOpenRouterApiKey, 
    openRouterModel, setOpenRouterModel, aiProvider, setAiProvider 
  } = useAdminStore();
  
  // Layout & SEO Settings
  const [isRtl, setIsRtl] = useState(true);
  const [announcementText, setAnnouncementText] = useState('⚡ Flash Sale: 50% OFF All Items');
  const [seoTitle, setSeoTitle] = useState('CODHUB | The Premium Shopping Experience');
  const [seoDesc, setSeoDesc] = useState('Shop premium products with fast cash on delivery.');
  const [localApiKey, setLocalApiKey] = useState(globalApiKey || '');
  const [localClaudeKey, setLocalClaudeKey] = useState(claudeApiKey || '');
  const [localOpenAiKey, setLocalOpenAiKey] = useState(openAiApiKey || '');
  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(openRouterApiKey || '');
  const [localOpenRouterModel, setLocalOpenRouterModel] = useState(openRouterModel || 'meta-llama/llama-3.3-70b-instruct:free');
  const [localProvider, setLocalProvider] = useState<'gemini'|'claude'|'openai'|'openrouter'>(aiProvider || 'gemini');
  const [localPrimaryColor, setLocalPrimaryColor] = useState(activeStore.primaryColor || '#4F46E5');
  const [customDomain, setCustomDomain] = useState(activeStore.customDomain || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  // New Store State
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreRegion, setNewStoreRegion] = useState('');
  const [newStorePrefix, setNewStorePrefix] = useState('');
  const [newStoreCurrency, setNewStoreCurrency] = useState('');
  const [newStoreLanguage, setNewStoreLanguage] = useState('en');
  const [newStoreCustomDomain, setNewStoreCustomDomain] = useState('');

  // Status State
  const [newStatus, setNewStatus] = useState('');

  // Translations State
  const [translations, setTranslations] = useState<Record<string, string>>(activeStore.translations || {});

  // Integrations State
  const [resendApiKey, setResendApiKey] = useState(activeStore.resendApiKey || '');
  const [notifyEmail, setNotifyEmail] = useState(activeStore.notifyEmail || '');
  const [analytics, setAnalytics] = useState({
    google: activeStore.analytics?.google || '',
    facebook: activeStore.analytics?.facebook || '',
    tiktok: activeStore.analytics?.tiktok || '',
    snapchat: activeStore.analytics?.snapchat || '',
    pinterest: activeStore.analytics?.pinterest || ''
  });

  // Fulfillment State
  const [yalidineApiKey, setYalidineApiKey] = useState(activeStore.yalidineApiKey || '');
  const [yalidineApiToken, setYalidineApiToken] = useState(activeStore.yalidineApiToken || '');
  const [genericWebhookUrl, setGenericWebhookUrl] = useState(activeStore.genericWebhookUrl || '');

  // DZ Fulfillment Providers State
  const [dzFulfillment, setDzFulfillment] = useState(activeStore.dzFulfillment || {
    defaultProvider: 'yalidine' as const,
    yalidine: { apiKey: '', apiToken: '' },
    zrexpress: { apiKey: '', apiToken: '', branchId: '' },
    mayestro: { apiKey: '' },
    dhd: { apiKey: '', apiToken: '' }
  });

  // Checkout & Upsell State
  const [checkoutConfig, setCheckoutConfig] = useState({
    enableStep2Upsell: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableStep2Upsell ?? true,
    countdownMinutes: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.countdownMinutes ?? 5,
    enablePostPurchaseOTO: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enablePostPurchaseOTO ?? false,
    enableDigitalReceipt: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableDigitalReceipt ?? true,
    thankYouMessage: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.thankYouMessage ?? '',
    showAddressFields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.showAddressFields ?? true,
    fields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.fields || { showEmail: false, requireEmail: false, showLastName: false, showCity: true, showPostalCode: true, showProvince: true, showCountry: true },
  });

  // WhatsApp State
  const [whatsappConfig, setWhatsappConfig] = useState({
    abandonedCartEnabled: activeStore.whatsappConfig?.abandonedCartEnabled ?? false,
    abandonedCartDelayMinutes: activeStore.whatsappConfig?.abandonedCartDelayMinutes ?? 30,
    abandonedCartScript: activeStore.whatsappConfig?.abandonedCartScript || "Hello *[NAME]*, this is *[STORE_NAME]*. We noticed you were interested in *[PRODUCT]* but didn't complete your order. We still have it reserved for you! Would you like us to confirm this Cash on Delivery order and ship it to you? Order: #[ORDER_ID]",
    thankYouEnabled: activeStore.whatsappConfig?.thankYouEnabled ?? false,
    thankYouNumber: activeStore.whatsappConfig?.thankYouNumber || '',
    thankYouMessage: activeStore.whatsappConfig?.thankYouMessage || 'Hello, I want to confirm my order: [ORDER_ID]',
    aisensyEnabled: activeStore.whatsappConfig?.aisensyEnabled ?? false,
    aisensyApiKey: activeStore.whatsappConfig?.aisensyApiKey || '',
    aisensyCampaignName: activeStore.whatsappConfig?.aisensyCampaignName || '',
    aisensyTemplateParams: activeStore.whatsappConfig?.aisensyTemplateParams || '[NAME],[PRODUCT],[ADDRESS],[ORDER_ID]',
    aisensyIgnoreSelfConfirmed: activeStore.whatsappConfig?.aisensyIgnoreSelfConfirmed ?? true,
    chatbotEnabled: activeStore.whatsappConfig?.chatbotEnabled ?? false,
    chatbotName: activeStore.whatsappConfig?.chatbotName || 'Fatima',
    chatbotInstructions: activeStore.whatsappConfig?.chatbotInstructions || 'We offer free delivery for orders above 10,000 DZD. Return policy: 7 days free returns on defective items.',
    chatbotProvider: activeStore.whatsappConfig?.chatbotProvider || 'gemini',
    chatbotApiKey: activeStore.whatsappConfig?.chatbotApiKey || '',
  });

  // Fraud Rules State
  const [fraudConfig, setFraudConfig] = useState(activeStore.fraudConfig || {
    blockDuplicateIps: false,
    duplicateIpTimeframeHours: 24,
    requireApprovalForHighValue: false,
    highValueThreshold: 15000
  });

  // Staff Accounts State
  const { staffAccounts, addStaffAccount, updateStaffAccount, deleteStaffAccount } = useAdminStore();
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'fulfillment' | 'confirmation'>('fulfillment');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffStoreIds, setNewStaffStoreIds] = useState<string[]>([]);

  // Editing Staff State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'admin' | 'fulfillment' | 'confirmation'>('fulfillment');
  const [editStaffPin, setEditStaffPin] = useState('');
  const [editStaffStoreIds, setEditStaffStoreIds] = useState<string[]>([]);

  // Category State
  const { notify } = useNotificationStore();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; storeId: string; name: string }>({ isOpen: false, storeId: '', name: '' });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    setTranslations(activeStore.translations || {});
    setResendApiKey(activeStore.resendApiKey || '');
    setNotifyEmail(activeStore.notifyEmail || '');
    setAnalytics({
      google: activeStore.analytics?.google || '',
      facebook: activeStore.analytics?.facebook || '',
      tiktok: activeStore.analytics?.tiktok || '',
      snapchat: activeStore.analytics?.snapchat || '',
      pinterest: activeStore.analytics?.pinterest || ''
    });
    setYalidineApiKey(activeStore.yalidineApiKey || '');
    setYalidineApiToken(activeStore.yalidineApiToken || '');
    setGenericWebhookUrl(activeStore.genericWebhookUrl || '');

    setDzFulfillment(activeStore.dzFulfillment || {
      defaultProvider: 'yalidine',
      yalidine: { apiKey: '', apiToken: '' },
      zrexpress: { apiKey: '', apiToken: '', branchId: '' },
      mayestro: { apiKey: '' },
      dhd: { apiKey: '', apiToken: '' }
    });

    setCheckoutConfig({
      enableStep2Upsell: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableStep2Upsell ?? true,
      countdownMinutes: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.countdownMinutes ?? 5,
      enablePostPurchaseOTO: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enablePostPurchaseOTO ?? false,
      enableDigitalReceipt: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.enableDigitalReceipt ?? true,
      thankYouMessage: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.thankYouMessage ?? '',
      showAddressFields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.showAddressFields ?? true,
      fields: checkoutConfigs?.find(c=>c.storeId === activeStore.id)?.fields || { showEmail: false, requireEmail: false, showLastName: false, showCity: true, showPostalCode: true, showProvince: true, showCountry: true },
    });

    setWhatsappConfig({
      abandonedCartEnabled: activeStore.whatsappConfig?.abandonedCartEnabled ?? false,
      abandonedCartDelayMinutes: activeStore.whatsappConfig?.abandonedCartDelayMinutes ?? 30,
      abandonedCartScript: activeStore.whatsappConfig?.abandonedCartScript || "Hello *[NAME]*, this is *[STORE_NAME]*. We noticed you were interested in *[PRODUCT]* but didn't complete your order. We still have it reserved for you! Would you like us to confirm this Cash on Delivery order and ship it to you? Order: #[ORDER_ID]",
      thankYouEnabled: activeStore.whatsappConfig?.thankYouEnabled ?? false,
      thankYouNumber: activeStore.whatsappConfig?.thankYouNumber || '',
      thankYouMessage: activeStore.whatsappConfig?.thankYouMessage || 'Hello, I want to confirm my order: [ORDER_ID]',
      aisensyEnabled: activeStore.whatsappConfig?.aisensyEnabled ?? false,
      aisensyApiKey: activeStore.whatsappConfig?.aisensyApiKey || '',
      aisensyCampaignName: activeStore.whatsappConfig?.aisensyCampaignName || '',
      aisensyTemplateParams: activeStore.whatsappConfig?.aisensyTemplateParams || '[NAME],[PRODUCT],[ADDRESS],[ORDER_ID]',
      aisensyIgnoreSelfConfirmed: activeStore.whatsappConfig?.aisensyIgnoreSelfConfirmed ?? true,
      chatbotEnabled: activeStore.whatsappConfig?.chatbotEnabled ?? false,
      chatbotName: activeStore.whatsappConfig?.chatbotName || 'Fatima',
      chatbotInstructions: activeStore.whatsappConfig?.chatbotInstructions || 'We offer free delivery for orders above 10,000 DZD. Return policy: 7 days free returns on defective items.',
      chatbotProvider: activeStore.whatsappConfig?.chatbotProvider || 'gemini',
      chatbotApiKey: activeStore.whatsappConfig?.chatbotApiKey || '',
    });

    setFraudConfig(activeStore.fraudConfig || {
      blockDuplicateIps: false,
      duplicateIpTimeframeHours: 24,
      requireApprovalForHighValue: false,
      highValueThreshold: 15000
    });
    setLocalPrimaryColor(activeStore.primaryColor || '#4F46E5');
    setCustomDomain(activeStore.customDomain || '');
  }, [activeStore.id, activeStore.translations, activeStore.resendApiKey, activeStore.notifyEmail, activeStore.analytics, activeStore.yalidineApiKey, activeStore.yalidineApiToken, activeStore.genericWebhookUrl, activeStore.dzFulfillment, activeStore.whatsappConfig, globalApiKey, claudeApiKey, openAiApiKey, openRouterApiKey, openRouterModel, aiProvider, activeStore.primaryColor, activeStore.customDomain]);

  const handleSaveSEO = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateStore(activeStore.id, { 
      translations, resendApiKey, notifyEmail, analytics, 
      yalidineApiKey, yalidineApiToken, genericWebhookUrl,
      whatsappConfig, dzFulfillment, primaryColor: localPrimaryColor,
      customDomain: customDomain.trim() || undefined
    });

    setGlobalApiKey(localApiKey);
    setClaudeApiKey(localClaudeKey);
    setOpenAiApiKey(localOpenAiKey);
    setOpenRouterApiKey(localOpenRouterKey);
    setOpenRouterModel(localOpenRouterModel);
    setAiProvider(localProvider);

    setIsSaving(false);
    notify('Settings saved successfully!', 'success');
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreRegion || !newStoreCurrency) return;
    setIsCreatingStore(true);
    await addStore({
      id: 'store_' + Date.now().toString(),
      name: newStoreName,
      region: newStoreRegion.toUpperCase(),
      phonePrefix: newStorePrefix,
      currency: newStoreCurrency.toUpperCase(),
      language: newStoreLanguage.toLowerCase(),
      customDomain: newStoreCustomDomain.trim() || undefined,
      translations: (DEFAULT_TRANSLATIONS as any)[newStoreLanguage.toLowerCase()] || {}
    });
    setNewStoreName('');
    setNewStoreRegion('');
    setNewStorePrefix('');
    setNewStoreCurrency('');
    setNewStoreLanguage('en');
    setNewStoreCustomDomain('');
    setIsCreatingStore(false);
    notify('New store created successfully!', 'success');
  };

  const handleDeleteStore = (storeId: string, storeName: string) => {
    setDeleteModal({ isOpen: true, storeId, name: storeName });
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus) {
      addOrderStatus(newStatus);
      setNewStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Store Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Configure global behavior, statuses, and multi-tenant stores.</p>
      </div>

      {/* MULTI-STORE MANAGER */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <StoreIcon className="text-indigo-600" /> Multi-Store Manager
        </h2>
        
        {/* Existing Stores List */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">Active Stores</h3>
          <div className="space-y-3">
            {availableStores.map(store => (
              <div key={store.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="font-bold text-slate-900">{store.name}</div>
                  <div className="text-xs text-slate-500 font-mono mt-1">Region: {store.region.toUpperCase()} | Currency: {store.currency}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-500">Language:</label>
                    <select 
                      value={store.language || 'en'} 
                      onChange={(e) => {
                        const newLang = e.target.value;
                        updateStore(store.id, { 
                          language: newLang, 
                          translations: (DEFAULT_TRANSLATIONS as any)[newLang] || {} 
                        });
                        notify(`${store.name} language updated to ${newLang.toUpperCase()}`, 'success');
                      }}
                      className="text-xs font-bold bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="en">EN</option>
                      <option value="fr">FR</option>
                      <option value="ar">AR</option>
                      <option value="es">ES</option>
                      <option value="ro">RO</option>
                      <option value="pt">PT</option>
                      <option value="it">IT</option>
                      <option value="hu">HU</option>
                      <option value="pl">PL</option>
                      <option value="cs">CS</option>
                      <option value="sk">SK</option>
                      <option value="bg">BG</option>
                      <option value="sr">SR</option>
                      <option value="el">EL</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${store.region}`); notify('Store URL Copied!', 'success'); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Copy Store Link">
                    <Copy size={18} />
                  </button>
                  {availableStores.length > 1 && (
                    <button onClick={() => handleDeleteStore(store.id, store.name)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create Store Form */}
        <form onSubmit={handleCreateStore} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Create New Store</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Store Name</label>
              <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. Morocco Main" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Region Code</label>
              <input type="text" value={newStoreRegion} onChange={e => setNewStoreRegion(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. MA, FR, UK" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Phone Prefix</label>
              <input type="text" value={newStorePrefix} onChange={e => setNewStorePrefix(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. +212" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Currency</label>
              <input type="text" value={newStoreCurrency} onChange={e => setNewStoreCurrency(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. MAD, EUR" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Base Language</label>
              <select value={newStoreLanguage} onChange={e => setNewStoreLanguage(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white">
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="ar">Arabic</option>
                <option value="es">Spanish</option>
                <option value="ro">Romanian</option>
                <option value="pt">Portuguese</option>
                <option value="it">Italian</option>
                <option value="hu">Hungarian</option>
                <option value="pl">Polish</option>
                <option value="cs">Czech</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Custom Domain</label>
              <input type="text" value={newStoreCustomDomain} onChange={e => setNewStoreCustomDomain(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. fitnessdz.com" />
            </div>
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm transition-colors">
            <Plus size={16} /> Add Store
          </button>
        </form>
      </div>

      {/* AI SETTINGS MANAGER */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Code className="text-indigo-600" /> AI Co-Pilot Settings
        </h2>
        
        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
          <span className="text-indigo-500 mt-0.5">✨</span>
          <div className="text-sm font-medium text-indigo-800 space-y-1">
            <strong className="block font-bold text-indigo-900">AI Integration Config</strong>
            <p>Select your default AI provider and enter the corresponding API key to enable AI Agents and Co-Pilot features.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Default AI Provider</label>
            <select 
              value={localProvider} 
              onChange={(e) => setLocalProvider(e.target.value as any)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium"
            >
              <option value="gemini">Google Gemini (Recommended, Fast & Free Tier)</option>
              <option value="claude">Anthropic Claude (Best Quality, Paid)</option>
              <option value="openai">OpenAI ChatGPT (Industry Standard)</option>
              <option value="openrouter">OpenRouter (Free / Open Source Models)</option>
            </select>
          </div>

          <div className={localProvider !== 'gemini' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">Gemini API Key</label>
            <input 
              type="password" 
              value={localApiKey} 
              onChange={(e) => setLocalApiKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="AIzaSy..." 
            />
          </div>

          <div className={localProvider !== 'claude' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">Claude API Key (Anthropic)</label>
            <input 
              type="password" 
              value={localClaudeKey} 
              onChange={(e) => setLocalClaudeKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="sk-ant-api03-..." 
            />
          </div>

          <div className={localProvider !== 'openai' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">OpenAI API Key</label>
            <input 
              type="password" 
              value={localOpenAiKey} 
              onChange={(e) => setLocalOpenAiKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="sk-proj-..." 
            />
          </div>

          <div className={localProvider !== 'openrouter' ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-slate-700 mb-2">OpenRouter API Key</label>
            <input 
              type="password" 
              value={localOpenRouterKey} 
              onChange={(e) => setLocalOpenRouterKey(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium mb-4" 
              placeholder="sk-or-v1-..." 
            />
            
            <label className="block text-sm font-bold text-slate-700 mb-2">OpenRouter Model</label>
            <input 
              type="text" 
              value={localOpenRouterModel} 
              onChange={(e) => setLocalOpenRouterModel(e.target.value)} 
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-medium" 
              placeholder="e.g. meta-llama/llama-3.3-70b-instruct:free" 
            />
          </div>
        </div>
      </div>

      {/* CUSTOM ORDER STATUSES */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Type className="text-indigo-600" /> Custom Order Statuses
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {orderStatuses.map(status => (
            <span key={status} className="bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              {status}
              <button 
                type="button" 
                onClick={() => removeOrderStatus(status)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="Remove Custom Status (Default statuses cannot be removed)"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddStatus} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">New Status Name</label>
            <input type="text" value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. PARTIAL_REFUND" />
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm h-[42px]">
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {/* CATEGORY MANAGER */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <ListTree className="text-indigo-600" /> Category Manager
        </h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <span key={cat} className="bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              {cat}
              <button 
                type="button" 
                onClick={() => setCategories(prev => prev.filter(c => c !== cat))}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                title="Remove Category"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (newCategory) { setCategories(prev => [...prev, newCategory]); setNewCategory(''); } }} className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-500 mb-1">New Category Name</label>
            <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="e.g. Beauty & Care" />
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm h-[42px]">
            <Plus size={16} /> Add
          </button>
        </form>
      </div>

      {/* STAFF ACCOUNTS */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
          <Users className="text-indigo-600" /> Staff Accounts
        </h2>
        <div className="space-y-3 mb-6">
          {staffAccounts.map(acc => {
            if (editingStaffId === acc.id) {
              return (
                <form key={acc.id} onSubmit={async (e) => {
                  e.preventDefault();
                  if (editStaffName && editStaffPin.length >= 4) {
                    await updateStaffAccount(acc.id, {
                      name: editStaffName,
                      role: editStaffRole,
                      pin: editStaffPin,
                      storeId: editStaffStoreIds.length === 1 ? editStaffStoreIds[0] : undefined,
                      storeIds: editStaffStoreIds
                    });
                    setEditingStaffId(null);
                    notify('Staff account updated successfully!', 'success');
                  } else {
                    notify('PIN must be at least 4 digits', 'error');
                  }
                }} className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-100">
                    <div className="font-bold text-indigo-900">Edit Staff Account</div>
                    <button type="button" onClick={() => setEditingStaffId(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                      <input type="text" value={editStaffName} onChange={e => setEditStaffName(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white" placeholder="Agent Name" />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                      <select value={editStaffRole} onChange={e => setEditStaffRole(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white">
                        <option value="fulfillment">Fulfillment Agent</option>
                        <option value="confirmation">Confirmation Agent</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-bold text-slate-500 mb-1">PIN / Password</label>
                      <input type="text" value={editStaffPin} onChange={e => setEditStaffPin(e.target.value)} required minLength={4} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white" placeholder="e.g. 1234" />
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Store Assignment(s)</label>
                    <div className="flex flex-wrap gap-2 p-2 bg-white rounded-lg border border-slate-300">
                      <label className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={editStaffStoreIds.length === 0}
                          onChange={() => setEditStaffStoreIds([])}
                          className="accent-indigo-600"
                        />
                        All Stores (Global)
                      </label>
                      {availableStores.map(s => {
                        const isSelected = editStaffStoreIds.includes(s.id);
                        return (
                          <label key={s.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'}`}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setEditStaffStoreIds(editStaffStoreIds.filter(id => id !== s.id));
                                } else {
                                  setEditStaffStoreIds([...editStaffStoreIds, s.id]);
                                }
                              }}
                              className="accent-indigo-600"
                            />
                            {s.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setEditingStaffId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                      Save Changes
                    </button>
                  </div>
                </form>
              );
            }

            return (
              <div key={acc.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="font-bold text-slate-900">{acc.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-200/70 px-1.5 py-0.5 rounded font-bold">{acc.role}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {acc.storeIds && acc.storeIds.length > 0
                        ? acc.storeIds.map(sid => availableStores.find(s => s.id === sid)?.name || 'Store').join(', ')
                        : acc.storeId ? availableStores.find(s => s.id === acc.storeId)?.name || 'Restricted Store' : 'All Stores (Global)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      setEditingStaffId(acc.id);
                      setEditStaffName(acc.name);
                      setEditStaffRole(acc.role);
                      setEditStaffPin(acc.pin || '');
                      setEditStaffStoreIds(acc.storeIds || (acc.storeId ? [acc.storeId] : []));
                    }}
                    className="p-2 text-slate-500 hover:bg-slate-200/60 rounded-lg transition-colors"
                    title="Edit Staff Account"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => deleteStaffAccount(acc.id)}
                    className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                    disabled={acc.role === 'admin' && staffAccounts.filter(a => a.role === 'admin').length === 1}
                    title="Delete Staff Account"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          if (newStaffName && newStaffPin.length >= 4) {
            await addStaffAccount({ 
              name: newStaffName, 
              role: newStaffRole, 
              pin: newStaffPin,
              storeId: newStaffStoreIds.length === 1 ? newStaffStoreIds[0] : undefined,
              storeIds: newStaffStoreIds
            });
            setNewStaffName('');
            setNewStaffPin('');
            setNewStaffStoreIds([]);
          }
        }} className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
            <input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="Agent Name" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
            <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white">
              <option value="fulfillment">Fulfillment Agent</option>
              <option value="confirmation">Confirmation Agent</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="w-full">
            <label className="block text-xs font-bold text-slate-500 mb-1">Store Assignment(s)</label>
            <div className="flex flex-wrap gap-2 p-2 bg-white rounded-lg border border-slate-300">
              <label className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={newStaffStoreIds.length === 0}
                  onChange={() => setNewStaffStoreIds([])}
                  className="accent-indigo-600"
                />
                All Stores (Global)
              </label>
              {availableStores.map(s => {
                const isSelected = newStaffStoreIds.includes(s.id);
                return (
                  <label key={s.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => {
                        if (isSelected) {
                          setNewStaffStoreIds(newStaffStoreIds.filter(id => id !== s.id));
                        } else {
                          setNewStaffStoreIds([...newStaffStoreIds, s.id]);
                        }
                      }}
                      className="accent-indigo-600"
                    />
                    {s.name} ({s.region.toUpperCase()})
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex-1 min-w-[100px]">
            <label className="block text-xs font-bold text-slate-500 mb-1">PIN (Login)</label>
            <input type="password" value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} required minLength={4} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="4+ digits" />
          </div>
          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm h-[42px] min-w-[120px] justify-center">
            <Plus size={16} /> Add Staff
          </button>
        </form>
      </div>

      {/* SEO & LAYOUT */}
      <form onSubmit={handleSaveSEO} className="space-y-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
            <Globe className="text-indigo-600" /> Localization & Layout
          </h2>
          
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <div className="font-bold text-slate-900">Right-to-Left (RTL) Layout</div>
              <div className="text-sm text-slate-500 mt-1">Enable RTL support globally for Arabic/Hebrew regions.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isRtl} onChange={(e) => setIsRtl(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="mt-6 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <h3 className="font-bold text-slate-900 mb-1">Custom Domain Binding</h3>
            <p className="text-xs text-slate-500 mb-3">
              Point a unique custom domain (e.g. <code>algerian-beauty.com</code> or <code>fitnessdz.com</code>) to this specific sub-store.
            </p>
            <div className="flex gap-2 max-w-md">
              <input 
                type="text" 
                value={customDomain} 
                onChange={(e) => setCustomDomain(e.target.value)} 
                placeholder="e.g. algerian-beauty.com" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold text-sm" 
              />
            </div>
          </div>
          
          <div className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Top Announcement Banner</label>
              <input type="text" value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700" />
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4">Default SEO Metadata</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">Meta Title</label>
                  <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 mb-2">Meta Description</label>
                  <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-slate-700 resize-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INTEGRATIONS & PIXELS */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
            <Code className="text-indigo-600" /> Tracking & Integrations
          </h2>
          <p className="text-sm text-slate-500 mb-6">Configure pixels and external APIs for {activeStore.name}.</p>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Key size={12}/> Resend API Key</label>
                <input type="password" value={resendApiKey} onChange={e => setResendApiKey(e.target.value)} placeholder="re_..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Order Notification Email</label>
                <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="orders@yourstore.com" className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" />
              </div>
            </div>

            {/* Fulfillment Setup */}
            <div className="pb-6 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Fulfillment Provider</h3>
              {activeStore.region === 'dz' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 mb-1">Default Provider</label>
                    <select 
                      value={dzFulfillment.defaultProvider} 
                      onChange={(e) => setDzFulfillment({...dzFulfillment, defaultProvider: e.target.value as any})}
                      className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold"
                    >
                      <option value="yalidine">Yalidine</option>
                      <option value="zrexpress">ZR Express</option>
                      <option value="mayestro">Mayestro Delivery</option>
                      <option value="dhd">DHD</option>
                    </select>
                  </div>

                  {dzFulfillment.defaultProvider === 'yalidine' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Yalidine API Key</label>
                        <input type="password" value={dzFulfillment.yalidine?.apiKey || ''} onChange={e => setDzFulfillment({...dzFulfillment, yalidine: { apiKey: e.target.value, apiToken: dzFulfillment.yalidine?.apiToken || '' }})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Yalidine API Token</label>
                        <input type="password" value={dzFulfillment.yalidine?.apiToken || ''} onChange={e => setDzFulfillment({...dzFulfillment, yalidine: { apiKey: dzFulfillment.yalidine?.apiKey || '', apiToken: e.target.value }})} placeholder="API Token" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}

                  {dzFulfillment.defaultProvider === 'zrexpress' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">ZR API Key</label>
                        <input type="password" value={dzFulfillment.zrexpress?.apiKey} onChange={e => setDzFulfillment({...dzFulfillment, zrexpress: { ...dzFulfillment.zrexpress, apiKey: e.target.value } as any})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">ZR API Token</label>
                        <input type="password" value={dzFulfillment.zrexpress?.apiToken} onChange={e => setDzFulfillment({...dzFulfillment, zrexpress: { ...dzFulfillment.zrexpress, apiToken: e.target.value } as any})} placeholder="API Token" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Branch ID</label>
                        <input type="text" value={dzFulfillment.zrexpress?.branchId} onChange={e => setDzFulfillment({...dzFulfillment, zrexpress: { ...dzFulfillment.zrexpress, branchId: e.target.value } as any})} placeholder="Branch ID" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}

                  {dzFulfillment.defaultProvider === 'mayestro' && (
                    <div className="grid grid-cols-1 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">Mayestro API Key</label>
                        <input type="password" value={dzFulfillment.mayestro?.apiKey} onChange={e => setDzFulfillment({...dzFulfillment, mayestro: { apiKey: e.target.value }})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}

                  {dzFulfillment.defaultProvider === 'dhd' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">DHD API Key</label>
                        <input type="password" value={dzFulfillment.dhd?.apiKey} onChange={e => setDzFulfillment({...dzFulfillment, dhd: { ...dzFulfillment.dhd, apiKey: e.target.value } as any})} placeholder="API Key" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 mb-1">DHD API Token</label>
                        <input type="password" value={dzFulfillment.dhd?.apiToken} onChange={e => setDzFulfillment({...dzFulfillment, dhd: { ...dzFulfillment.dhd, apiToken: e.target.value } as any})} placeholder="API Token" className="w-full p-3 rounded-xl border border-amber-300 outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900 font-bold" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Google Sheets / Generic Webhook URL</label>
                  <input type="text" value={genericWebhookUrl} onChange={e => setGenericWebhookUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 bg-white text-slate-900 font-bold" />
                  <p className="text-xs text-slate-500 mt-2">When you click "Send to Webhook" on an order, we will POST the order data to this URL.</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Google Analytics / GTM Code</label>
                <textarea rows={4} value={analytics.google} onChange={e => setAnalytics({...analytics, google: e.target.value})} placeholder="Paste full Google Analytics/Tag Manager script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Facebook Meta Pixel Code</label>
                <textarea rows={4} value={analytics.facebook} onChange={e => setAnalytics({...analytics, facebook: e.target.value})} placeholder="Paste full Meta Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">TikTok Pixel Code</label>
                <textarea rows={4} value={analytics.tiktok} onChange={e => setAnalytics({...analytics, tiktok: e.target.value})} placeholder="Paste full TikTok Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Snapchat Pixel Code</label>
                <textarea rows={4} value={analytics.snapchat} onChange={e => setAnalytics({...analytics, snapchat: e.target.value})} placeholder="Paste full Snapchat Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">Pinterest Tag Code</label>
                <textarea rows={4} value={analytics.pinterest} onChange={e => setAnalytics({...analytics, pinterest: e.target.value})} placeholder="Paste full Pinterest Pixel script here..." className="w-full p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-mono text-xs whitespace-pre" />
              </div>
            </div>
          </div>
        </div>


        {/* WHATSAPP AUTOMATION */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <MessageCircle className="text-green-500" /> WhatsApp Automations
          </h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <div>
                <div className="font-bold text-slate-900 dark:text-white">Abandoned Cart Auto-Recovery</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatically prompt users to complete their checkout via WhatsApp if they drop off.</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={whatsappConfig.abandonedCartEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, abandonedCartEnabled: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
            
            {whatsappConfig.abandonedCartEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Delay (Minutes)</label>
                  <input type="number" min={1} value={whatsappConfig.abandonedCartDelayMinutes} onChange={(e) => setWhatsappConfig({...whatsappConfig, abandonedCartDelayMinutes: parseInt(e.target.value) || 30})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                  <p className="text-xs text-slate-500 mt-1">Time to wait before prompt.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Abandoned Cart Message Script</label>
                  <textarea value={whatsappConfig.abandonedCartScript} onChange={(e) => setWhatsappConfig({...whatsappConfig, abandonedCartScript: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white resize-none" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Available variables: <strong>[NAME]</strong>, <strong>[PRODUCT]</strong>, <strong>[CART_TOTAL]</strong>.</p>
                </div>
              </div>
            )}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">Thank You Page WhatsApp CTA</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Show &ldquo;Confirm on WhatsApp&rdquo; button after order placed.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappConfig.thankYouEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, thankYouEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {whatsappConfig.thankYouEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">WhatsApp Business Number</label>
                    <input type="text" value={whatsappConfig.thankYouNumber} onChange={(e) => setWhatsappConfig({...whatsappConfig, thankYouNumber: e.target.value})} placeholder="+213555..." className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* AiSensy Settings */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">AiSensy Automated WhatsApp Campaigns</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatically send template confirmation messages via AiSensy.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappConfig.aisensyEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, aisensyEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {whatsappConfig.aisensyEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">AiSensy API Key</label>
                      <input type="password" value={whatsappConfig.aisensyApiKey} onChange={(e) => setWhatsappConfig({...whatsappConfig, aisensyApiKey: e.target.value})} placeholder="Enter AiSensy campaign API Key" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">AiSensy Campaign Name</label>
                      <input type="text" value={whatsappConfig.aisensyCampaignName} onChange={(e) => setWhatsappConfig({...whatsappConfig, aisensyCampaignName: e.target.value})} placeholder="e.g. order_confirmation" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Template Shortcodes / Params (comma-separated, in order)</label>
                    <input type="text" value={whatsappConfig.aisensyTemplateParams} onChange={(e) => setWhatsappConfig({...whatsappConfig, aisensyTemplateParams: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    <p className="text-[11px] text-slate-400 mt-1">Available placeholders: [NAME], [PRODUCT], [ADDRESS], [ORDER_ID]</p>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <div>
                      <label className="font-bold text-xs text-indigo-950 dark:text-indigo-200">Skip automation for self-confirmed orders</label>
                      <p className="text-[10px] text-indigo-700 dark:text-indigo-400">Ignore orders where clients click WhatsApp thank-you link manually.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={whatsappConfig.aisensyIgnoreSelfConfirmed} onChange={(e) => setWhatsappConfig({...whatsappConfig, aisensyIgnoreSelfConfirmed: e.target.checked})} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* AI Storefront Chatbot Settings */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 mb-4">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">AI Storefront Chatbot Assistant</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enable a floating AI chatbot on the storefront for products and delivery queries.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={whatsappConfig.chatbotEnabled} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotEnabled: e.target.checked})} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              {whatsappConfig.chatbotEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Chatbot Name</label>
                      <input type="text" value={whatsappConfig.chatbotName} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">AI Provider</label>
                      <select value={whatsappConfig.chatbotProvider} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotProvider: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white">
                        <option value="gemini">Gemini</option>
                        <option value="claude">Claude</option>
                        <option value="openai">OpenAI</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Provider API Key</label>
                      <input type="password" value={whatsappConfig.chatbotApiKey} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotApiKey: e.target.value})} placeholder="Key (falls back to global key if empty)" className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Store Policies & Additional Chatbot Instructions (Dynamic Knowledge)</label>
                    <textarea value={whatsappConfig.chatbotInstructions} onChange={(e) => setWhatsappConfig({...whatsappConfig, chatbotInstructions: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900 dark:text-white resize-none animate-in fade-in" placeholder="Provide extra store information like shipping details, rules, or faq answers to guide the chatbot." />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Branding Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm mt-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
            <Globe className="w-6 h-6 text-indigo-600" /> Branding
          </h2>
          
          <div className="space-y-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Primary Button Color</label>
              <div className="flex gap-4 items-center">
                <input 
                  type="color" 
                  value={localPrimaryColor} 
                  onChange={e => setLocalPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                />
                <input 
                  type="text" 
                  value={localPrimaryColor}
                  onChange={e => setLocalPrimaryColor(e.target.value)}
                  className="w-48 p-2 rounded-lg border border-slate-300 dark:border-slate-600 font-mono text-slate-900 dark:text-white bg-white dark:bg-slate-800"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">This color will be used for main call-to-action buttons.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50">
            <Save size={20} /> {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={() => {
          removeStore(deleteModal.storeId);
          notify('Store deleted successfully!', 'success');
        }}
        title="Delete Store?"
        message={`Are you sure you want to delete "${deleteModal.name}"? This will permanently remove all products and orders associated with this store.`}
        confirmText="Delete Store"
        variant="danger"
      />
    </div>
  );
}
