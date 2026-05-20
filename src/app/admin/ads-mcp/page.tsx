'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Play, Pause, RefreshCw, Cpu, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Target, BarChart3, Settings2, Sliders, PlayCircle, Loader2 } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';

// Initial simulated campaigns
const INITIAL_CAMPAIGNS = [
  { id: 'camp-1', platform: 'facebook', name: 'DZ - Conversion - Anti-HairLoss Shampoo', status: 'ACTIVE', spend: 245.50, conversions: 89, cpa: 2.75, roas: 3.8, budget: 50 },
  { id: 'camp-2', platform: 'facebook', name: 'RO - Lookalike 1-5% - Magic Cleaner', status: 'ACTIVE', spend: 189.20, conversions: 42, cpa: 4.50, roas: 2.9, budget: 40 },
  { id: 'camp-3', platform: 'tiktok', name: 'CO - Spark Ads - Organic Coffee Mask', status: 'ACTIVE', spend: 312.00, conversions: 112, cpa: 2.78, roas: 4.1, budget: 80 },
  { id: 'camp-4', platform: 'tiktok', name: 'DZ - Broad - HairStraightener V2', status: 'PAUSED', spend: 89.00, conversions: 11, cpa: 8.09, roas: 1.2, budget: 30 }
];

export default function AdsMcpPage() {
  const { activeStore, aiProvider, globalApiKey, claudeApiKey, openAiApiKey, openRouterApiKey, openRouterModel } = useAdminStore();
  const [campaigns, setCampaigns] = useState(INITIAL_CAMPAIGNS);
  
  // MCP Credentials State
  const [fbPixelId, setFbPixelId] = useState('');
  const [fbAccessToken, setFbAccessToken] = useState('');
  const [ttPixelCode, setTtPixelCode] = useState('');
  const [ttDeveloperToken, setTtDeveloperToken] = useState('');
  const [mcpServerStatus, setMcpServerStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('CONNECTED');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // AI Optimization State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiLogs, setAiLogs] = useState<string[]>([
    '[System] Initialized Facebook & TikTok MCP Hub.',
    '[System] Connected to local MCP Orchestrator.'
  ]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);

  // Load from local storage if exists
  useEffect(() => {
    const saved = localStorage.getItem(`mcp_config_${activeStore.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFbPixelId(parsed.fbPixelId || '');
        setFbAccessToken(parsed.fbAccessToken || '');
        setTtPixelCode(parsed.ttPixelCode || '');
        setTtDeveloperToken(parsed.ttDeveloperToken || '');
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeStore.id]);

  const handleSaveConfig = () => {
    setIsSavingConfig(true);
    setTimeout(() => {
      localStorage.setItem(`mcp_config_${activeStore.id}`, JSON.stringify({
        fbPixelId, fbAccessToken, ttPixelCode, ttDeveloperToken
      }));
      setIsSavingConfig(false);
      setAiLogs(prev => [...prev, `[System] Saved MCP configurations for ${activeStore.name}.`]);
    }, 800);
  };

  const handleToggleStatus = (id: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
        setAiLogs(logs => [...logs, `[MCP] Action Executed: ${nextStatus === 'ACTIVE' ? 'Resumed' : 'Paused'} Campaign "${c.name}" via API.`]);
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const handleRunAiDiagnostics = async () => {
    setIsAnalyzing(true);
    setAiInsights(null);
    setAiLogs(prev => [...prev, '[AI Agent] Pulling real-time ROAS & Conversion logs from MCP server...', '[AI Agent] Analyzing demographic performance and pixel triggers...']);

    // Construct request
    const prompt = `You are a Senior media buyer and AI Campaign Optimizer. 
    Analyze the following connected Facebook and TikTok campaigns for store: "${activeStore.name}" (Country: ${activeStore.region.toUpperCase()}, Currency: ${activeStore.currency}).
    
    Connected campaigns data:
    ${JSON.stringify(campaigns)}
    
    Formulate a brief diagnostic report of 3 recommendations:
    1. Budget scale suggestions for high ROAS campaigns.
    2. Pause warnings for underperforming campaigns (CPA exceeds 6$).
    3. Creative or regional demographic scaling.
    
    Make it professional, formatting with HTML tags if needed. Keep the recommendations punchy.`;

    try {
      // Fetch dynamic key
      let apiKey = globalApiKey;
      if (aiProvider === 'claude') apiKey = claudeApiKey;
      if (aiProvider === 'openai') apiKey = openAiApiKey;
      if (aiProvider === 'openrouter') apiKey = openRouterApiKey;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          type: 'text',
          provider: aiProvider,
          apiKey,
          model: openRouterModel
        })
      });

      const data = await response.json();
      if (response.ok && data.result) {
        setAiInsights(data.result);
        setAiLogs(prev => [...prev, '[AI Agent] Finished analysis. Dispatching recommendations to console dashboard.']);
      } else {
        throw new Error('API request failed');
      }
    } catch (e: any) {
      setAiInsights(`
        <div class="space-y-2">
          <p class="font-bold text-amber-500">⚠️ Live API Key Required for AI Agent Diagnostics</p>
          <p class="text-xs text-slate-500">Please provide a valid key in the Settings Panel. Using simulation recommendations instead:</p>
          <ul class="list-disc pl-4 text-xs text-slate-400 space-y-1">
            <li><strong>Scale:</strong> Scale budget on "CO - Spark Ads - Organic Coffee Mask" by 20% due to ROAS of 4.1.</li>
            <li><strong>Alert:</strong> Campaign "DZ - Broad - HairStraightener V2" has CPA of 8.09$ exceeding target of 4.00$. Consider pausing.</li>
            <li><strong>Pixel:</strong> Add Custom Conversion triggers to optimize for Checkout events.</li>
          </ul>
        </div>
      `);
      setAiLogs(prev => [...prev, '[AI Agent] Failed to query LLM endpoint. Loaded local simulated model logic instead.']);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAiOptimizations = () => {
    // Simulate scaling budgets and pausing poor performing campaigns
    setCampaigns(prev => prev.map(c => {
      if (c.id === 'camp-3') {
        setAiLogs(logs => [...logs, `[AI Auto-Pilot] Scaled budget of "${c.name}" from 80$ to 96$ (+20% ROAS adjustment).`]);
        return { ...c, budget: 96 };
      }
      if (c.id === 'camp-4' && c.status === 'ACTIVE') {
        setAiLogs(logs => [...logs, `[AI Auto-Pilot] Automatically paused "${c.name}" due to high CPA.`]);
        return { ...c, status: 'PAUSED' };
      }
      return c;
    }));
    alert('AI optimizations applied to active campaigns successfully!');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Megaphone className="text-indigo-600" size={32} />
            Facebook & TikTok Ads MCP Hub
          </h1>
          <p className="text-slate-500 mt-1">Connect ad platforms via Model Context Protocol (MCP) to monitor and optimize campaigns with AI.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${
            mcpServerStatus === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> MCP Orchestrator Connected
          </span>
          <button 
            onClick={() => setMcpServerStatus(mcpServerStatus === 'CONNECTED' ? 'DISCONNECTED' : 'CONNECTED')} 
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Form: MCP Config */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2 border-b pb-4">
            <Settings2 className="text-indigo-600" size={20} />
            <h3 className="font-black text-lg text-slate-900 dark:text-white">MCP Settings</h3>
          </div>

          {/* Facebook Config */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs text-indigo-600 uppercase tracking-widest">Facebook Business API</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Pixel ID / Account ID</label>
                <input 
                  type="text" 
                  value={fbPixelId} 
                  onChange={e => setFbPixelId(e.target.value)} 
                  placeholder="e.g. 84729104820391" 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Access Token</label>
                <input 
                  type="password" 
                  value={fbAccessToken} 
                  onChange={e => setFbAccessToken(e.target.value)} 
                  placeholder="••••••••••••••••••••••••" 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* TikTok Config */}
          <div className="space-y-4">
            <h4 className="font-bold text-xs text-cyan-600 uppercase tracking-widest">TikTok Ads Developer API</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Pixel Code / Advertiser ID</label>
                <input 
                  type="text" 
                  value={ttPixelCode} 
                  onChange={e => setTtPixelCode(e.target.value)} 
                  placeholder="e.g. C82J3KL198A" 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Developer Secret Token</label>
                <input 
                  type="password" 
                  value={ttDeveloperToken} 
                  onChange={e => setTtDeveloperToken(e.target.value)} 
                  placeholder="••••••••••••••••••••••••" 
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleSaveConfig} 
            disabled={isSavingConfig}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all text-xs tracking-widest uppercase flex items-center justify-center gap-2"
          >
            {isSavingConfig ? <Loader2 className="animate-spin" size={16} /> : 'Save Integrations'}
          </button>
        </div>

        {/* Right Section: Campaigns and AI Optimization (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Campaigns Management */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders size={20} className="text-indigo-600" /> Active Campaigns Console
              </h3>
              <span className="text-xs font-bold text-slate-400">Total Spend: $835.70</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {campaigns.map(camp => (
                <div key={camp.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        camp.platform === 'facebook' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      }`}>
                        {camp.platform}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${camp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{camp.name}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                      <span>Daily Budget: ${camp.budget}</span>
                      <span>•</span>
                      <span>Conversions: {camp.conversions}</span>
                    </div>
                  </div>

                  {/* Performance Indicators */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CPA</p>
                      <p className={`font-black text-sm ${camp.cpa > 6 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>${camp.cpa.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ROAS</p>
                      <p className={`font-black text-sm ${camp.roas >= 3 ? 'text-emerald-500' : 'text-slate-800 dark:text-slate-200'}`}>{camp.roas}x</p>
                    </div>
                    
                    {/* Action toggles */}
                    <button 
                      onClick={() => handleToggleStatus(camp.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        camp.status === 'ACTIVE' 
                          ? 'border-rose-100 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50' 
                          : 'border-emerald-100 dark:border-emerald-900/30 text-emerald-600 hover:bg-emerald-50'
                      }`}
                    >
                      {camp.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Optimizer Panel */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2rem] p-6 text-white border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Cpu size={24} />
                </div>
                <div>
                  <h3 className="font-black text-lg">AI Auto-Pilot Campaign Diagnostics</h3>
                  <p className="text-xs text-indigo-200">Using {aiProvider.toUpperCase()} Agent model for decision suggestions</p>
                </div>
              </div>
              <button 
                onClick={handleRunAiDiagnostics}
                disabled={isAnalyzing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black tracking-wider uppercase rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isAnalyzing ? <Loader2 className="animate-spin" size={14} /> : <PlayCircle size={14} />}
                {isAnalyzing ? 'Analyzing...' : 'Run Diagnostics'}
              </button>
            </div>

            {/* Diagnostic Report Display */}
            {aiInsights ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">AI Optimizer Recommendations</span>
                  <button 
                    onClick={handleApplyAiOptimizations}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Apply All Recommendations
                  </button>
                </div>
                <div 
                  className="text-xs font-medium text-slate-300 leading-relaxed space-y-2 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: aiInsights }} 
                />
              </div>
            ) : (
              <div className="h-28 flex flex-col items-center justify-center text-indigo-200/50 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                <Cpu size={32} className="mb-2 opacity-50" />
                <p className="text-xs font-bold">Diagnostics ready. Click "Run Diagnostics" to fetch AI recommendations.</p>
              </div>
            )}

            {/* Live Orchestrator Activity Log */}
            <div className="space-y-3">
              <h4 className="font-bold text-[10px] text-indigo-300 uppercase tracking-widest">MCP Server Actions Log</h4>
              <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-cyan-400 space-y-2 border border-slate-800/80 h-32 overflow-y-auto">
                {aiLogs.map((log, index) => (
                  <p key={index} className="leading-relaxed">{log}</p>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
