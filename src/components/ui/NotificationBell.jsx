import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import useAuthStore from '../../store/useAuthStore';
import { Bell, X, CheckCheck, Info, AlertCircle, CreditCard, CalendarCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

const ICONS = {
  info:       <Info      className="h-4 w-4 text-blue-500"    />,
  warning:    <AlertCircle className="h-4 w-4 text-orange-400"/>,
  payment:    <CreditCard  className="h-4 w-4 text-emerald-500"/>,
  attendance: <CalendarCheck className="h-4 w-4 text-purple-500"/>,
};

export default function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    loadNotifications();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadNotifications = async () => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipient_uid', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // sort by created_at desc (Firestore Timestamp or null)
          const ta = a.created_at?.toMillis?.() ?? 0;
          const tb = b.created_at?.toMillis?.() ?? 0;
          return tb - ta;
        });
      setNotifications(list);
    } catch (e) {
      console.error('notifications load error', e);
      setNotifications([]);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => updateDoc(doc(db, 'notifications', n.id), { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markOne = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const timeAgo = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 60)   return `${diff}s oldin`;
    if (diff < 3600) return `${Math.floor(diff/60)}m oldin`;
    if (diff < 86400)return `${Math.floor(diff/3600)}s oldin`;
    return `${Math.floor(diff/86400)}k oldin`;
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) loadNotifications(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-sm">Bildirishnomalar</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5"/> Barchasi o'qildi
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50">
                <X className="h-4 w-4"/>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2"/>
                <p className="text-sm text-slate-400">Bildirishnomalar yo'q</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0",
                    !n.read && "bg-blue-50/50"
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {ICONS[n.type] || ICONS.info}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-slate-800" : "text-slate-600")}>
                      {n.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"/>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
