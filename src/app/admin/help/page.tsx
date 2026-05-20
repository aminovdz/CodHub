'use client';

import { useState } from 'react';
import { Globe, Server, CheckCircle2, Copy, ExternalLink, HelpCircle, ArrowRight, ShieldAlert, Check } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function HelpDocsPage() {
  const { activeStore } = useAdminStore();
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(id);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const cnameTarget = "cname.cod-hub.com";
  const aRecordIp = "76.76.21.21"; // Vercel / custom server IP template

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 p-8 md:p-12 text-white border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="relative z-10 space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-widest">
            <Globe size={12} className="animate-spin-slow" /> Custom Domain Configuration
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
            Point Your Domain to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">{activeStore?.name || 'Your Store'}</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium">
            Learn how to map your custom domain name (e.g. <code className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">mystore.com</code>) to your COD-Hub store funnel so clients see your professional brand.
          </p>
        </div>
      </div>

      {/* Main Instructions Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Step 1 */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl">
              1
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Choose Your Host</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
              Login to your domain registrar (GoDaddy, Namecheap, Cloudflare, Hostinger) and navigate to the DNS Zone Editor for your domain.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
            DNS Management <ArrowRight size={14} />
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-xl">
              2
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Add DNS Records</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
              Create a new CNAME or A Record pointing to COD-Hub platform servers. We recommend using a CNAME for subdomains and an A record for root domains.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400">
            Record Insertion <ArrowRight size={14} />
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl">
              3
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">Persist in Settings</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
              Head over to your Store Settings panel in COD-Hub, enter your domain name under the Domain section, and save.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Save Store Domain <ArrowRight size={14} />
          </div>
        </div>

      </div>

      {/* Technical Configuration Details */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Server size={20} className="text-indigo-600" /> DNS Records Specifications
          </h3>
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Recommended Setting</span>
        </div>

        <div className="p-6 space-y-6">
          
          {/* CNAME Option */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Option A: CNAME Record (Recommended for Subdomains like <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">shop.yourdomain.com</code>)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4">Host / Name</th>
                    <th className="p-4">Value / Target</th>
                    <th className="p-4 text-right">TTL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-semibold bg-white dark:bg-slate-800/40">
                  <tr>
                    <td className="p-4"><span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold">CNAME</span></td>
                    <td className="p-4 font-mono">shop <span className="text-slate-400 font-sans text-[10px]">(or your preferred prefix)</span></td>
                    <td className="p-4 font-mono flex items-center justify-between gap-4">
                      <span>{cnameTarget}</span>
                      <button 
                        onClick={() => handleCopy(cnameTarget, 'cname')} 
                        className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {copiedValue === 'cname' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono">Automatic / 3600</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700" />

          {/* A Record Option */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500" /> Option B: A Record (For Root Domains like <code className="text-xs bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">yourdomain.com</code>)
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Type</th>
                    <th className="p-4">Host / Name</th>
                    <th className="p-4">Value / IP Address</th>
                    <th className="p-4 text-right">TTL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-300 font-semibold bg-white dark:bg-slate-800/40">
                  <tr>
                    <td className="p-4"><span className="px-2 py-1 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">A</span></td>
                    <td className="p-4 font-mono">@ <span className="text-slate-400 font-sans text-[10px]">(or blank)</span></td>
                    <td className="p-4 font-mono flex items-center justify-between gap-4">
                      <span>{aRecordIp}</span>
                      <button 
                        onClick={() => handleCopy(aRecordIp, 'aRecord')} 
                        className="p-1 text-slate-400 hover:text-cyan-600 transition-colors"
                      >
                        {copiedValue === 'aRecord' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </td>
                    <td className="p-4 text-right font-mono">Automatic / 3600</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* Cloudflare Caveat Notification */}
      <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-6 flex gap-4">
        <ShieldAlert className="text-indigo-600 dark:text-indigo-400 shrink-0" size={24} />
        <div className="space-y-1">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Are you using Cloudflare?</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
            If your domain is managed by Cloudflare, make sure to set the <strong>Proxy Status</strong> to <span className="text-amber-600 font-bold">DNS Only</span> (grey cloud) rather than Proxied (orange cloud) during initial setup. This allows COD-Hub to provision automatic SSL certificates for your custom checkout funnels instantly.
          </p>
        </div>
      </div>

      {/* FAQ & Support Section */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <HelpCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">Still need assistance?</h4>
            <p className="text-slate-400 text-xs font-semibold">Our tech support team can help configure your DNS zone records free of charge.</p>
          </div>
        </div>
        <button 
          onClick={() => window.open('https://t.me/codhub_support', '_blank')}
          className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-black rounded-2xl text-xs tracking-wider flex items-center gap-2 shadow-sm transition-all"
        >
          Contact Support <ExternalLink size={14} />
        </button>
      </div>
    </div>
  );
}
