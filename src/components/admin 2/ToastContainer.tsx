'use client';

import { useNotificationStore, NotificationType } from '@/lib/store/useNotificationStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useEffect, useState, memo } from 'react';

const iconMap: Record<NotificationType, React.ReactNode> = {
  success: <CheckCircle2 className="text-emerald-500" size={20} />,
  error: <AlertCircle className="text-rose-500" size={20} />,
  info: <Info className="text-blue-500" size={20} />,
  warning: <AlertTriangle className="text-amber-500" size={20} />,
};

const bgMap: Record<NotificationType, string> = {
  success: 'bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50',
  error: 'bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/50',
  info: 'bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50',
  warning: 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/50',
};

export const ToastContainer = memo(function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-md w-full">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`
            pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border shadow-xl
            animate-in slide-in-from-right-full fade-in duration-300
            ${bgMap[n.type]}
          `}
        >
          <div className="shrink-0">{iconMap[n.type]}</div>
          <div className="flex-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            {n.message}
          </div>
          <button
            onClick={() => removeNotification(n.id)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors text-slate-400"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
