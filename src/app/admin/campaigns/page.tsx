'use client';

import { useState, useMemo } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { Mail, Send, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminCampaignsPage() {
  const { orders, activeStore } = useAdminStore();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Extract unique emails from orders
  const uniqueEmails = useMemo(() => {
    const emails = orders
      .filter(o => o.storeId === activeStore.id && o.customFields && o.customFields.email)
      .map(o => o.customFields.email as string);
    return Array.from(new Set(emails));
  }, [orders, activeStore.id]);

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
    setStatusMessage('Sending campaign...');

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: activeStore.id,
          emails: uniqueEmails,
          subject,
          body,
          apiKey: activeStore.resendApiKey
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage(`Campaign sent successfully to ${uniqueEmails.length} customers!`);
        setSubject('');
        setBody('');
      } else {
        setStatusMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatusMessage('Failed to send campaign.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Mail className="text-indigo-600" size={32} /> Email Campaigns
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Users size={32} className="text-indigo-600" />
          </div>
          <div className="text-4xl font-black text-slate-900 mb-1">{uniqueEmails.length}</div>
          <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Subscribers</div>
          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Unique email addresses collected from orders in {activeStore.name}.
          </p>
        </div>

        <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Compose Broadcast</h2>
          <form onSubmit={handleSendCampaign} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subject Line</label>
              <input
                type="text"
                required
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Flash Sale: 50% Off Everything!"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-bold text-slate-900"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Body (HTML Supported)</label>
              <textarea
                required
                rows={8}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Hello [NAME],<br><br>Check out our latest offers..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all font-mono text-sm text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={isSending || uniqueEmails.length === 0}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : (
                <>
                  <Send size={20} />
                  Send Campaign to {uniqueEmails.length} Customers
                </>
              )}
            </button>

            {statusMessage && (
              <div className={`p-4 rounded-xl text-sm font-bold text-center mt-4 ${statusMessage.includes('successfully') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {statusMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
