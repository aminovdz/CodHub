'use client';

import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Play, Pause, RefreshCw, Plus, TrendingUp, DollarSign, Target, BarChart3, Settings2, PlayCircle, Loader2, Globe, AlertTriangle, CheckCircle2, XCircle, ChevronDown, Zap, Trash2, Edit3, Search, SlidersHorizontal, ExternalLink, Info } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { aiService } from '@/lib/services/aiService';

type ApiFn = (body: any) => Promise<any>;

function callApi(url: string, body: any) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

const METRICS_CARDS = [
  { key: 'spend', label: 'Total Spend', prefix: '$', format: (v: any) => parseFloat(v || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { key: 'impressions', label: 'Impressions', icon: '👁', format: (v: any) => parseInt(v || '0').toLocaleString() },
  { key: 'clicks', label: 'Clicks', icon: '👆', format: (v: any) => parseInt(v || '0').toLocaleString() },
  { key: 'ctr', label: 'CTR', suffix: '%', format: (v: any) => parseFloat(v || '0').toFixed(2) },
  { key: 'cpc', label: 'CPC', prefix: '$', format: (v: any) => parseFloat(v || '0').toFixed(2) },
  { key: 'cpm', label: 'CPM', prefix: '$', format: (v: any) => parseFloat(v || '0').toFixed(2) },
  { key: 'conversions', label: 'Conversions', format: (v: any) => parseInt(v || '0').toLocaleString() },
];

const FB_OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
  { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_SALES', label: 'Sales' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
];

const TT_OBJECTIVES = [
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'CONVERSIONS', label: 'Conversions' },
  { value: 'REACH', label: 'Reach' },
  { value: 'VIDEO_VIEWS', label: 'Video Views' },
  { value: 'ENGAGEMENT', label: 'Engagement' },
];

export default function AdsMcpPage() {
  const { activeStore, addActivityLog, orders } = useAdminStore();

  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';

  // --- Credentials ---
  const [fbAccountId, setFbAccountId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [ttAdvertiserId, setTtAdvertiserId] = useState('');
  const [ttAccessToken, setTtAccessToken] = useState('');

  // --- Connection status ---
  const [fbConnected, setFbConnected] = useState(false);
  const [ttConnected, setTtConnected] = useState(false);
  const [connectingFb, setConnectingFb] = useState(false);
  const [connectingTt, setConnectingTt] = useState(false);

  // --- Data ---
  const [fbCampaigns, setFbCampaigns] = useState<any[]>([]);
  const [ttCampaigns, setTtCampaigns] = useState<any[]>([]);
  const [fbInsights, setFbInsights] = useState<any>(null);
  const [ttInsights, setTtInsights] = useState<any>(null);
  const [fbAccounts, setFbAccounts] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingTt, setLoadingTt] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  const generateAiInsights = async () => {
    setGeneratingAi(true);
    const storeOrders = orders.filter(o => o.storeId === activeStore.id);
    const orderDataSummary = {
      totalOrders: storeOrders.length,
      totalRevenue: storeOrders.reduce((acc, o) => acc + (o.total || 0), 0),
    };
    const html = await aiService.generateMarketingRecommendations(fbInsights, ttInsights, orderDataSummary);
    setAiRecommendations(html);
    setGeneratingAi(false);
  };

  // --- UI State ---
  const [log, setLog] = useState<string[]>([
    '[System] Ads MCP Hub initialized. Connect your ad accounts to get started.',
  ]);
  const [activeTab, setActiveTab] = useState<'meta' | 'tiktok' | 'analytics'>('analytics');
  const [showCreateForm, setShowCreateForm] = useState<'facebook' | 'tiktok' | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: '', objective: FB_OBJECTIVES[5].value, dailyBudget: '' });
  const [datePreset, setDatePreset] = useState('last_30d');

  // --- Adset/Ad drill-down state ---
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdsets, setExpandedAdsets] = useState<Set<string>>(new Set());
  const [fbAdsets, setFbAdsets] = useState<Record<string, any[]>>({});
  const [ttAdsets, setTtAdsets] = useState<Record<string, any[]>>({});
  const [fbAds, setFbAds] = useState<Record<string, any[]>>({});
  const [ttAds, setTtAds] = useState<Record<string, any[]>>({});
  const [loadingAdsetsMap, setLoadingAdsetsMap] = useState<Record<string, boolean>>({});
  const [loadingAdsMap, setLoadingAdsMap] = useState<Record<string, boolean>>({});

  const toggleCampaignExpand = (campaignId: string, platform: 'meta' | 'tiktok') => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
        if (platform === 'meta' && !fbAdsets[campaignId]) {
          fetchMetaAdsets(campaignId);
        } else if (platform === 'tiktok' && !ttAdsets[campaignId]) {
          fetchTtAdsets(campaignId);
        }
      }
      return next;
    });
  };

  const toggleAdsetExpand = (adsetId: string, platform: 'meta' | 'tiktok') => {
    setExpandedAdsets(prev => {
      const next = new Set(prev);
      if (next.has(adsetId)) {
        next.delete(adsetId);
      } else {
        next.add(adsetId);
        if (platform === 'meta' && !fbAds[adsetId]) {
          fetchMetaAds(adsetId);
        } else if (platform === 'tiktok' && !ttAds[adsetId]) {
          fetchTtAds(adsetId);
        }
      }
      return next;
    });
  };

  // --- Meta Adset/Ad fetch ---
  const fetchMetaAdsets = async (campaignId: string) => {
    setLoadingAdsetsMap(prev => ({ ...prev, [campaignId]: true }));
    const res = await callApi('/api/ads/meta', { action: 'adsets', accessToken: fbAccessToken, campaignId });
    if (res.adsets) {
      setFbAdsets(prev => ({ ...prev, [campaignId]: res.adsets }));
      addLog(`[Meta] Loaded ${res.adsets.length} adsets for campaign ${campaignId}`);
    }
    setLoadingAdsetsMap(prev => ({ ...prev, [campaignId]: false }));
  };

  const fetchMetaAds = async (adsetId: string) => {
    setLoadingAdsMap(prev => ({ ...prev, [adsetId]: true }));
    const res = await callApi('/api/ads/meta', { action: 'ads', accessToken: fbAccessToken, adsetId });
    if (res.ads) {
      setFbAds(prev => ({ ...prev, [adsetId]: res.ads }));
      addLog(`[Meta] Loaded ${res.ads.length} ads for adset ${adsetId}`);
    }
    setLoadingAdsMap(prev => ({ ...prev, [adsetId]: false }));
  };

  const toggleFbAdset = async (adsetId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await callApi('/api/ads/meta', { action: 'toggleAdsetStatus', accessToken: fbAccessToken, adsetId, status: newStatus });
    if (res.success) {
      setFbAdsets(prev => {
        const updated = { ...prev };
        for (const cid of Object.keys(updated)) {
          updated[cid] = updated[cid].map((a: any) => a.id === adsetId ? { ...a, status: newStatus } : a);
        }
        return updated;
      });
      addLog(`[Meta] Adset ${adsetId} → ${newStatus}`);
    } else {
      addLog(`[Meta] Adset toggle failed: ${res.error}`);
    }
  };

  const scaleFbAdsetBudget = async (adsetId: string, pct: number) => {
    let current = 0;
    for (const cid of Object.keys(fbAdsets)) {
      const found = fbAdsets[cid].find((a: any) => a.id === adsetId);
      if (found) { current = parseFloat(found.daily_budget || '0'); break; }
    }
    if (!current) return;
    const newBudget = Math.round(current * (1 + pct / 100));
    const res = await callApi('/api/ads/meta', { action: 'updateAdsetBudget', accessToken: fbAccessToken, adsetId, dailyBudget: newBudget });
    if (res.success) {
      setFbAdsets(prev => {
        const updated = { ...prev };
        for (const cid of Object.keys(updated)) {
          updated[cid] = updated[cid].map((a: any) => a.id === adsetId ? { ...a, daily_budget: newBudget } : a);
        }
        return updated;
      });
      addLog(`[Meta] Scaled adset ${adsetId} budget → ${newBudget}`);
    } else {
      addLog(`[Meta] Adset budget update failed: ${res.error}`);
    }
  };

  const toggleFbAd = async (adId: string, adsetId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await callApi('/api/ads/meta', { action: 'toggleAdStatus', accessToken: fbAccessToken, adId, status: newStatus });
    if (res.success) {
      setFbAds(prev => {
        const updated = { ...prev };
        if (updated[adsetId]) {
          updated[adsetId] = updated[adsetId].map((a: any) => a.id === adId ? { ...a, status: newStatus } : a);
        }
        return updated;
      });
      addLog(`[Meta] Ad ${adId} → ${newStatus}`);
    } else {
      addLog(`[Meta] Ad toggle failed: ${res.error}`);
    }
  };

  // --- TikTok Adset/Ad fetch ---
  const fetchTtAdsets = async (campaignId: string) => {
    setLoadingAdsetsMap(prev => ({ ...prev, [campaignId]: true }));
    const res = await callApi('/api/ads/tiktok', { action: 'adsets', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, campaignId });
    if (res.adsets) {
      setTtAdsets(prev => ({ ...prev, [campaignId]: res.adsets }));
      addLog(`[TikTok] Loaded ${res.adsets.length} adsets for campaign ${campaignId}`);
    }
    setLoadingAdsetsMap(prev => ({ ...prev, [campaignId]: false }));
  };

  const fetchTtAds = async (adgroupId: string) => {
    setLoadingAdsMap(prev => ({ ...prev, [adgroupId]: true }));
    const res = await callApi('/api/ads/tiktok', { action: 'ads', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, adgroupId });
    if (res.ads) {
      setTtAds(prev => ({ ...prev, [adgroupId]: res.ads }));
      addLog(`[TikTok] Loaded ${res.ads.length} ads for adgroup ${adgroupId}`);
    }
    setLoadingAdsMap(prev => ({ ...prev, [adgroupId]: false }));
  };

  const toggleTtAdset = async (adgroupId: string, campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' || currentStatus === 'ACTIVED' ? 'DISABLE' : 'ACTIVE';
    const fbStatus = currentStatus === 'ACTIVE' || currentStatus === 'ACTIVED' ? 'PAUSED' : 'ACTIVE';
    const res = await callApi('/api/ads/tiktok', { action: 'toggleAdsetStatus', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, adgroupId, status: fbStatus });
    if (res.success) {
      setTtAdsets(prev => {
        const updated = { ...prev };
        if (updated[campaignId]) {
          updated[campaignId] = updated[campaignId].map((a: any) => a.adgroup_id === adgroupId ? { ...a, status: newStatus } : a);
        }
        return updated;
      });
      addLog(`[TikTok] Adset ${adgroupId} → ${newStatus}`);
    } else {
      addLog(`[TikTok] Adset toggle failed: ${res.error}`);
    }
  };

  const scaleTtAdsetBudget = async (adgroupId: string, campaignId: string, pct: number) => {
    const adsets = ttAdsets[campaignId] || [];
    const found = adsets.find((a: any) => a.adgroup_id === adgroupId);
    if (!found) return;
    const current = parseFloat(found.budget || '0');
    if (!current) return;
    const newBudget = Math.round(current * (1 + pct / 100));
    const res = await callApi('/api/ads/tiktok', { action: 'updateAdsetBudget', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, adgroupId, budget: newBudget });
    if (res.success) {
      setTtAdsets(prev => {
        const updated = { ...prev };
        if (updated[campaignId]) {
          updated[campaignId] = updated[campaignId].map((a: any) => a.adgroup_id === adgroupId ? { ...a, budget: newBudget } : a);
        }
        return updated;
      });
      addLog(`[TikTok] Scaled adset budget → ${newBudget}`);
    } else {
      addLog(`[TikTok] Adset budget update failed: ${res.error}`);
    }
  };

  const toggleTtAd = async (adId: string, adgroupId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' || currentStatus === 'ACTIVED' ? 'DISABLE' : 'ACTIVE';
    const fbStatus = currentStatus === 'ACTIVE' || currentStatus === 'ACTIVED' ? 'PAUSED' : 'ACTIVE';
    const res = await callApi('/api/ads/tiktok', { action: 'toggleAdStatus', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, adId, status: fbStatus });
    if (res.success) {
      setTtAds(prev => {
        const updated = { ...prev };
        if (updated[adgroupId]) {
          updated[adgroupId] = updated[adgroupId].map((a: any) => a.ad_id === adId ? { ...a, status: newStatus } : a);
        }
        return updated;
      });
      addLog(`[TikTok] Ad ${adId} → ${newStatus}`);
    } else {
      addLog(`[TikTok] Ad toggle failed: ${res.error}`);
    }
  };

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-99), msg]);
  }, []);

  // Load saved creds
  useEffect(() => {
    const saved = localStorage.getItem(`ads_mcp_${activeStore.id}`);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setFbAccountId(p.fbAccountId || '');
        setFbAccessToken(p.fbAccessToken || '');
        setTtAdvertiserId(p.ttAdvertiserId || '');
        setTtAccessToken(p.ttAccessToken || '');
        if (p.fbAccessToken) setFbConnected(true);
        if (p.ttAccessToken) setTtConnected(true);
      } catch {}
    }
  }, [activeStore.id]);

  const saveCreds = () => {
    localStorage.setItem(`ads_mcp_${activeStore.id}`, JSON.stringify({
      fbAccountId, fbAccessToken, ttAdvertiserId, ttAccessToken,
    }));
    addLog(`[Config] Saved credentials for ${activeStore.name}`);
    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Ads MCP Configured', detail: 'Updated ad platform credentials' });
  };

  // --- META (Facebook) ---
  const connectFb = async () => {
    if (!fbAccessToken) return;
    setConnectingFb(true);
    const res = await callApi('/api/ads/meta', { action: 'testConnection', accessToken: fbAccessToken });
    if (res.success) {
      setFbConnected(true);
      addLog(`[Meta] Connected as ${res.name} (${res.id})`);
      // Fetch ad accounts
      const accRes = await callApi('/api/ads/meta', { action: 'adAccounts', accessToken: fbAccessToken });
      if (accRes.accounts) {
        setFbAccounts(accRes.accounts);
        if (!fbAccountId && accRes.accounts[0]) {
          setFbAccountId(accRes.accounts[0].id);
        }
        addLog(`[Meta] Found ${accRes.accounts.length} ad account(s)`);
      }
      saveCreds();
    } else {
      addLog(`[Meta] Connection failed: ${res.error}`);
    }
    setConnectingFb(false);
  };

  const fetchMetaCampaigns = async () => {
    if (!fbAccessToken || !fbAccountId) return;
    setLoadingMeta(true);
    const [campRes, insRes] = await Promise.all([
      callApi('/api/ads/meta', { action: 'campaigns', accessToken: fbAccessToken, accountId: fbAccountId }),
      callApi('/api/ads/meta', { action: 'insights', accessToken: fbAccessToken, accountId: fbAccountId, datePreset }),
    ]);
    if (campRes.campaigns) {
      setFbCampaigns(campRes.campaigns);
      addLog(`[Meta] Loaded ${campRes.campaigns.length} campaigns`);
    }
    if (insRes.insights) {
      setFbInsights(insRes);
    }
    setLoadingMeta(false);
  };

  const toggleFbCampaign = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await callApi('/api/ads/meta', { action: 'toggleStatus', accessToken: fbAccessToken, campaignId, status: newStatus });
    if (res.success) {
      setFbCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, status: newStatus } : c));
      addLog(`[Meta] Campaign ${campaignId} → ${newStatus}`);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Campaign Toggled', detail: `FB campaign ${campaignId} ${newStatus}` });
    } else {
      addLog(`[Meta] Failed to toggle: ${res.error}`);
    }
  };

  const scaleFbBudget = async (campaignId: string, pct: number) => {
    const camp = fbCampaigns.find(c => c.id === campaignId);
    if (!camp) return;
    const current = parseFloat(camp.daily_budget || '0');
    const newBudget = Math.round(current * (1 + pct / 100));
    const res = await callApi('/api/ads/meta', { action: 'updateBudget', accessToken: fbAccessToken, campaignId, dailyBudget: newBudget });
    if (res.success) {
      setFbCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, daily_budget: newBudget } : c));
      addLog(`[Meta] Scaled campaign ${campaignId} budget ${current} → ${newBudget} (${pct > 0 ? '+' : ''}${pct}%)`);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Budget Scaled', detail: `FB ${campaignId}: ${current} → ${newBudget}` });
    } else {
      addLog(`[Meta] Budget update failed: ${res.error}`);
    }
  };

  const createFbCampaign = async () => {
    if (!newCampaign.name || !newCampaign.objective) return;
    const res = await callApi('/api/ads/meta', {
      action: 'createCampaign',
      accessToken: fbAccessToken,
      accountId: fbAccountId,
      name: newCampaign.name,
      objective: newCampaign.objective,
      budget: newCampaign.dailyBudget ? parseFloat(newCampaign.dailyBudget) * 100 : undefined,
    });
    if (res.success) {
      addLog(`[Meta] Created campaign "${newCampaign.name}" (${res.campaign.id})`);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Campaign Created', detail: `FB: ${newCampaign.name}` });
      setShowCreateForm(null);
      setNewCampaign({ name: '', objective: FB_OBJECTIVES[5].value, dailyBudget: '' });
      fetchMetaCampaigns();
    } else {
      addLog(`[Meta] Create failed: ${res.error}`);
    }
  };

  // --- TikTok ---
  const connectTt = async () => {
    if (!ttAccessToken || !ttAdvertiserId) return;
    setConnectingTt(true);
    const res = await callApi('/api/ads/tiktok', { action: 'testConnection', accessToken: ttAccessToken, advertiserId: ttAdvertiserId });
    if (res.success) {
      setTtConnected(true);
      addLog(`[TikTok] Connected as ${res.name}`);
      saveCreds();
    } else {
      addLog(`[TikTok] Connection failed: ${res.error}`);
    }
    setConnectingTt(false);
  };

  const fetchTtCampaigns = async () => {
    if (!ttAccessToken || !ttAdvertiserId) return;
    setLoadingTt(true);
    const [campRes, insRes] = await Promise.all([
      callApi('/api/ads/tiktok', { action: 'campaigns', accessToken: ttAccessToken, advertiserId: ttAdvertiserId }),
      callApi('/api/ads/tiktok', { action: 'insights', accessToken: ttAccessToken, advertiserId: ttAdvertiserId }),
    ]);
    if (campRes.campaigns) {
      setTtCampaigns(campRes.campaigns);
      addLog(`[TikTok] Loaded ${campRes.campaigns.length} campaigns`);
    }
    if (insRes.insights) {
      setTtInsights(insRes);
    }
    setLoadingTt(false);
  };

  const toggleTtCampaign = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'DISABLE' : 'ACTIVE';
    const fbStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const res = await callApi('/api/ads/tiktok', { action: 'toggleStatus', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, campaignId, status: fbStatus });
    if (res.success) {
      setTtCampaigns(prev => prev.map(c => c.campaign_id === campaignId ? { ...c, status: newStatus } : c));
      addLog(`[TikTok] Campaign ${campaignId} → ${newStatus}`);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Campaign Toggled', detail: `TT campaign ${campaignId} ${newStatus}` });
    } else {
      addLog(`[TikTok] Failed: ${res.error}`);
    }
  };

  const scaleTtBudget = async (campaignId: string, pct: number) => {
    const camp = ttCampaigns.find(c => c.campaign_id === campaignId);
    if (!camp) return;
    const current = parseFloat(camp.budget || '0');
    const newBudget = Math.round(current * (1 + pct / 100));
    const res = await callApi('/api/ads/tiktok', { action: 'updateBudget', accessToken: ttAccessToken, advertiserId: ttAdvertiserId, campaignId, budget: newBudget });
    if (res.success) {
      setTtCampaigns(prev => prev.map(c => c.campaign_id === campaignId ? { ...c, budget: newBudget } : c));
      addLog(`[TikTok] Scaled campaign budget ${current} → ${newBudget} (${pct > 0 ? '+' : ''}${pct}%)`);
    } else {
      addLog(`[TikTok] Budget update failed: ${res.error}`);
    }
  };

  const createTtCampaign = async () => {
    if (!newCampaign.name || !newCampaign.objective) return;
    const res = await callApi('/api/ads/tiktok', {
      action: 'createCampaign',
      accessToken: ttAccessToken,
      advertiserId: ttAdvertiserId,
      name: newCampaign.name,
      objective: newCampaign.objective,
      budget: newCampaign.dailyBudget ? parseFloat(newCampaign.dailyBudget) * 100 : undefined,
    });
    if (res.success) {
      addLog(`[TikTok] Created campaign "${newCampaign.name}"`);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Campaign Created', detail: `TT: ${newCampaign.name}` });
      setShowCreateForm(null);
      setNewCampaign({ name: '', objective: TT_OBJECTIVES[1].value, dailyBudget: '' });
      fetchTtCampaigns();
    } else {
      addLog(`[TikTok] Create failed: ${res.error}`);
    }
  };

  // Auto-fetch when connected
  useEffect(() => { if (fbConnected && fbAccessToken && fbAccountId) fetchMetaCampaigns(); }, [fbConnected, fbAccountId]);
  useEffect(() => { if (ttConnected && ttAccessToken && ttAdvertiserId) fetchTtCampaigns(); }, [ttConnected, ttAdvertiserId]);

  const totalSpend = (fbInsights?.summary?.spend || 0) + (ttInsights?.summary?.spend || 0);
  const totalImpressions = (fbInsights?.summary?.impressions || 0) + (ttInsights?.summary?.impressions || 0);
  const totalClicks = (fbInsights?.summary?.clicks || 0) + (ttInsights?.summary?.clicks || 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Megaphone className="text-indigo-600" size={32} />
            Ads MCP Hub
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Manage Facebook & TikTok campaigns with real API control and cross-platform analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${fbConnected ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${fbConnected ? 'bg-indigo-500' : 'bg-slate-300'}`} /> Meta {fbConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${ttConnected ? 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${ttConnected ? 'bg-cyan-500' : 'bg-slate-300'}`} /> TikTok {ttConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Summary Bar */}
      {(fbConnected || ttConnected) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Spend', value: `$${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <DollarSign size={18} className="text-emerald-500" />, color: 'bg-emerald-50 dark:bg-emerald-900/10' },
            { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: <BarChart3 size={18} className="text-indigo-500" />, color: 'bg-indigo-50 dark:bg-indigo-900/10' },
            { label: 'Clicks', value: totalClicks.toLocaleString(), icon: <Target size={18} className="text-amber-500" />, color: 'bg-amber-50 dark:bg-amber-900/10' },
            { label: 'Combined CTR', value: totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)}%` : '0%', icon: <TrendingUp size={18} className="text-rose-500" />, color: 'bg-rose-50 dark:bg-rose-900/10' },
          ].map(s => (
            <div key={s.label} className={`${s.color} border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center gap-4`}>
              <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">{s.icon}</div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-1.5 shadow-sm">
        {[
          { id: 'analytics', label: 'Cross-Platform Analytics', icon: <TrendingUp size={16} /> },
          { id: 'meta', label: 'Meta Campaigns', icon: <Target size={16} /> },
          { id: 'tiktok', label: 'TikTok Campaigns', icon: <Globe size={16} /> },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all tracking-wide ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar: Config */}
        <div className="lg:col-span-1 space-y-4">
          {/* Meta Config */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Target size={16} className="text-indigo-600" />
              <h3 className="font-black text-xs uppercase tracking-wider text-indigo-600">Meta (Facebook)</h3>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ad Account ID</label>
              <input type="text" value={fbAccountId} onChange={e => setFbAccountId(e.target.value)} placeholder="act_123456789"
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Token</label>
              <input type="password" value={fbAccessToken} onChange={e => setFbAccessToken(e.target.value)} placeholder="EAAx..."
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-600" />
            </div>
            <button onClick={connectFb} disabled={connectingFb || !fbAccessToken}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {connectingFb ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
              {connectingFb ? 'Connecting...' : fbConnected ? 'Reconnect' : 'Connect'}
            </button>
            {fbConnected && <button onClick={fetchMetaCampaigns} disabled={loadingMeta}
              className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1">
              <RefreshCw size={10} className={loadingMeta ? 'animate-spin' : ''} /> {loadingMeta ? 'Loading...' : 'Refresh Campaigns'}
            </button>}
          </div>

          {/* TikTok Config */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Globe size={16} className="text-cyan-600" />
              <h3 className="font-black text-xs uppercase tracking-wider text-cyan-600">TikTok</h3>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Advertiser ID</label>
              <input type="text" value={ttAdvertiserId} onChange={e => setTtAdvertiserId(e.target.value)} placeholder="7123456789"
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-600" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Token</label>
              <input type="password" value={ttAccessToken} onChange={e => setTtAccessToken(e.target.value)} placeholder="tt_..."
                className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none focus:ring-2 focus:ring-cyan-600" />
            </div>
            <button onClick={connectTt} disabled={connectingTt || !ttAccessToken || !ttAdvertiserId}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {connectingTt ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />}
              {connectingTt ? 'Connecting...' : ttConnected ? 'Reconnect' : 'Connect'}
            </button>
            {ttConnected && <button onClick={fetchTtCampaigns} disabled={loadingTt}
              className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1">
              <RefreshCw size={10} className={loadingTt ? 'animate-spin' : ''} /> {loadingTt ? 'Loading...' : 'Refresh Campaigns'}
            </button>}
          </div>

          {/* Save + New Campaign */}
          <div className="space-y-2">
            <button onClick={saveCreds} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-[10px] uppercase tracking-wider transition-all">
              Save Credentials
            </button>
            {(fbConnected || ttConnected) && (
              <div className="flex gap-2">
                {fbConnected && <button onClick={() => { setShowCreateForm('facebook'); setNewCampaign({ name: '', objective: FB_OBJECTIVES[5].value, dailyBudget: '' }); }}
                  className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-indigo-100 transition-all flex items-center justify-center gap-1">
                  <Plus size={12} /> FB Campaign
                </button>}
                {ttConnected && <button onClick={() => { setShowCreateForm('tiktok'); setNewCampaign({ name: '', objective: TT_OBJECTIVES[1].value, dailyBudget: '' }); }}
                  className="flex-1 py-2 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 font-bold rounded-xl text-[10px] uppercase tracking-wider hover:bg-cyan-100 transition-all flex items-center justify-center gap-1">
                  <Plus size={12} /> TT Campaign
                </button>}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2">
            <h4 className="font-black text-[10px] text-cyan-400 uppercase tracking-widest">Activity Log</h4>
            <div className="h-48 overflow-y-auto space-y-1 font-mono text-[9px] text-slate-400">
              {log.map((l, i) => <p key={i} className="leading-relaxed">{l}</p>)}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">

          {/* === Analytics Tab === */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 size={20} className="text-indigo-600" /> Performance Overview
                  </h2>
                  <div className="flex gap-2">
                    {['last_7d', 'last_30d', 'last_90d'].map(p => (
                      <button key={p} onClick={() => setDatePreset(p)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${datePreset === p ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                        {p === 'last_7d' ? '7d' : p === 'last_30d' ? '30d' : '90d'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {METRICS_CARDS.map(m => {
                    const fbVal = m.key === 'conversions' ? fbInsights?.summary?.conversions : fbInsights?.summary?.[m.key];
                    const ttVal = m.key === 'conversions' ? ttInsights?.summary?.conversions : ttInsights?.summary?.[m.key];
                    const total = m.key === 'conversions' ? (parseInt(fbVal || '0') + parseInt(ttVal || '0')) : (parseFloat(fbVal || '0') + parseFloat(ttVal || '0'));
                    return (
                      <div key={m.key} className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">{m.prefix || ''}{m.format(total)}{m.suffix || ''}</p>
                        {(fbConnected || ttConnected) && (
                          <div className="flex gap-2 mt-1.5 text-[8px] font-bold uppercase tracking-wider">
                            {fbConnected && <span className="text-indigo-500">FB {m.format(fbVal || 0)}</span>}
                            {ttConnected && <span className="text-cyan-500">TT {m.format(ttVal || 0)}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Platform breakdown and AI */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* AI Budget Recommendations */}
                  <div className="col-span-2 bg-gradient-to-r from-indigo-50 to-cyan-50 dark:from-indigo-900/10 dark:to-cyan-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 overflow-hidden mb-2">
                    <div className="p-5 flex justify-between items-center border-b border-indigo-100 dark:border-indigo-900/30">
                      <div>
                        <h3 className="font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                          <Zap size={18} className="text-indigo-500" /> AI Budget Recommendations
                        </h3>
                        <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 font-semibold">Get algorithmic advice on where to scale or cut spend based on CPA and ROAS.</p>
                      </div>
                      <button 
                        onClick={generateAiInsights}
                        disabled={generatingAi || (!fbConnected && !ttConnected)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
                      >
                        {generatingAi ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        {generatingAi ? 'Analyzing...' : 'Generate Insights'}
                      </button>
                    </div>
                    {aiRecommendations && (
                      <div className="p-5 text-sm text-slate-800 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: aiRecommendations }} />
                    )}
                  </div>

                  {fbConnected && fbInsights?.insights && (
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/30">
                      <h3 className="font-black text-xs text-indigo-600 mb-3 uppercase tracking-wider">Meta — Top Campaigns by Spend</h3>
                      <div className="space-y-2">
                        {fbInsights.insights.slice(0, 5).map((row: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{row.campaign_name}</span>
                            <span className="font-black text-slate-900 dark:text-white">${parseFloat(row.spend || '0').toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ttConnected && ttInsights?.insights && (
                    <div className="bg-cyan-50/50 dark:bg-cyan-900/10 rounded-2xl p-4 border border-cyan-100 dark:border-cyan-900/30">
                      <h3 className="font-black text-xs text-cyan-600 mb-3 uppercase tracking-wider">TikTok — Top Campaigns by Spend</h3>
                      <div className="space-y-2">
                        {ttInsights.insights.slice(0, 5).map((row: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{row.metrics?.campaign_name || row.campaign_name || `Campaign ${i + 1}`}</span>
                            <span className="font-black text-slate-900 dark:text-white">${parseFloat(row.metrics?.spend || '0').toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!fbConnected && !ttConnected && (
                    <div className="col-span-2 h-40 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200">
                      <div className="text-center">
                        <Info size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold">Connect your ad accounts to see analytics</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* === Meta Campaigns Tab === */}
          {activeTab === 'meta' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="p-5 border-b bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Target size={18} className="text-indigo-600" /> Meta Campaigns <span className="text-xs font-bold text-slate-400">({fbCampaigns.length})</span>
                </h2>
                {fbCampaigns.length > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    ${fbCampaigns.reduce((s, c) => s + parseFloat(c.daily_budget || '0'), 0).toFixed(0)}/day total budget
                  </span>
                )}
              </div>
              {!fbConnected ? (
                <div className="p-12 text-center text-slate-400">
                  <Target size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">Connect your Meta account in the sidebar</p>
                </div>
              ) : fbCampaigns.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 size={32} className={`mx-auto mb-3 ${loadingMeta ? 'animate-spin' : 'opacity-30'}`} />
                  <p className="font-bold text-sm">{loadingMeta ? 'Loading campaigns...' : 'No campaigns found. Click Refresh.'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {fbCampaigns.map((camp: any) => {
                    const isActive = camp.status === 'ACTIVE';
                    const dailyBudget = parseFloat(camp.daily_budget || '0') / 100;
                    const isExpanded = expandedCampaigns.has(camp.id);
                    const adsets = fbAdsets[camp.id] || [];
                    const loadingAdsets = loadingAdsetsMap[camp.id];
                    return (
                      <div key={camp.id}>
                        <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleCampaignExpand(camp.id, 'meta')} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              </button>
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{camp.name || 'Unnamed'}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{camp.status}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                              <span>Objective: {camp.objective || '—'}</span>
                              <span>Budget: ${dailyBudget.toFixed(2)}/day</span>
                              <span>Adsets: {adsets.length || '—'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => scaleFbBudget(camp.id, 20)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1">
                              <TrendingUp size={10} /> +20%
                            </button>
                            <button onClick={() => scaleFbBudget(camp.id, -20)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1">
                              <TrendingUp size={10} className="rotate-180" /> -20%
                            </button>
                            <button onClick={() => toggleFbCampaign(camp.id, camp.status)}
                              className={`p-2 rounded-lg border transition-all ${isActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                              {isActive ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          </div>
                        </div>
                        {/* Adsets section */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                            {loadingAdsets ? (
                              <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                <Loader2 size={12} className="animate-spin" /> Loading adsets...
                              </div>
                            ) : adsets.length === 0 ? (
                              <div className="p-4 text-center text-[10px] text-slate-400">No adsets found</div>
                            ) : (
                              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {adsets.map((adset: any) => {
                                  const adsetActive = adset.status === 'ACTIVE';
                                  const adsetBudget = parseFloat(adset.daily_budget || '0') / 100;
                                  const adsetExpanded = expandedAdsets.has(adset.id);
                                  const ads = fbAds[adset.id] || [];
                                  const loadingAds = loadingAdsMap[adset.id];
                                  return (
                                    <div key={adset.id}>
                                      <div className="p-3 pl-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="space-y-0.5 flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => toggleAdsetExpand(adset.id, 'meta')} className="p-0.5 text-slate-400 hover:text-slate-600">
                                              <ChevronDown size={11} className={`transition-transform ${adsetExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                            </button>
                                            <span className={`w-1.5 h-1.5 rounded-full ${adsetActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{adset.name || 'Unnamed'}</span>
                                            <span className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${adsetActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{adset.status}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400 ml-5">
                                            <span>Budget: ${adsetBudget.toFixed(2)}/day</span>
                                            <span>Ads: {ads.length || (loadingAds ? '...' : '—')}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-12">
                                          <button onClick={() => scaleFbAdsetBudget(adset.id, 20)}
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">+20%</button>
                                          <button onClick={() => scaleFbAdsetBudget(adset.id, -20)}
                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[8px] font-black uppercase">-20%</button>
                                          <button onClick={() => toggleFbAdset(adset.id, adset.status)}
                                            className={`p-1 rounded border transition-all ${adsetActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                            {adsetActive ? <Pause size={11} /> : <Play size={11} />}
                                          </button>
                                        </div>
                                      </div>
                                      {/* Ads section */}
                                      {adsetExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-700/30 bg-slate-100/50 dark:bg-slate-900/50">
                                          {loadingAds ? (
                                            <div className="p-3 pl-16 flex items-center gap-2 text-[10px] text-slate-400">
                                              <Loader2 size={10} className="animate-spin" /> Loading ads...
                                            </div>
                                          ) : ads.length === 0 ? (
                                            <div className="p-3 pl-16 text-[9px] text-slate-400">No ads found</div>
                                          ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                              {ads.map((ad: any) => {
                                                const adActive = ad.status === 'ACTIVE';
                                                return (
                                                  <div key={ad.id} className="p-2.5 pl-16 flex justify-between items-center gap-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className={`w-1 h-1 rounded-full ${adActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{ad.name || 'Unnamed'}</span>
                                                      <span className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${adActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ad.status}</span>
                                                    </div>
                                                    <button onClick={() => toggleFbAd(ad.id, adset.id, ad.status)}
                                                      className={`p-1 rounded border transition-all shrink-0 ${adActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                                      {adActive ? <Pause size={10} /> : <Play size={10} />}
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* === TikTok Campaigns Tab === */}
          {activeTab === 'tiktok' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="p-5 border-b bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe size={18} className="text-cyan-600" /> TikTok Campaigns <span className="text-xs font-bold text-slate-400">({ttCampaigns.length})</span>
                </h2>
              </div>
              {!ttConnected ? (
                <div className="p-12 text-center text-slate-400">
                  <Globe size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">Connect your TikTok account in the sidebar</p>
                </div>
              ) : ttCampaigns.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 size={32} className={`mx-auto mb-3 ${loadingTt ? 'animate-spin' : 'opacity-30'}`} />
                  <p className="font-bold text-sm">{loadingTt ? 'Loading campaigns...' : 'No campaigns found.'}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {ttCampaigns.map((camp: any) => {
                    const isActive = camp.status === 'ACTIVE' || camp.status === 'ACTIVED';
                    const budgetCents = parseFloat(camp.budget || '0') / 100;
                    const isExpanded = expandedCampaigns.has(camp.campaign_id);
                    const adsets = ttAdsets[camp.campaign_id] || [];
                    const loadingAdsets = loadingAdsetsMap[camp.campaign_id];
                    return (
                      <div key={camp.campaign_id}>
                        <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <button onClick={() => toggleCampaignExpand(camp.campaign_id, 'tiktok')} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              </button>
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{camp.campaign_name || 'Unnamed'}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{camp.status}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400">
                              <span>Objective: {camp.objective_type || '—'}</span>
                              <span>Budget: ${budgetCents.toFixed(2)}/day</span>
                              <span>Adsets: {adsets.length || '—'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => scaleTtBudget(camp.campaign_id, 20)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1">
                              <TrendingUp size={10} /> +20%
                            </button>
                            <button onClick={() => scaleTtBudget(camp.campaign_id, -20)}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1">
                              <TrendingUp size={10} className="rotate-180" /> -20%
                            </button>
                            <button onClick={() => toggleTtCampaign(camp.campaign_id, camp.status)}
                              className={`p-2 rounded-lg border transition-all ${isActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                              {isActive ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          </div>
                        </div>
                        {/* Adsets section */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                            {loadingAdsets ? (
                              <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                                <Loader2 size={12} className="animate-spin" /> Loading adsets...
                              </div>
                            ) : adsets.length === 0 ? (
                              <div className="p-4 text-center text-[10px] text-slate-400">No adsets found</div>
                            ) : (
                              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {adsets.map((adset: any) => {
                                  const adsetActive = adset.status === 'ACTIVE' || adset.status === 'ACTIVED';
                                  const adsetBudget = parseFloat(adset.budget || '0') / 100;
                                  const adsetExpanded = expandedAdsets.has(adset.adgroup_id);
                                  const ads = ttAds[adset.adgroup_id] || [];
                                  const loadingAds = loadingAdsMap[adset.adgroup_id];
                                  return (
                                    <div key={adset.adgroup_id}>
                                      <div className="p-3 pl-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="space-y-0.5 flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <button onClick={() => toggleAdsetExpand(adset.adgroup_id, 'tiktok')} className="p-0.5 text-slate-400 hover:text-slate-600">
                                              <ChevronDown size={11} className={`transition-transform ${adsetExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                            </button>
                                            <span className={`w-1.5 h-1.5 rounded-full ${adsetActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{adset.adgroup_name || 'Unnamed'}</span>
                                            <span className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${adsetActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{adset.status}</span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[9px] font-medium text-slate-400 ml-5">
                                            <span>Budget: ${adsetBudget.toFixed(2)}/day</span>
                                            <span>Ads: {ads.length || (loadingAds ? '...' : '—')}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 ml-12">
                                          <button onClick={() => scaleTtAdsetBudget(adset.adgroup_id, camp.campaign_id, 20)}
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">+20%</button>
                                          <button onClick={() => scaleTtAdsetBudget(adset.adgroup_id, camp.campaign_id, -20)}
                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[8px] font-black uppercase">-20%</button>
                                          <button onClick={() => toggleTtAdset(adset.adgroup_id, camp.campaign_id, adset.status)}
                                            className={`p-1 rounded border transition-all ${adsetActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                            {adsetActive ? <Pause size={11} /> : <Play size={11} />}
                                          </button>
                                        </div>
                                      </div>
                                      {/* Ads section */}
                                      {adsetExpanded && (
                                        <div className="border-t border-slate-100 dark:border-slate-700/30 bg-slate-100/50 dark:bg-slate-900/50">
                                          {loadingAds ? (
                                            <div className="p-3 pl-16 flex items-center gap-2 text-[10px] text-slate-400">
                                              <Loader2 size={10} className="animate-spin" /> Loading ads...
                                            </div>
                                          ) : ads.length === 0 ? (
                                            <div className="p-3 pl-16 text-[9px] text-slate-400">No ads found</div>
                                          ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-700/30">
                                              {ads.map((ad: any) => {
                                                const adActive = ad.status === 'ACTIVE' || ad.status === 'ACTIVED';
                                                return (
                                                  <div key={ad.ad_id} className="p-2.5 pl-16 flex justify-between items-center gap-2 hover:bg-slate-200/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className={`w-1 h-1 rounded-full ${adActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                      <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate">{ad.ad_name || 'Unnamed'}</span>
                                                      <span className={`px-1 py-0.5 rounded text-[7px] font-black uppercase ${adActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{ad.status}</span>
                                                    </div>
                                                    <button onClick={() => toggleTtAd(ad.ad_id, adset.adgroup_id, ad.status)}
                                                      className={`p-1 rounded border transition-all shrink-0 ${adActive ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                                                      {adActive ? <Pause size={10} /> : <Play size={10} />}
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Create Campaign Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreateForm(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" /> Create {showCreateForm === 'facebook' ? 'Meta' : 'TikTok'} Campaign
              </h2>
              <button onClick={() => setShowCreateForm(null)} className="p-2 text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Campaign Name</label>
                <input type="text" value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g., DZ - Summer Sale - Conversions"
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Objective</label>
                <select value={newCampaign.objective} onChange={e => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-sm">
                  {(showCreateForm === 'facebook' ? FB_OBJECTIVES : TT_OBJECTIVES).map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Daily Budget ($)</label>
                <input type="number" value={newCampaign.dailyBudget} onChange={e => setNewCampaign({ ...newCampaign, dailyBudget: e.target.value })}
                  placeholder="50"
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-none focus:ring-2 focus:ring-indigo-600 text-sm" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t flex justify-end gap-3">
              <button onClick={() => setShowCreateForm(null)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors text-sm">Cancel</button>
              <button onClick={showCreateForm === 'facebook' ? createFbCampaign : createTtCampaign} disabled={!newCampaign.name}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all text-sm disabled:opacity-50">
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
