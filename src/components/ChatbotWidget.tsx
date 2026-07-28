'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { MessageSquare, X, Send, Bot, User, ImageIcon } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
}

interface ChatbotWidgetProps {
  storeId: string;
  region: string;
  botName?: string;
}

const ChatbotWidget = memo(function ChatbotWidget({ storeId, region, botName = 'Assistant' }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send an initial welcome message when the chat is opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello! I am your AI Support assistant for our store. I can answer any questions you have about our products or delivery zones/shipping rates. How can I assist you today?`
        }
      ]);
    }
  }, [isOpen, messages.length]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMsg = input.trim();
    const currentImage = selectedImage;
    
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const newMessages = [...messages, { role: 'user', content: userMsg || 'Uploaded an image', imageUrl: currentImage } as ChatMessage];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          storeId,
          region
        })
      });

      const data = await response.json();
      if (response.ok && data.response) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      } else {
        console.error('Chatbot API error:', data.error || data);
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: data.error || `I'm sorry, I encountered a temporary connection issue. Please try again or reach out to our team directly.`
          }
        ]);
      }
    } catch (error) {
      console.error('Chatbot request failed:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `I'm sorry, I'm having trouble connecting right now. Please check your internet connection.`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* FLOATING BUTTON */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 relative group"
        >
          <MessageSquare size={26} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          <div className="absolute right-16 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-md pointer-events-none font-bold">
            Chat with {botName}
          </div>
        </button>
      )}

      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="w-[360px] max-w-[calc(100vw-32px)] h-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm relative">
                <Bot size={22} className="text-white" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
              </div>
              <div>
                <h4 className="font-bold leading-tight">{botName}</h4>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1 font-medium">
                  Online • Product & Shipping assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-100'
                  }`}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                {/* Bubble */}
                <div
                  className={`p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800/50 rounded-tl-none shadow-sm'
                  }`}
                >
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="Uploaded" className="max-w-full rounded-lg mb-2 border border-white/20" />
                  )}
                  {msg.content && <p className="whitespace-pre-line text-xs font-medium">{msg.content}</p>}
                </div>
              </div>
            ))}

            {/* Loading / Typing indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm flex-shrink-0">
                  <Bot size={14} className="text-slate-600" />
                </div>
                <div className="bg-white dark:bg-slate-800 text-slate-400 p-3 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-800/50 flex items-center gap-1.5 shadow-sm">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            {selectedImage && (
              <div className="px-3 pt-3 flex items-start gap-2">
                <div className="relative inline-block">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                  <button 
                    onClick={() => { setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                    className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className="p-3 flex gap-2 items-center"
            >
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageSelect} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                title="Attach Image"
              >
                <ImageIcon size={18} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products or delivery..."
                className="flex-grow px-4 py-2.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 transition-all flex items-center justify-center shadow-sm"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatbotWidget;
