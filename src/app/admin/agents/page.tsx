'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, CheckCircle, Search, Target, Megaphone, Presentation, FileText, ShoppingBag, X, Paperclip, ImageIcon } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { aiService } from '@/lib/services/aiService';

const AGENTS = [
  { id: 'cro', name: 'CRO Specialist', icon: <Presentation size={20} />, description: 'Builds high-converting landing pages', promptRole: 'Conversion Rate Optimization (CRO) Expert' },
  { id: 'copywriter', name: 'Copywriter', icon: <FileText size={20} />, description: 'Product copy, Facebook ad copy & URL product research', promptRole: 'E-commerce Copywriter & Facebook Ads Copy Specialist' },
  { id: 'product', name: 'Product Analyst', icon: <ShoppingBag size={20} />, description: 'Analyzes products and suggests pricing strategies', promptRole: 'E-commerce Product Strategy Analyst' },
  { id: 'market', name: 'Market Researcher', icon: <Search size={20} />, description: 'Finds trending products and market gaps', promptRole: 'E-commerce Market Research Analyst' },
  { id: 'social', name: 'FB/TikTok Analyst', icon: <Megaphone size={20} />, description: 'Writes ad scripts and analyzes campaign angles', promptRole: 'Facebook & TikTok Ads Strategist' }
];

type Message = {
  id: string;
  role: 'user' | 'agent';
  content: string;
  attachments?: { data: string, mimeType: string, name: string }[];
  action?: {
    type: string;
    previewData: any;
  };
};

export default function AgentsHubPage() {
  const { activeStore, aiProvider, setLandingPages, products, setProducts, agentChats, setAgentChat, addActivityLog, addProduct, categories, setCategories } = useAdminStore();
  const [previewPageData, setPreviewPageData] = useState<{
    msgId: string;
    action: any;
    title: string;
    slug: string;
    productId: string;
    htmlContent: string;
  } | null>(null);

  const storeProducts = products.filter(p => p.storeId === activeStore.id);
  const [selectedAgentId, setSelectedAgentId] = useState(AGENTS[0].id);
  const [input, setInput] = useState('');

  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';
  const [attachments, setAttachments] = useState<{ data: string, mimeType: string, name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAgent = AGENTS.find(a => a.id === selectedAgentId)!;
  const chatKey = `${activeStore.id}_${selectedAgentId}`;
  const messages = agentChats[chatKey] || [];

  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    if (typeof newMessages === 'function') {
      setAgentChat(activeStore.id, selectedAgentId, newMessages(messages));
    } else {
      setAgentChat(activeStore.id, selectedAgentId, newMessages);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Provide relevant store context based on agent
  const getContextForAgent = () => {
    const state = useAdminStore.getState();
    const context: any = {
      storeRegion: activeStore.region,
      storeCurrency: activeStore.currency,
      storeLanguage: activeStore.language
    };

    if (selectedAgentId === 'product' || selectedAgentId === 'cro' || selectedAgentId === 'copywriter' || selectedAgentId === 'social') {
      context.products = state.products.filter(p => p.storeId === activeStore.id).slice(0, 20);
    }
    
    return context;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setAttachments(prev => [...prev, {
            data: event.target!.result as string,
            mimeType: file.type,
            name: file.name
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: input,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };
    
    setMessages(prev => [...prev, userMessage]);
    const inputForLog = input.trim();
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      addActivityLog({
        storeId: activeStore.id,
        user: sessionUser,
        action: 'Agent Queried',
        detail: `Consulted ${selectedAgent.name} with input: "${inputForLog.length > 50 ? inputForLog.substring(0, 47) + '...' : inputForLog}"`
      });

      let enrichedContent = userMessage.content;
      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = enrichedContent.match(urlRegex);
      if (urls && urls.length > 0) {
        const fetchedTexts: string[] = [];
        for (const url of urls.slice(0, 3)) {
          try {
            const res = await fetch('/api/ai/fetch-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
            });
            if (res.ok) {
              const data = await res.json();
              const snippet = `[Content from ${url}]\nTitle: ${data.title || 'N/A'}\nDescription: ${data.description || 'N/A'}\nText: ${(data.text || '').slice(0, 3000)}\n[/Content]`;
              fetchedTexts.push(snippet);
            }
          } catch {}
        }
        if (fetchedTexts.length > 0) {
          enrichedContent += '\n\n--- WEB CONTENT FETCHED FROM URLS ---\n' + fetchedTexts.join('\n\n');
        }
      }

      const response = await aiService.chatWithAgent(selectedAgent.promptRole, enrichedContent, getContextForAgent(), userMessage.attachments, messages);
      
      if (response) {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: response.message || 'I have completed the analysis.',
          action: response.proposedAction && response.proposedAction.type !== 'NONE' ? response.proposedAction : undefined
        };
        setMessages(prev => [...prev, agentMessage]);
      } else {
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: 'Sorry, I encountered an error. Please check your API keys.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'agent', content: 'Sorry, an unexpected error occurred.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateAction = async (action: any, msgId: string) => {
    if (action.type === 'CREATE_LANDING_PAGE') {
      const newPage = {
        id: Date.now().toString(),
        storeId: activeStore.id,
        title: action.previewData.title || 'AI Generated Page',
        slug: 'promo-' + Math.random().toString(36).substring(7),
        productId: action.previewData.productId || '',
        htmlContent: action.previewData.htmlContent || '<h1>Missing HTML</h1>',
        status: 'draft',
        createdAt: new Date().toISOString()
      };
      setLandingPages(prev => [...prev, newPage as any]);
      addActivityLog({
        storeId: activeStore.id,
        user: sessionUser,
        action: 'Landing Page Created',
        detail: `Created AI landing page: ${newPage.title}`
      });
      alert('Landing Page added to your Promo section!');
    } else if (action.type === 'CREATE_PRODUCT') {
      const pd = action.previewData || {};
      const newProduct = {
        id: '',
        storeId: activeStore.id,
        title: pd.title || 'AI Generated Product',
        price: typeof pd.price === 'number' ? pd.price : 0,
        compareAtPrice: pd.compareAtPrice,
        costPrice: pd.costPrice,
        category: pd.category || 'General',
        active: true,
        image: pd.image || '',
        shortDesc: pd.shortDesc || '',
        mainDesc: pd.mainDesc || '',
        stock: typeof pd.stock === 'number' ? pd.stock : 999,
        seoTitle: pd.seoTitle || '',
        seoDescription: pd.seoDescription || '',
        lowStockThreshold: 5,
        disableOutOfStockPurchases: false,
        disableCoupons: false,
      };
      if (newProduct.category && !categories.some(c => c.toLowerCase() === newProduct.category.toLowerCase())) {
        setCategories(prev => [...prev, newProduct.category]);
      }
      await addProduct(newProduct as any);
      addActivityLog({
        storeId: activeStore.id,
        user: sessionUser,
        action: 'Product Created',
        detail: `Created AI product: ${newProduct.title}`
      });
      alert(`Product "${newProduct.title}" added to your store!`);
    } else if (action.type === 'UPDATE_PRODUCT') {
      addActivityLog({
        storeId: activeStore.id,
        user: sessionUser,
        action: 'Product Updated',
        detail: `Updated product via AI suggestions`
      });
      alert('Product updated (simulation)!');
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, action: { ...m.action!, applied: true } as any } : m));
  };

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Bot className="text-indigo-600" size={32} />
            AI Agents Hub
          </h1>
          <p className="text-slate-500 mt-1">Collaborate with specialized AI agents to build and optimize your store.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 rounded-xl text-emerald-700 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-900/30">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Optimized for {(activeStore?.region || 'dz').toUpperCase()} ({activeStore?.currency || 'DZD'})
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl text-indigo-700 dark:text-indigo-400 font-bold text-sm">
            <Sparkles size={16} /> Using {(aiProvider || 'gemini').toUpperCase()} Model
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Agent Roster Sidebar */}
        <div className="w-80 flex flex-col gap-2 overflow-y-auto pr-2 pb-8">
          {AGENTS.map(agent => (
            <button
              key={agent.id}
              onClick={() => {
                setSelectedAgentId(agent.id);
                setMessages([]); // Clear chat on switch
              }}
              className={`p-4 rounded-2xl text-left transition-all border ${
                selectedAgentId === agent.id 
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/30' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2 font-bold">
                <div className={`p-2 rounded-lg ${selectedAgentId === agent.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'}`}>
                  {agent.icon}
                </div>
                {agent.name}
              </div>
              <p className={`text-xs ${selectedAgentId === agent.id ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {agent.description}
              </p>
            </button>
          ))}
        </div>

        {/* Chat Interface */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              {selectedAgent.icon}
            </div>
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white">{selectedAgent.name}</h2>
              <p className="text-xs text-slate-500">Ready to assist with {activeStore.name}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <Bot size={48} className="text-slate-200 dark:text-slate-700" />
                <p>Start a conversation with the {selectedAgent.name}</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'agent' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      {selectedAgent.icon}
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col'}`}>
                    <div className={`p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Render User Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {msg.attachments.map((att: any, i: number) => (
                            <div key={i} className="relative rounded-lg overflow-hidden border border-white/20 bg-white/10 w-24 h-24 flex items-center justify-center">
                              {att.mimeType.startsWith('image/') ? (
                                <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center p-2">
                                  <FileText size={24} className="mx-auto mb-1 opacity-70" />
                                  <span className="text-[10px] truncate block w-full">{att.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Proposal Card */}
                    {msg.action && (
                      <div className="mt-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-4 shadow-sm w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                          <Target size={16} /> 
                          Proposed Action: {msg.action.type.replace(/_/g, ' ')}
                        </div>
                        
                        {msg.action.type === 'CREATE_LANDING_PAGE' ? (
                          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">{msg.action.previewData.title || 'AI Generated Page'}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">Contains custom HTML with high-converting headings optimized for {(activeStore?.region || 'dz').toUpperCase()} market.</p>
                          </div>
                        ) : msg.action.type === 'CREATE_PRODUCT' ? (
                          <div className="space-y-3 mb-4">
                            {(() => {
                              const pd = msg.action.previewData || {};
                              const price = pd.price || 0;
                              const comparePrice = pd.compareAtPrice || null;
                              const costPrice = pd.costPrice || null;
                              const currency = activeStore?.currency || 'DZD';
                              return (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                  {pd.image && (
                                    <div className="w-full h-32 bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                      <img src={pd.image} alt={pd.title} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    </div>
                                  )}
                                  <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{pd.title || 'Unnamed Product'}</h4>
                                        {pd.category && <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md text-[9px] font-black uppercase tracking-wider">{pd.category}</span>}
                                      </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-xl font-black text-slate-900 dark:text-white">{currency} {price.toFixed(2).toLocaleString()}</span>
                                      {comparePrice && <span className="text-sm font-semibold text-slate-400 line-through">{currency} {comparePrice.toFixed(2).toLocaleString()}</span>}
                                    </div>
                                    {costPrice && <p className="text-[10px] text-slate-400">Cost: {currency} {costPrice.toFixed(2)} (Margin: {((price - costPrice) / price * 100).toFixed(0)}%)</p>}
                                    {pd.shortDesc && <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{pd.shortDesc}</p>}
                                    {pd.mainDesc && (
                                      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 max-h-32 overflow-y-auto">
                                        <div className="text-xs text-slate-700 dark:text-slate-300 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: pd.mainDesc }} />
                                      </div>
                                    )}
                                    {pd.stock !== undefined && <p className="text-[10px] font-bold text-slate-400">Stock: {pd.stock}</p>}
                                    {(pd.seoTitle || pd.seoDescription) && (
                                      <details className="text-xs">
                                        <summary className="cursor-pointer font-bold text-slate-500 hover:text-slate-700">SEO Details</summary>
                                        <div className="mt-2 space-y-1 text-slate-500">
                                          {pd.seoTitle && <p><span className="font-semibold">Title:</span> {pd.seoTitle}</p>}
                                          {pd.seoDescription && <p><span className="font-semibold">Meta Desc:</span> {pd.seoDescription}</p>}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 mb-4 max-h-40 overflow-y-auto">
                            {JSON.stringify(msg.action.previewData, null, 2)}
                          </div>
                        )}

                        {(msg.action as any).applied ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-lg justify-center">
                            <CheckCircle size={16} /> Applied Successfully
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              if (msg.action.type === 'CREATE_LANDING_PAGE') {
                                setPreviewPageData({
                                  msgId: msg.id,
                                  action: msg.action,
                                  title: msg.action.previewData.title || 'AI Generated Page',
                                  slug: 'promo-' + Math.random().toString(36).substring(7),
                                  productId: msg.action.previewData.productId || '',
                                  htmlContent: msg.action.previewData.htmlContent || '<h1>Missing HTML</h1>'
                                });
                              } else {
                                handleValidateAction(msg.action, msg.id);
                              }
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                            <CheckCircle size={16} /> {msg.action.type === 'CREATE_LANDING_PAGE' ? 'Preview & Confirm' : msg.action.type === 'CREATE_PRODUCT' ? 'Add to Store' : 'Validate & Apply'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                {attachments.map((att: any, i: number) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 group flex items-center justify-center">
                    {att.mimeType.startsWith('image/') ? (
                      <img src={att.data} alt="Upload preview" className="w-full h-full object-cover" />
                    ) : (
                      <FileText size={24} className="text-slate-400" />
                    )}
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-2">
              <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*,.csv,.pdf,.txt"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded-xl transition-colors"
                title="Attach files or photos"
              >
                <Paperclip size={20} />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask the ${selectedAgent.name} to do something...`}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-900 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white resize-none min-h-[44px] max-h-[120px]"
                disabled={isLoading}
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-3 rounded-xl transition-colors flex items-center justify-center"
              >
                <Send size={20} className={isLoading ? "animate-pulse" : ""} />
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
              AI can make mistakes. Always validate proposed actions before applying.
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* Landing Page Preview & Confirmation Modal */}
      {previewPageData && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="text-indigo-600 animate-pulse" size={24} />
                  Confirm Landing Page Creation
                </h3>
                <p className="text-sm text-slate-500 mt-1">Review the AI-generated landing page layout and settings before publishing.</p>
              </div>
              <button 
                onClick={() => setPreviewPageData(null)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Column: Settings Form */}
              <div className="w-full md:w-1/3 p-6 border-r border-slate-200 dark:border-slate-800 overflow-y-auto space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Page Title</label>
                  <input 
                    type="text" 
                    value={previewPageData.title}
                    onChange={(e) => setPreviewPageData({ ...previewPageData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:outline-none text-sm font-semibold"
                    placeholder="Enter page title..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Slug URL Path</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 rounded-l-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs border border-r-0 border-slate-200 dark:border-slate-700 font-mono">
                      /{activeStore.region}/promo/
                    </span>
                    <input 
                      type="text" 
                      value={previewPageData.slug}
                      onChange={(e) => setPreviewPageData({ ...previewPageData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                      className="flex-1 px-4 py-2.5 rounded-r-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:outline-none text-xs font-mono"
                      placeholder="page-slug"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Lowercase letters, numbers, and dashes only.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Associated Product (Optional)</label>
                  <select 
                    value={previewPageData.productId}
                    onChange={(e) => setPreviewPageData({ ...previewPageData, productId: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-600 focus:outline-none text-xs font-bold"
                  >
                    <option value="">-- Select Product --</option>
                    {storeProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Links shortcodes like [CHECKOUT_FORM] to this product checkout.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">HTML Source Code</label>
                  <textarea 
                    value={previewPageData.htmlContent}
                    onChange={(e) => setPreviewPageData({ ...previewPageData, htmlContent: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-[10px] focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Right Column: Live Frame Preview */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Live Page Preview (Responsive Frame)</span>
                  <div className="flex gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
                <div className="flex-1 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <iframe 
                    title="Landing Page Preview"
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="utf-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <script src="https://cdn.tailwindcss.com"></script>
                          <style>
                            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
                          </style>
                        </head>
                        <body>
                          ${previewPageData.htmlContent.replace(/\[CHECKOUT_FORM(?::([^\]]+))?\]/g, `
                            <div style="max-width: 450px; margin: 30px auto; padding: 20px; border: 2px dashed #6366f1; border-radius: 16px; text-align: center; background: #e0e7ff; color: #4338ca; font-weight: bold; font-family: sans-serif;">
                              🛍️ [Interactive COD Checkout Form Here]
                            </div>
                          `)}
                        </body>
                      </html>
                    `}
                    className="w-full h-full border-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
              <button 
                onClick={() => setPreviewPageData(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  const finalPage = {
                    id: 'promo_' + Date.now().toString(),
                    storeId: activeStore.id,
                    title: previewPageData.title,
                    slug: previewPageData.slug || 'promo-' + Math.random().toString(36).substring(7),
                    productId: previewPageData.productId,
                    htmlContent: previewPageData.htmlContent,
                    published: true,
                    createdAt: new Date().toISOString()
                  };
                  setLandingPages(prev => [...prev, finalPage as any]);
                  
                  addActivityLog({
                    storeId: activeStore.id,
                    user: sessionUser,
                    action: 'Landing Page Created',
                    detail: `Created and published AI landing page "${finalPage.title}" (slug: /promo/${finalPage.slug})`
                  });

                  // Mark as applied in chat
                  setMessages(prev => prev.map(m => m.id === previewPageData.msgId ? { ...m, action: { ...m.action!, applied: true } as any } : m));
                  setPreviewPageData(null);
                  alert('Landing Page added to your Promo section and published successfully!');
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-95"
              >
                Confirm & Publish Landing Page
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
