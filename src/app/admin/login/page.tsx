'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store as StoreIcon, ShieldAlert, Sun, Moon } from 'lucide-react';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Client-side dark mode state just for the login screen
  const [isDark, setIsDark] = useState(false);
  const router = useRouter();

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('codadmin-dark', String(next));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, pin, isSuperAdmin: false })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setPin('');
      } else {
        // We set sessionStorage for the existing legacy layout state if needed,
        // though the server will rely strictly on the JWT cookie set by the API.
        sessionStorage.setItem('codadmin-auth', JSON.stringify({
          auth: true, 
          role: data.user.role, 
          user: data.user.username, 
          username: data.user.username,
          isSuperAdmin: false 
        }));
        router.push('/admin');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDark ? 'bg-slate-950' : 'bg-slate-900'}`}
      style={{ backgroundImage: 'radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
    >
      <div className="absolute top-4 right-4">
        <button onClick={toggleDark} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <form onSubmit={handleLogin} className={`p-8 rounded-3xl shadow-2xl max-w-sm w-full border transition-colors duration-300 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <StoreIcon size={30} className="text-white" />
          </div>
          <h1 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
            COD<span className="text-indigo-500">ADMIN</span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Staff Portal Login
          </p>
        </div>

        <div className="mb-4">
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Staff Name
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={`w-full px-4 py-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-colors font-bold ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
            placeholder="Your staff name"
            autoFocus
            autoComplete="off"
            required
          />
        </div>

        <div className="mb-6">
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            PIN / Password
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className={`w-full px-4 py-4 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-[0.5em] font-mono text-2xl transition-colors ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
            placeholder="••••"
            maxLength={8}
            autoComplete="off"
            required
          />
          {error && (
            <p className="text-rose-500 text-xs font-bold mt-3 text-center flex items-center justify-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-wait"
        >
          {loading ? 'Authenticating...' : 'Unlock Console'}
        </button>
      </form>
    </div>
  );
}
