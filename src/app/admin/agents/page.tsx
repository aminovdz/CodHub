'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, CheckCircle, Search, Target, Megaphone, Presentation, FileText, ShoppingBag, X, Paperclip, ImageIcon } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { aiService } from '@/lib/services/aiService';

const AGENTS = [
  { id: 'cro', name: 'CRO Specialist', icon: <Presentation size={20} />, description: 'Builds high-converting landing pages', promptRole: 'Conversion Rate Optimization (CRO) Expert' },
  { id: 'copywriter', name: 'Copywriter', icon: <FileText size={20} />, description: 'Writes product descriptions and SEO metadata', promptRole: 'Expert Copywriter and SEO Specialist' },
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
  const { activeStore, aiProvider, setLandingPages, setProducts, agentChats, setAgentChat } = useAdminStore();
  const [selectedAgentId, setSelectedAgentId] = useState(AGENTS[0].id);
  const [input, setInput] = useState('');
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

    if (selectedAgentId === 'product' || selectedAgentId === 'cro' || selectedAgentId === 'copywriter') {
      context.products = state.products.filter(p => p.storeId === activeStore.id).slice(0, 10); // Limit context size
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
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await aiService.chatWithAgent(selectedAgent.promptRole, userMessage.content, getContextForAgent(), userMessage.attachments);
      
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

  const handleValidateAction = (action: any, msgId: string) => {
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
      alert('Landing Page added to your Promo section!');
    } else if (action.type === 'UPDATE_PRODUCT') {
      // In a real scenario, we'd update specific product fields
      alert('Product updated (simulation)!');
    }

    // Mark as applied in UI
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, action: { ...m.action!, applied: true } as any } : m));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Bot className="text-indigo-600" size={32} />
            AI Agents Hub
          </h1>
          <p className="text-slate-500 mt-1">Collaborate with specialized AI agents to build and optimize your store.</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl text-indigo-700 dark:text-indigo-400 font-bold text-sm">
          <Sparkles size={16} /> Using {aiProvider.toUpperCase()} Model
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
                      <div className="mt-3 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-4 shadow-sm w-full max-w-md">
                        <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400 font-bold text-sm">
                          <Target size={16} /> 
                          Proposed Action: {msg.action.type.replace(/_/g, ' ')}
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl text-xs font-mono text-slate-600 dark:text-slate-400 mb-4 max-h-40 overflow-y-auto">
                          {JSON.stringify(msg.action.previewData, null, 2)}
                        </div>

                        {(msg.action as any).applied ? (
                          <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-lg justify-center">
                            <CheckCircle size={16} /> Applied Successfully
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleValidateAction(msg.action, msg.id)}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            <CheckCircle size={16} /> Validate & Apply
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
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder={`Ask the ${selectedAgent.name} to do something...`}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-900 border-none rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 dark:text-white"
                disabled={isLoading}
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
  );
}
