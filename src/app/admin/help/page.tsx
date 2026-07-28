'use client';

import { useState } from 'react';
import { Globe, Server, CheckCircle2, Copy, ExternalLink, HelpCircle, ArrowRight, ShieldAlert, Check, Sparkles } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';

export default function HelpDocsPage() {
  const { activeStore } = useAdminStore();
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionRole = (sessionData.role || 'admin') as 'admin' | 'fulfillment' | 'confirmation';
  const isAdmin = sessionRole === 'admin' || sessionData.isSuperAdmin;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">Permission Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm font-medium">
          You do not have permission to view the Help & Docs page. Please contact your administrator.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'domain' | 'webhook' | 'ai' | 'pixels' | 'security'>('domain');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedValue(id);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const cnameTarget = "cname.vercel-dns.com";
  const aRecordIp = "76.76.21.21"; // Vercel IP

  const scriptCode = `// Google Sheets Webhook Script for COD-Hub
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var order = payload.order;
    var storeName = payload.storeName;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Order ID", 
        "Date", 
        "Store", 
        "Customer Name", 
        "Phone", 
        "Product", 
        "Total Price", 
        "Address", 
        "Wilaya/Commune", 
        "Status"
      ]);
    }
    
    // Append order info
    sheet.appendRow([
      order.id || "",
      order.createdAt || new Date().toISOString(),
      storeName || "",
      order.customer || "",
      order.phone || "",
      order.product || "",
      order.total || order.price || 0,
      order.address || "",
      (order.wilaya || "") + " " + (order.commune || ""),
      order.status || "PENDING"
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "success": true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "success": false, "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Tab Switcher Pills */}
      <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <button
          onClick={() => setActiveTab('domain')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'domain'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Globe size={14} /> Custom Domain Mapping
        </button>
        <button
          onClick={() => setActiveTab('webhook')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'webhook'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Server size={14} /> Webhooks & Low-Code
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'ai'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles size={14} /> AI Hub Prompts
        </button>
        <button
          onClick={() => setActiveTab('pixels')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'pixels'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles size={14} /> Tracking Pixels
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'security'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-white shadow-md'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert size={14} /> Security
        </button>
      </div>

      {activeTab === 'ai' ? (
        <>
          {/* Header Banner AI */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 p-8 md:p-12 text-white border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-widest">
                <Sparkles size={12} className="animate-pulse" /> AI Hub Prompts
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                Get Maximum Value from <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">AI Agents</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium">
                Copy and paste these proven prompts into the AI Hub to automate your marketing, analyze your store data, and generate high-converting copy.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Prompt 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Landing Page Generation
              </h3>
              <p className="text-xs text-slate-500 font-medium">Use this to instruct the UI generator agent to build a high-converting landing page.</p>
              <div className="relative group">
                <button
                  onClick={() => handleCopy("I need a high-converting, single-page Next.js landing page for my product [PRODUCT NAME]. The target audience is [COUNTRY] and they use Cash on Delivery. Build a hero section with a strong hook, a problem-agitation-solution block, objection handling, and 3 realistic customer reviews. Keep the copy short, punchy, and benefit-driven. Include a sticky 'Order Now - Pay on Delivery' button.", 'prompt1')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  {copiedValue === 'prompt1' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
"I need a high-converting, single-page Next.js landing page for my product [PRODUCT NAME]. The target audience is [COUNTRY] and they use Cash on Delivery. Build a hero section with a strong hook, a problem-agitation-solution block, objection handling, and 3 realistic customer reviews. Keep the copy short, punchy, and benefit-driven. Include a sticky 'Order Now - Pay on Delivery' button."
                </pre>
              </div>
            </div>

            {/* Prompt 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Ad Creative Ideas
              </h3>
              <p className="text-xs text-slate-500 font-medium">Generate viral video ad scripts for TikTok and Facebook.</p>
              <div className="relative group">
                <button
                  onClick={() => handleCopy("Write 3 short video ad scripts (under 30 seconds each) for [PRODUCT NAME] to run on TikTok and Facebook Reels. Use the 'Hook, Retain, Reward' framework. The first 3 seconds must agitate a massive pain point. The CTA should drive them to my store where they can order and pay on delivery.", 'prompt2')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  {copiedValue === 'prompt2' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
"Write 3 short video ad scripts (under 30 seconds each) for [PRODUCT NAME] to run on TikTok and Facebook Reels. Use the 'Hook, Retain, Reward' framework. The first 3 seconds must agitate a massive pain point. The CTA should drive them to my store where they can order and pay on delivery."
                </pre>
              </div>
            </div>

            {/* Prompt 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Customer Support / CRM Script
              </h3>
              <p className="text-xs text-slate-500 font-medium">Get phone scripts for your confirmation agents.</p>
              <div className="relative group">
                <button
                  onClick={() => handleCopy("Write a phone confirmation script for my call center agents. The goal is to call customers who just placed a Cash on Delivery order for [PRODUCT NAME] and confirm their address. It needs to sound friendly, professional, and urgency-driven so the customer is excited to receive the package. Also include rebuttals if the customer says they changed their mind.", 'prompt3')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  {copiedValue === 'prompt3' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
"Write a phone confirmation script for my call center agents. The goal is to call customers who just placed a Cash on Delivery order for [PRODUCT NAME] and confirm their address. It needs to sound friendly, professional, and urgency-driven so the customer is excited to receive the package. Also include rebuttals if the customer says they changed their mind."
                </pre>
              </div>
            </div>

            {/* Prompt 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Data Analysis & Strategy
              </h3>
              <p className="text-xs text-slate-500 font-medium">Ask the AI to analyze your store performance.</p>
              <div className="relative group">
                <button
                  onClick={() => handleCopy("Act as my Chief of Staff. I will provide you with my raw order data and ad spend from Facebook and TikTok. I need you to analyze the Return on Ad Spend (ROAS), identify which products are generating the highest profit margins, and give me 3 actionable steps to reduce my Return to Origin (RTO) rate.", 'prompt4')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  {copiedValue === 'prompt4' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
"Act as my Chief of Staff. I will provide you with my raw order data and ad spend from Facebook and TikTok. I need you to analyze the Return on Ad Spend (ROAS), identify which products are generating the highest profit margins, and give me 3 actionable steps to reduce my Return to Origin (RTO) rate."
                </pre>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'domain' ? (
        <>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg mb-4">
                1
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">Vercel Dashboard</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
                Go to your Vercel Project &gt; Settings &gt; Domains. Type in your custom domain (e.g. <code>store.com</code>) and click Add. Add the <code>www</code> version too!
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black text-lg mb-4">
                2
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">DNS Provider</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
                Log into GoDaddy, Namecheap, etc. Delete old A or CNAME records. Add the records Vercel gives you (A Record: <code>76.76.21.21</code>).
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-lg mb-4">
                3
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">Wait & Verify</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
                Wait a few minutes. Check Vercel until the red "Invalid Configuration" turns into a blue checkmark indicating SSL is active.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg mb-4">
                4
              </div>
              <h3 className="text-base font-black text-slate-800 dark:text-white mb-2">Store Settings</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
                In this COD-Hub Admin, switch to the specific Store you want, go to Settings, and type the domain under <strong>Custom Domain Binding</strong>.
              </p>
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
        </>
      ) : activeTab === 'pixels' ? (
        <>
          {/* Header Banner Pixels */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 p-8 md:p-12 text-white border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-widest">
                <Sparkles size={12} className="animate-pulse" /> Testing Tracking Pixels
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                How to verify <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300">Pixels & Analytics</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium">
                A quick guide to ensure your Facebook, TikTok, Google Analytics, and Google Tag Manager pixels are firing correctly on your store.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Facebook Pixel */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> Facebook (Meta) Pixel
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                To test the Facebook pixel, install the <strong>Meta Pixel Helper</strong> Chrome Extension. Go to your storefront and click the extension. You should see <code>PageView</code> and <code>ViewContent</code> firing. When you complete an order, you should see the <code>Purchase</code> event with the purchase value. You can also use the <strong>Events Manager &rarr; Test Events</strong> tool in Facebook Business Manager.
              </p>
            </div>

            {/* TikTok Pixel */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" /> TikTok Pixel
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                To test the TikTok pixel, install the <strong>TikTok Pixel Helper</strong> Chrome Extension. Browse your store to verify <code>ViewContent</code> fires. Make a test purchase to ensure the <code>CompletePayment</code> event fires with the correct order value.
              </p>
            </div>

            {/* Google Analytics & Tags */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm md:col-span-2 space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Google Analytics (GA4) & Google Tag Manager (GTM)
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                To test Google Analytics and Google Tag Manager:
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-sm font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                <li>Install the <strong>Google Tag Assistant</strong> Chrome Extension or use the <strong>Tag Assistant Preview Mode</strong> from the GTM dashboard.</li>
                <li>In GA4, go to <strong>Admin &rarr; DebugView</strong>. This will show a live timeline of all events firing on your device.</li>
                <li>Browse your products to trigger the <code>view_item</code> event.</li>
                <li>Complete a test checkout to trigger the <code>purchase</code> event. Verify that the revenue value and currency are passed correctly in the event parameters.</li>
              </ol>
            </div>
          </div>
        </>
      ) : activeTab === 'security' ? (
        <>
          {/* Header Banner Security */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-rose-950 p-8 md:p-12 text-white border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.15),transparent_50%)]" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-500/10 text-rose-300 border border-rose-500/20 uppercase tracking-widest">
                <ShieldAlert size={12} className="animate-pulse" /> Security & Access
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                How to Change <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300">Passwords</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium">
                Step-by-step guide on how to update passwords for Super Admins and Staff Members using the Supabase dashboard.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-black text-lg">
                1
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Open Supabase Dashboard</h3>
              <p className="text-sm text-slate-500 font-medium">
                Log into your Supabase account and navigate to the project where COD-Hub is deployed. Go to the <strong>Authentication</strong> section in the left sidebar.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-lg">
                2
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Find the User</h3>
              <p className="text-sm text-slate-500 font-medium">
                Under <strong>Users</strong>, locate the email address of the account you want to change the password for (e.g. <code>admin@codhub.com</code>). Click the three dots (...) menu on the right side of the user row.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-lg">
                3
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white">Reset Password</h3>
              <p className="text-sm text-slate-500 font-medium">
                Select <strong>Send password recovery</strong> or manually update it by clicking <strong>Edit user</strong>. Alternatively, you can run a SQL command in the SQL Editor to force-reset it immediately.
              </p>
            </div>

            {/* Step 4 (SQL Alternative) */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col space-y-3">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Server size={18} className="text-slate-500" /> Advanced: SQL Reset
              </h3>
              <p className="text-sm text-slate-500 font-medium mb-2">
                If you need to force reset a password immediately without email recovery, run this in the Supabase SQL Editor:
              </p>
              <div className="relative group mt-auto">
                <button
                  onClick={() => handleCopy("update auth.users set encrypted_password = crypt('NewPassword123!', gen_salt('bf')) where email = 'admin@codhub.com';", 'sqlreset')}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  {copiedValue === 'sqlreset' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <pre className="p-4 bg-slate-900 text-slate-300 rounded-xl text-[10px] font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
                  update auth.users set encrypted_password = crypt('NewPassword123!', gen_salt('bf')) where email = 'admin@codhub.com';
                </pre>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Header Banner Webhook */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-indigo-950 p-8 md:p-12 text-white border border-slate-800 shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="relative z-10 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-widest">
                <Server size={12} className="animate-pulse" /> Sheet & Webhook Guide
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
                Export Orders to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Google Sheets</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-base max-w-xl font-medium">
                Easily stream incoming customer orders to Google Sheets in real-time or send to automated workflows (Make.com, Zapier) using webhooks.
              </p>
            </div>
          </div>

          {/* Webhook Grid Steps */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Sheets Guide */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Google Sheets Integration Steps
              </h3>
              <ol className="list-decimal pl-5 space-y-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                <li>Create a blank Google Spreadsheet at <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">sheets.google.com</a>.</li>
                <li>Go to the top menu, select <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>.</li>
                <li>Delete the dummy code and paste the Apps Script template shown on the right.</li>
                <li>Click <strong>Deploy</strong> &rarr; <strong>New deployment</strong>.</li>
                <li>Under gear settings, select <strong>Web app</strong>. Configure:
                  <ul className="list-disc pl-5 mt-1 text-slate-400">
                    <li>Execute as: <strong>Me</strong> (your email)</li>
                    <li>Who has access: <strong>Anyone</strong></li>
                  </ul>
                </li>
                <li>Click <strong>Deploy</strong>, authorize credentials, and copy the Web App URL.</li>
                <li>Enter the URL in **Settings** &rarr; **Fulfillment Hub**.</li>
              </ol>
            </div>

            {/* Apps Script Box */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 dark:text-white">Google Apps Script Template</h3>
                <button
                  onClick={() => handleCopy(scriptCode, 'script')}
                  className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-[10px] transition-all"
                >
                  {copiedValue === 'script' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  {copiedValue === 'script' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                {scriptCode}
              </pre>
            </div>

            {/* Make.com / n8n Guide */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm md:col-span-2 space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Make.com / n8n Low-Code Integration
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                To integrate with any global delivery company without full-stack development, use Make.com or n8n as middleware.
              </p>
              <ol className="list-decimal pl-5 space-y-2 text-xs font-semibold leading-relaxed text-slate-500 dark:text-slate-400">
                <li>Create a new scenario/workflow in <strong>Make.com</strong> or <strong>n8n</strong>.</li>
                <li>Add a <strong>Custom Webhook</strong> trigger node. This generates a unique webhook URL.</li>
                <li>Copy the webhook URL and paste it into the COD-Hub <strong>Settings &rarr; Fulfillment Hub</strong> (Generic Webhook).</li>
                <li>In COD-Hub, push a test order to the webhook (via Orders tab).</li>
                <li>In Make/n8n, inspect the received JSON payload (see schema below) to map fields (e.g. <code>order.customer</code>, <code>order.address</code>).</li>
                <li>Add the API node for your chosen delivery company (e.g., HTTP Request module) and map the required parameters using the incoming webhook data.</li>
              </ol>
            </div>
          </div>

          {/* Webhook JSON Payload details */}
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Server size={20} className="text-indigo-600" /> Webhook Payload Schema
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Below is the JSON data structure dispatched to your webhook URL on order fulfillment.</p>
            </div>
            <div className="p-6">
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono overflow-x-auto border border-slate-800">
{`{
  "order": {
    "id": "A4B7",
    "createdAt": "2026-05-20T11:37:26.000Z",
    "customer": "John Doe",
    "phone": "+213555123456",
    "address": "12 Boulevard des Martyrs",
    "wilaya": "Algiers",
    "commune": "Sidi M'Hamed",
    "product": "Premium Wireless Earbuds",
    "total": 5900,
    "status": "SELF_CONFIRMED",
    "quantity": 1
  },
  "storeName": "Algeria COD Store"
}`}
              </pre>
            </div>
          </div>
        </>
      )}

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
