
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { Mail, Send, Users, ArrowLeft, Clock, History, CheckCircle, AlertCircle, Play, Pause, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminCampaignsPage() {
  const { orders, activeStore, campaigns, addCampaign, updateCampaignStatus } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(1);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Extract unique emails from orders
  const uniqueEmails = useMemo(() => {
    const emails = orders
      .filter(o => o.storeId === activeStore.id && o.customFields && o.customFields.email)
      .map(o => o.customFields.email as string);
    return Array.from(new Set(emails));
  }, [orders, activeStore.id]);

  const storeCampaigns = useMemo(() => {
    return campaigns.filter(c => c.storeId === activeStore.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [campaigns, activeStore.id]);

  const processCampaignQueue = async (campaignId: string, startIndex: number = 0) => {
    let sent = startIndex;
    setCurrentProgress(sent);
    setStatusMessage(isPausedRef.current ? 'Campaign paused.' : 'Sending campaign...');

    for (let i = startIndex; i < uniqueEmails.length; i++) {
      if (isCancelledRef.current) {
        updateCampaignStatus(campaignId, sent, 'FAILED');
        setIsSending(false);
        setActiveCampaignId(null);
        setStatusMessage(`Campaign cancelled after sending ${sent} emails.`);
        return;
      }

      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (isCancelledRef.current) {
          updateCampaignStatus(campaignId, sent, 'FAILED');
          setIsSending(false);
          setActiveCampaignId(null);
          setStatusMessage(`Campaign cancelled after sending ${sent} emails.`);
          return;
        }
      }

      const email = uniqueEmails[i];
      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: activeStore.id,
            emails: [email],
            subject,
            body,
            apiKey: activeStore.resendApiKey
          })
        });

        if (res.ok) {
          sent++;
          setCurrentProgress(sent);
          updateCampaignStatus(campaignId, sent, 'SENDING');
        } else {
          console.error(`Failed to send to ${email}`);
        }
      } catch (err) {
        console.error(`Network error sending to ${email}`, err);
      }

      // Throttle
      if (i < uniqueEmails.length - 1 && delaySeconds > 0 && !isPausedRef.current && !isCancelledRef.current) {
        await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      }
    }

    updateCampaignStatus(campaignId, sent, sent === uniqueEmails.length ? 'COMPLETED' : 'FAILED');
    setIsSending(false);
    setActiveCampaignId(null);
    setStatusMessage(`Campaign finished! Successfully sent to ${sent} out of ${uniqueEmails.length} recipients.`);
    setSubject('');
    setBody('');
  };

  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uniqueEmails.length === 0) {
      setStatusMessage('No customers with emails found in this store.');
      return;
    }
    if (!activeStore.resendApiKey) {
      setStatusMessage('Please configure Resend API Key in Settings first.');
      return;
    }

    setIsSending(true);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setIsPaused(false);
    setStatusMessage('Initializing campaign...');
    setCurrentProgress(0);

    const campaignId = 'camp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    setActiveCampaignId(campaignId);

    addCampaign({
      id: campaignId,
      storeId: activeStore.id,
      subject,
      body,
      totalRecipients: uniqueEmails.length,
      sentCount: 0,
      status: 'SENDING',
      date: new Date().toISOString()
    });

    processCampaignQueue(campaignId, 0);
  };

  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    setStatusMessage(isPausedRef.current ? 'Campaign paused.' : 'Sending campaign...');
    if (activeCampaignId) {
       updateCampaignStatus(activeCampaignId, currentProgress, isPausedRef.current ? 'PAUSED' : 'SENDING');
    }
  };

  const cancelCampaign = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setIsPaused(false);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Mail className="text-indigo-600" size={32} /> Email Campaigns
        </h1>
      </div>

      <div className="flex space-x-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('compose')}
          className={`pb-4 font-bold text-sm tracking-wide uppercase transition-colors relative ${
            activeTab === 'compose' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Compose Broadcast
          {activeTab === 'compose' && (
            <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 font-bold text-sm tracking-wide uppercase transition-colors relative flex items-center gap-2 ${
            activeTab === 'history' ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History size={16} /> Campaign History
          {activeTab === 'history' && (
            <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full"></span>
          )}
        </button>
      </div>

      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <Users size={32} className="text-indigo-600" />
              </div>
              <div className="text-4xl font-black text-slate-900 mb-1">{uniqueEmails.length}</div>
              <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Subscribers</div>
              <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                Unique email addresses collected from orders in {activeStore.name}.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-orange-500"/> Send Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Delay Between Emails (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={delaySeconds}
                    onChange={e => setDelaySeconds(parseFloat(e.target.value) || 0)}
                    disabled={isSending}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-slate-900"
                  />
                  <p className="text-[10px] text-rose-500 font-bold mt-2">To prevent spam filters, a delay is recommended. (Leave browser open while sending).</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Compose Broadcast</h2>
            <form onSubmit={handleSendCampaign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Line</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  disabled={isSending}
                  placeholder="Flash Sale: 50% Off Everything!"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-slate-900 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Body (HTML Supported)</label>
                <textarea
                  required
                  rows={8}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  disabled={isSending}
                  placeholder="Hello [NAME],<br><br>Check out our latest offers..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm text-slate-900 disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>

              {!isSending ? (
                <button
                  type="submit"
                  disabled={uniqueEmails.length === 0}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                  Send Campaign to {uniqueEmails.length} Customers
                </button>
              ) : (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-700">
                    <span className="flex items-center gap-2">
                      {!isPaused ? (
                        <><Play size={16} className="text-indigo-600 animate-pulse"/> Sending in progress...</>
                      ) : (
                        <><Pause size={16} className="text-amber-500"/> Campaign paused</>
                      )}
                    </span>
                    <span>{currentProgress} / {uniqueEmails.length}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`${isPaused ? 'bg-amber-500' : 'bg-indigo-600'} h-3 rounded-full transition-all duration-300`}
                      style={{ width: `${(currentProgress / uniqueEmails.length) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex gap-4 pt-2">
                    <button
                      type="button"
                      onClick={togglePause}
                      className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        isPaused 
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200' 
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                      }`}
                    >
                      {isPaused ? <Play size={18} /> : <Pause size={18} />}
                      {isPaused ? 'Resume Sending' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelCampaign}
                      className="flex-1 py-3 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <XCircle size={18} />
                      Cancel
                    </button>
                  </div>
                  {!isPaused && <p className="text-xs font-bold text-rose-500 text-center animate-pulse">DO NOT CLOSE THIS TAB UNTIL COMPLETED</p>}
                </div>
              )}

              {statusMessage && !isSending && (
                <div className={`p-4 rounded-xl text-sm font-bold text-center mt-4 ${statusMessage.includes('Successfully') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {statusMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {storeCampaigns.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center justify-center">
               <History size={48} className="text-slate-200 mb-4" />
               <h3 className="text-lg font-bold text-slate-700 mb-2">No Campaigns Yet</h3>
               <p className="text-slate-500 text-sm">Send your first broadcast to see it here.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Subject</th>
                  <th className="py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider">Progress</th>
                  <th className="py-4 px-6 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storeCampaigns.map(camp => (
                  <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-sm font-bold text-slate-700">
                      {new Date(camp.date).toLocaleDateString()} <span className="text-xs text-slate-400 font-normal">{new Date(camp.date).toLocaleTimeString()}</span>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-900 font-medium">
                      {camp.subject}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        camp.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        camp.status === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                        camp.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
                        'bg-indigo-100 text-indigo-700'
                      }`}>
                        {camp.status === 'COMPLETED' ? <CheckCircle size={12} /> : 
                         camp.status === 'FAILED' ? <AlertCircle size={12} /> : 
                         camp.status === 'PAUSED' ? <Pause size={12} /> : 
                         <Play size={12} />}
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-600">
                      {camp.sentCount} / {camp.totalRecipients}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {(camp.status === 'FAILED' || camp.status === 'PAUSED') && camp.sentCount < camp.totalRecipients && (
                        <button
                          onClick={() => {
                            setSubject(camp.subject);
                            setBody(camp.body);
                            setActiveTab('compose');
                            setIsSending(true);
                            isPausedRef.current = false;
                            isCancelledRef.current = false;
                            setIsPaused(false);
                            setActiveCampaignId(camp.id);
                            updateCampaignStatus(camp.id, camp.sentCount, 'SENDING');
                            processCampaignQueue(camp.id, camp.sentCount);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors inline-flex"
                        >
                          <Play size={14} /> Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
