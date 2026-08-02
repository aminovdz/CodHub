'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, CheckCircle, Search, Target, Megaphone, Presentation, FileText, ShoppingBag, X, Paperclip, ImageIcon, Upload, Trash2, Copy, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const sanitizeHTML = (html: string) => {
  if (typeof window === 'undefined') return html;
  const purify = (DOMPurify as any).default || DOMPurify;
  if (purify && purify.sanitize) return purify.sanitize(html);
  return html;
};
import { useAdminStore } from '@/lib/store/useAdminStore';
import { aiService } from '@/lib/services/aiService';

import { AGENTS } from '@/lib/agents/agentConfig';
import { SkillRegistry } from '@/lib/agents/skills/registry';
import RichHtmlContent from '@/components/RichHtmlContent';

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
  const { activeStore, aiProvider, setLandingPages, products, setProducts, agentChats, setAgentChat, addActivityLog, addProduct, categories, setCategories, addDynamicSkill } = useAdminStore();
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
  const skillUploadRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const STARTER_PROMPTS: Record<string, string[]> = {
    'cro': [
      'Analyze this AliExpress product and build a landing page: [paste URL here]',
      'Build a high-converting COD landing page for a posture corrector belt targeting Algerian women',
      'What are the top 5 conversion killers in COD landing pages?'
    ],
    'copywriter': [
      'Write product copy for this AliExpress product: [paste URL here]',
      'Write 3 Facebook ad copy variations for a kitchen blender targeting Algerian households',
      'Create a product listing with SEO title, description, and features for a smart watch'
    ],
    'product': [
      'Analyze this product margin: cost 1200 DZD, selling at 3500 DZD, 15% RTO rate',
      'Evaluate this AliExpress product for the Algerian market: [paste URL]',
      'Compare pricing strategies for a posture corrector: 2900 vs 3500 vs 4500 DZD'
    ],
    'market': [
      'What are the top 5 trending COD products in Algeria right now?',
      'Find underserved niches in the Algerian health & beauty market',
      'What seasonal products should I prepare for Ramadan?'
    ],
    'social': [
      'Write 3 TikTok hook scripts for a portable blender',
      'Create a Facebook ad campaign plan with targeting for kitchen gadgets in Algeria',
      'What is the optimal daily test budget for a new COD product launch?'
    ],
    'default': ['How can you help me today?', 'What is your main expertise?']
  };

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

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear this conversation?')) {
      setMessages([]);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
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

  const handleSkillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    
    // Simple regex parser for YAML frontmatter
    const frontmatterMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const instructions = frontmatterMatch[2].trim();
      
      const nameMatch = frontmatter.match(/name:\s*(.+)/);
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      
      const skillName = nameMatch ? nameMatch[1].trim() : file.name;
      const description = descMatch ? descMatch[1].trim() : 'Dynamic skill uploaded from markdown';
      
      const newSkill = {
        id: `DYNAMIC_${Date.now()}`,
        name: skillName,
        description,
        instructions,
        requiresValidation: false,
        execute: async (data: any, context: any) => {
          context.addActivityLog({
            storeId: context.activeStoreId,
            user: context.sessionUser,
            action: 'Dynamic Skill Action',
            detail: `Executed dynamic skill: ${skillName}`
          });
        }
      };
      
      addDynamicSkill(newSkill);
      alert(`Skill "${skillName}" successfully uploaded and assigned to your agents!`);
    } else {
      alert("Invalid skill markdown format. Missing frontmatter.");
    }
    
    if (skillUploadRef.current) {
      skillUploadRef.current.value = '';
    }
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
      
      const skills = SkillRegistry.getSkills(selectedAgent.skills || []);
      const context = {
        activeStoreId: activeStore.id,
        sessionUser,
        categories,
        setCategories,
        addProduct,
        addActivityLog,
        setLandingPages
      };

      for (const skill of skills) {
        if (skill.preProcess) {
          enrichedContent = await skill.preProcess(enrichedContent, context);
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
    let skill = SkillRegistry.getSkill(action.type);
    
    // Fallback for dynamic skills loaded from local storage where we lost the 'execute' function
    const dynamicSkillMeta = useAdminStore.getState().dynamicSkills?.find(s => s.id === action.type);
    if (!skill && dynamicSkillMeta) {
      skill = {
        ...dynamicSkillMeta,
        execute: async (data: any, context: any) => {
          context.addActivityLog({
            storeId: context.activeStoreId,
            user: context.sessionUser,
            action: 'Dynamic Skill Action',
            detail: `Executed dynamic skill: ${dynamicSkillMeta.name}`
          });
        }
      };
    }
    
    if (skill && skill.execute) {
      try {
        const context = {
          activeStoreId: activeStore.id,
          sessionUser,
          categories,
          setCategories,
          addProduct,
          addActivityLog,
          setLandingPages
        };
        
        await skill.execute(action.previewData, context);
        
        if (!action.type.includes('LANDING_PAGE')) {
          // Landing page handles its own alert currently in the modal
          alert(`Successfully applied action: ${skill.name}`);
        }
      } catch (error) {
        console.error('Action execution failed', error);
        alert('Failed to execute action.');
        return; // Don't mark as applied if it failed
      }
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
          {AGENTS.map(agent => {
            let IconComponent: any = Bot;
            if (agent.iconName === 'Presentation') IconComponent = Presentation;
            if (agent.iconName === 'FileText') IconComponent = FileText;
            if (agent.iconName === 'ShoppingBag') IconComponent = ShoppingBag;
            if (agent.iconName === 'Search') IconComponent = Search;
            if (agent.iconName === 'Megaphone') IconComponent = Megaphone;
            
            return (
            <button
              key={agent.id}
              onClick={() => {
                setSelectedAgentId(agent.id);
              }}
              className={`p-4 rounded-2xl text-left transition-all border ${
                selectedAgentId === agent.id 
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/30' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-2 font-bold">
                <div className={`p-2 rounded-lg ${selectedAgentId === agent.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'}`}>
                  <IconComponent size={20} />
                </div>
                {agent.name}
              </div>
              <p className={`text-xs ${selectedAgentId === agent.id ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {agent.description}
              </p>
            </button>
            );
          })}
          
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <input 
              type="file" 
              accept=".md" 
              ref={skillUploadRef} 
              className="hidden" 
              onChange={handleSkillUpload} 
            />
            <button
              onClick={() => skillUploadRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <Upload size={18} />
              <span className="font-medium text-sm">Upload Skill (.md)</span>
            </button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              {(() => {
                let IconComponent: any = Bot;
                if (selectedAgent.iconName === 'Presentation') IconComponent = Presentation;
                if (selectedAgent.iconName === 'FileText') IconComponent = FileText;
                if (selectedAgent.iconName === 'ShoppingBag') IconComponent = ShoppingBag;
                if (selectedAgent.iconName === 'Search') IconComponent = Search;
                if (selectedAgent.iconName === 'Megaphone') IconComponent = Megaphone;
                return <IconComponent size={20} />;
              })()}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-slate-900 dark:text-white">{selectedAgent.name}</h2>
              <p className="text-xs text-slate-500">Ready to assist with {activeStore.name}</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Clear conversation"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 max-w-lg mx-auto w-full">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
                  <Bot size={40} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Chat with {selectedAgent.name}</h3>
                  <p className="text-sm">Select a starter prompt or type your own message below.</p>
                </div>
                
                <div className="w-full grid grid-cols-1 gap-2 mt-4">
                  {(STARTER_PROMPTS[selectedAgent.id] || STARTER_PROMPTS['default']).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(prompt)}
                      className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-sm text-slate-700 dark:text-slate-300 shadow-sm hover:shadow-md"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'agent' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                      {(() => {
                        let IconComponent: any = Bot;
                        if (selectedAgent.iconName === 'Presentation') IconComponent = Presentation;
                        if (selectedAgent.iconName === 'FileText') IconComponent = FileText;
                        if (selectedAgent.iconName === 'ShoppingBag') IconComponent = ShoppingBag;
                        if (selectedAgent.iconName === 'Search') IconComponent = Search;
                        if (selectedAgent.iconName === 'Megaphone') IconComponent = Megaphone;
                        return <IconComponent size={16} />;
                      })()}
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end flex flex-col' : 'items-start flex flex-col group relative'}`}>
                    <div className={`p-4 rounded-2xl relative ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.role === 'agent' && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="absolute -right-10 top-2 p-1.5 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      )}
                      {msg.role === 'agent' ? (
                        <div dir="auto" className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-inherit">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p dir="auto" className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                      
                      {/* Render User Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {msg.attachments.map((att: any, i: number) => (
                            <div key={i} className="relative rounded-lg overflow-hidden border border-white/20 bg-white/10 w-24 h-24 flex items-center justify-center">
                              {att.mimeType.startsWith('image/') ? (
                                <img src={att.data} alt={att.name} loading="lazy" className="w-full h-full object-cover" />
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
                        
                        {msg.action.type.includes('LANDING_PAGE') ? (
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
                                      <img src={pd.image} alt={pd.title} loading="lazy" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100">
                                          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(pd.mainDesc) }} />
                                        </div>
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
                            onClick={async () => {
                              if (msg.action.type.includes('LANDING_PAGE')) {
                                let html = msg.action.previewData.htmlContent || msg.action.previewData.htmlBody || msg.action.previewData.html;
                                if (!html) {
                                  setIsLoading(true);
                                  const langMap: Record<string, string> = { ar: 'Arabic', fr: 'French', en: 'English', es: 'Spanish', ro: 'Romanian' };
                                  const storeLang = activeStore?.language ? (langMap[activeStore.language.toLowerCase()] || activeStore.language) : undefined;
                                  
                                  const result = await aiService.generateLandingPage(
                                    msg.action.previewData.title, 
                                    activeStore?.region || 'dz', 
                                    msg.content,
                                    storeLang
                                  );
                                  html = result?.componentCode || '<h1>Failed to generate HTML</h1>';
                                  setIsLoading(false);
                                }
                                setPreviewPageData({
                                  msgId: msg.id,
                                  action: msg.action,
                                  title: msg.action.previewData.title || 'AI Generated Page',
                                  slug: 'promo-' + Math.random().toString(36).substring(7),
                                  productId: msg.action.previewData.productId || '',
                                  htmlContent: html
                                });
                              } else if (msg.action.type === 'CREATE_PRODUCT') {
                                handleValidateAction(msg.action, msg.id);
                              } else {
                                handleValidateAction(msg.action, msg.id);
                              }
                            }}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                          >
                            <CheckCircle size={16} /> {msg.action.type.includes('LANDING_PAGE') ? 'Preview & Confirm' : msg.action.type === 'CREATE_PRODUCT' ? 'Add to Store' : 'Validate & Apply'}
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
                      <img src={att.data} alt="Upload preview" loading="lazy" className="w-full h-full object-cover" />
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
                ref={textareaRef}
                value={input}
                onChange={handleInput}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask the ${selectedAgent.name}... (Shift+Enter for new line)`}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent dark:text-white resize-none min-h-[48px] max-h-[200px] transition-all"
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
                  <div className="w-full h-full overflow-y-auto overflow-x-hidden">
                    <RichHtmlContent 
                      html={previewPageData.htmlContent} 
                      region={activeStore?.region || 'us'} 
                      storeSlug={activeStore?.id || 'default'} 
                    />
                  </div>
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
                    title: previewPageData.productName + ' Promo',
                    slug: previewPageData.productName.toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/(^-|-$)/g, '') || ('promo-' + Date.now()),
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
