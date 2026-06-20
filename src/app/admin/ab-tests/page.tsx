'use client';

import { useState, useEffect } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { Save, Plus, Trash2, SplitSquareHorizontal, Link as LinkIcon, BarChart3, Eye, Copy } from 'lucide-react';

export default function AdminABTestsPage() {
  const { activeStore, landingPages, setLandingPages, addActivityLog } = useAdminStore();
  
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';

  const { notify } = useNotificationStore();

  // Filter landing pages vs AB tests
  const storePages = landingPages.filter(p => p.storeId === activeStore.id && !p.htmlContent?.includes('"isAbTest":true'));
  const abTests = landingPages.filter(p => p.storeId === activeStore.id && p.htmlContent?.includes('"isAbTest":true'));

  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [variantAId, setVariantAId] = useState<string>('');
  const [variantBId, setVariantBId] = useState<string>('');
  const [trafficSplit, setTrafficSplit] = useState(50);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Analytics tracking state
  const [analytics, setAnalytics] = useState<Record<string, { views: number, conversions: number }>>({});

  const existingTest = selectedTestId ? abTests.find(p => p.id === selectedTestId) : null;

  // Fetch analytics for variants when a test is selected
  useEffect(() => {
    if (existingTest) {
      try {
        const config = JSON.parse(existingTest.htmlContent);
        if (config.variants && config.variants.length > 0) {
          const variantIds = config.variants.join(',');
          fetch(`/api/tracking?storeId=${activeStore.id}&variantIds=${variantIds}`)
            .then(res => res.json())
            .then(data => {
              if (data.success) {
                setAnalytics(data.stats);
              }
            })
            .catch(console.error);
        }
      } catch (e) {
        console.error("Failed to parse A/B test config", e);
      }
    }
  }, [existingTest, activeStore.id]);

  const loadExisting = (testId: string) => {
    const test = abTests.find(p => p.id === testId);
    if (test) {
      setTitle(test.title || '');
      setSlug(test.slug);
      try {
        const config = JSON.parse(test.htmlContent);
        setVariantAId(config.variants?.[0] || '');
        setVariantBId(config.variants?.[1] || '');
        setTrafficSplit(config.trafficSplit || 50);
      } catch (e) {
        setVariantAId('');
        setVariantBId('');
        setTrafficSplit(50);
      }
      setSelectedTestId(test.id);
    }
  };

  const handleCreateNew = () => {
    setTitle('New Split Test');
    setSlug(`split-test-${Date.now().toString().slice(-4)}`);
    setVariantAId('');
    setVariantBId('');
    setTrafficSplit(50);
    setSelectedTestId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!variantAId || !variantBId) {
      notify('You must select exactly 2 variants to test against each other.', 'error');
      return;
    }

    if (variantAId === variantBId) {
      notify('Variant A and Variant B must be different pages.', 'error');
      return;
    }

    const config = {
      isAbTest: true,
      variants: [variantAId, variantBId],
      trafficSplit
    };

    setLandingPages(prev => {
      const pageId = existingTest ? existingTest.id : 'abtest_' + Date.now().toString();
      const updatedTest = {
        id: pageId,
        storeId: activeStore.id,
        title,
        slug,
        htmlContent: JSON.stringify(config),
        published: true
      };
      if (existingTest) {
        return prev.map(p => p.id === existingTest.id ? updatedTest : p);
      } else {
        return [...prev, updatedTest];
      }
    });

    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: existingTest ? 'A/B Test Updated' : 'A/B Test Created',
      detail: `${existingTest ? 'Updated' : 'Created'} A/B test "${title}" (slug: /promo/${slug})`
    });

    notify(`A/B Test saved successfully!`, "success");
    
    if (!existingTest) {
      setSelectedTestId('abtest_' + Date.now().toString()); 
      handleCreateNew(); 
    }
  };

  const handleCopyUrl = () => {
    if (!slug) return;
    const isCustomDomain = typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && !window.location.hostname.includes('localhost');
    const baseUrl = isCustomDomain ? window.location.origin : (activeStore.customDomain ? `https://${activeStore.customDomain}` : `${window.location.origin}/${activeStore.region}`);
    const url = `${baseUrl}/promo/${slug}`;
    navigator.clipboard.writeText(url);
    notify('Live URL Copied!', 'success');
  };

  const handleDeleteTest = () => {
    setIsDeleteModalOpen(true);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 pb-12 items-start">
      
      {/* Sidebar for saved tests */}
      <div className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm md:sticky md:top-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
          <SplitSquareHorizontal size={16} /> A/B Tests
        </h3>
        <div className="space-y-2">
          {abTests.map(test => {
            return (
              <button 
                key={test.id} 
                onClick={() => loadExisting(test.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selectedTestId === test.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="truncate">{test.title || `/${test.slug}`}</div>
                <div className="text-xs text-slate-400 font-normal truncate">
                  /{test.slug}
                </div>
              </button>
            );
          })}
          {abTests.length === 0 && (
            <div className="text-xs text-slate-400 font-medium px-2">No A/B tests active.</div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Split Testing Engine</h1>
            <p className="text-slate-500 font-medium">Route traffic between different landing pages to find the highest converting design.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-md">
              <Plus size={18} /> New Split Test
            </button>
            {existingTest && (
              <button onClick={handleCopyUrl} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                <Copy size={18} /> Copy Test URL
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">A/B Test Name</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                placeholder="e.g. Summer Sale Split Test"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Live URL Slug</label>
              <div className="flex items-center">
                <span className="bg-slate-100 border border-slate-300 border-r-0 px-4 py-3 rounded-l-xl text-slate-500 font-mono text-sm">
                  /{activeStore.region}/promo/
                </span>
                <input 
                  type="text" 
                  value={slug}
                  onChange={(e) => {
                    const formatted = e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, '');
                    setSlug(formatted);
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-r-xl focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-slate-900"
                  placeholder="e.g. summer-test"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 relative">
            <h3 className="font-black text-lg text-slate-900 mb-6 flex items-center gap-2">
              <SplitSquareHorizontal className="text-indigo-600" />
              Configure Traffic Split
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Variant A */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm inline-block">Variant A ({trafficSplit}%)</label>
                </div>
                <select
                  value={variantAId}
                  onChange={e => setVariantAId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-indigo-100 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 bg-white shadow-sm"
                  required
                >
                  <option value="" disabled>Select a Landing Page...</option>
                  {storePages.map(p => (
                    <option key={p.id} value={p.id}>{p.title || p.slug}</option>
                  ))}
                </select>
                
                {existingTest && variantAId && analytics[variantAId] && (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase mb-1">Performance</div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5"><Eye size={14} className="text-indigo-500"/> <span className="font-bold">{analytics[variantAId].views}</span> views</div>
                        <div className="flex items-center gap-1.5"><BarChart3 size={14} className="text-emerald-500"/> <span className="font-bold">{analytics[variantAId].conversions}</span> conv.</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-900">
                        {analytics[variantAId].views > 0 ? ((analytics[variantAId].conversions / analytics[variantAId].views) * 100).toFixed(1) : '0'}%
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Conv. Rate</div>
                    </div>
                  </div>
                )}
              </div>

              {/* VS Divider (Desktop) */}
              <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-0">
                <div className="bg-white w-10 h-10 rounded-full border border-slate-200 shadow-sm flex items-center justify-center font-black text-slate-400 text-sm transform translate-y-2">
                  VS
                </div>
              </div>

              {/* Variant B */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm inline-block">Variant B ({100 - trafficSplit}%)</label>
                </div>
                <select
                  value={variantBId}
                  onChange={e => setVariantBId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-indigo-100 focus:border-indigo-500 rounded-xl outline-none font-bold text-slate-800 bg-white shadow-sm"
                  required
                >
                  <option value="" disabled>Select a Landing Page...</option>
                  {storePages.map(p => (
                    <option key={p.id} value={p.id}>{p.title || p.slug}</option>
                  ))}
                </select>

                {existingTest && variantBId && analytics[variantBId] && (
                  <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase mb-1">Performance</div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1.5"><Eye size={14} className="text-indigo-500"/> <span className="font-bold">{analytics[variantBId].views}</span> views</div>
                        <div className="flex items-center gap-1.5"><BarChart3 size={14} className="text-emerald-500"/> <span className="font-bold">{analytics[variantBId].conversions}</span> conv.</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-900">
                        {analytics[variantBId].views > 0 ? ((analytics[variantBId].conversions / analytics[variantBId].views) * 100).toFixed(1) : '0'}%
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Conv. Rate</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-200 pt-6">
              <label className="block text-sm font-bold text-slate-700 mb-2 flex justify-between">
                <span>Traffic Split</span>
                <span className="text-indigo-600 font-black">{trafficSplit}% / {100 - trafficSplit}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={trafficSplit}
                onChange={e => setTrafficSplit(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-2">
                <span>All to A</span>
                <span>Even Split (50/50)</span>
                <span>All to B</span>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-slate-500 flex items-start gap-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 mb-8">
            <span className="text-indigo-500 mt-0.5">💡</span>
            <p>When visitors access the live URL, traffic will be split based on the configured percentages. Visitors are automatically cookied so they will consistently see the same variant on return visits.</p>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            {existingTest ? (
              <button type="button" onClick={handleDeleteTest} className="text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors">
                <Trash2 size={20} /> Delete A/B Test
              </button>
            ) : <div />}
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all text-white px-8 py-4 rounded-xl font-black flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Save size={20} /> {existingTest ? 'Update Split Test' : 'Start Split Test'}
            </button>
          </div>

        </form>
      </div>
    </div>

    <ConfirmModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      onConfirm={() => {
        if (existingTest) {
          addActivityLog({
            storeId: activeStore.id,
            user: sessionUser,
            action: 'A/B Test Deleted',
            detail: `Deleted A/B test "${existingTest.title}" (slug: /promo/${existingTest.slug})`
          });
        }
        setLandingPages(prev => prev.filter(p => p.id !== existingTest?.id));
        handleCreateNew();
        notify('A/B test deleted! The underlying landing pages were NOT deleted.', 'success');
      }}
      title="Delete A/B Test?"
      message={`Are you sure you want to delete "${title}"? This will stop routing traffic to these variants immediately. The actual landing page designs will NOT be deleted.`}
      confirmText="Delete Test"
      variant="danger"
    />
    </>
  );
}
