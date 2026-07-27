'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, ShoppingBag, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { usePathname } from 'next/navigation';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const orders = useAdminStore((s: any) => s.orders || []);
  const activityLogs = useAdminStore((s: any) => s.activityLogs || []);
  const activeStore = useAdminStore((s: any) => s.activeStore);

  // Generate notifications
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!activeStore) {
      setNotifications([]);
      return;
    }

    const notifs = [];

    // 1. Pending Orders
    const pendingOrders = orders.filter((o: any) => o.status === 'PENDING' && o.store_id === activeStore.id);
    if (pendingOrders.length > 0) {
      notifs.push({
        id: 'pending-orders',
        type: 'orders',
        title: 'Pending Orders',
        message: `You have ${pendingOrders.length} pending orders to confirm.`,
        time: pendingOrders[0].created_at,
        link: pathname.startsWith('/superadmin') ? '/superadmin/orders' : '/admin/orders',
      });
    }

    // 2. Abandoned Carts from activity log
    const recentAbandoned = activityLogs.filter((a: any) => a.action === 'CART_ABANDONED' && a.store_id === activeStore.id);
    if (recentAbandoned.length > 0) {
      notifs.push({
        id: 'abandoned-carts',
        type: 'alert',
        title: 'Abandoned Carts',
        message: `${recentAbandoned.length} carts were recently abandoned.`,
        time: recentAbandoned[0].timestamp,
        link: pathname.startsWith('/superadmin') ? '/superadmin/abandoned' : '/admin/abandoned',
      });
    }

    setNotifications(notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
    
    // Check if we have unread
    const lastSeen = localStorage.getItem(`codadmin-notifs-${activeStore.id}`);
    if (notifs.length > 0) {
      if (!lastSeen || new Date(notifs[0].time).getTime() > new Date(lastSeen).getTime()) {
        setHasUnread(true);
      } else {
        setHasUnread(false);
      }
    } else {
      setHasUnread(false);
    }
  }, [orders, activityLogs, activeStore, pathname]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && notifications.length > 0) {
      localStorage.setItem(`codadmin-notifs-${activeStore?.id}`, new Date().toISOString());
      setHasUnread(false);
    }
  };

  if (!activeStore) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-2 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-800" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
            <span className="text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </div>
          
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map((notif) => (
                  <Link 
                    key={notif.id}
                    href={notif.link}
                    onClick={() => setIsOpen(false)}
                    className="flex gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className={`shrink-0 mt-1 flex items-center justify-center w-8 h-8 rounded-full ${notif.type === 'orders' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                      {notif.type === 'orders' ? <ShoppingBag size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{notif.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{notif.message}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDistanceToNow(new Date(notif.time), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400 opacity-50" />
                <p className="text-sm">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
