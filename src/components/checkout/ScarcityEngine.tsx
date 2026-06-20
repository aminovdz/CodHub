'use client';

import { useState, useEffect } from 'react';
import { Flame, Eye, Clock, ShieldCheck, Zap } from 'lucide-react';

interface ScarcityEngineProps {
  productId?: string;
}

export function ScarcityEngine({ productId }: ScarcityEngineProps) {
  const [viewers, setViewers] = useState(14);
  const [stock, setStock] = useState(8);
  const [soldToday, setSoldToday] = useState(45);

  useEffect(() => {
    // Generate deterministic but realistic numbers based on productId (or random if missing)
    const baseNum = productId 
      ? productId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) 
      : Math.floor(Math.random() * 1000);
      
    // Set initial values
    setViewers(12 + (baseNum % 15));
    setStock(3 + (baseNum % 9));
    setSoldToday(30 + (baseNum % 40));

    // Simulate active viewers going up and down slightly
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const next = prev + change;
        return next < 8 ? 8 : (next > 45 ? 45 : next);
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [productId]);

  return (
    <div className="flex flex-col gap-3 my-5">
      {/* Viewers & Scarcity */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-red-50/80 border border-red-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="animate-pulse">{viewers} people viewing this</span>
        </div>
        
        <div className="flex items-center gap-2 text-rose-700 font-black text-sm bg-white px-3 py-1.5 rounded-full shadow-sm border border-red-50">
          <Flame size={16} className="text-orange-500" />
          Only {stock} items left in stock!
        </div>
      </div>

      {/* Social Proof Tags */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
        <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <Zap size={14} className="text-amber-500" />
          {soldToday} orders today
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-emerald-700">
          <ShieldCheck size={14} />
          Verified Product
        </div>
        <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 text-indigo-700">
          <Clock size={14} />
          Fast Delivery
        </div>
      </div>
    </div>
  );
}
