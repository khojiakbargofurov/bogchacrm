import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import {
  Send, Search, CheckSquare, Square,
  Users, Info, AlertCircle, CreditCard, CalendarCheck,
  Loader2, CheckCircle2, X
} from 'lucide-react';
import { cn } from '../lib/utils';

const TYPES = [
  { value: 'info',       label: "Ma'lumot",      icon: Info,          color: 'text-blue-500'    },
  { value: 'warning',    label: 'Ogohlantirish', icon: AlertCircle,   color: 'text-orange-400'  },
  { value: 'payment',    label: "To'lov",        icon: CreditCard,    color: 'text-emerald-500' },
  { value: 'attendance', label: 'Davomat',       icon: CalendarCheck, color: 'text-purple-500'  },
];

export default function SendNotification() {
  const { profile, user } = useAuthStore();
  const isTeacher = profile?.role === 'teacher';

  const [students,     setStudents]     = useState([]);
  const [groups,       setGroups]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [selected,     setSelected]     = useState(new Set());
  const [message,      setMessage]      = useState('');
  const [type,         setType]         = useState('info');
  const [sending,      setSending]      = useState(false);
  const [status,       setStatus]       = useState(null); // { ok: bool, msg: string }
  const [filterGroup,  setFilterGroup]  = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const groupsSnap = await getDocs(collection(db, 'groups'));
      const groupList  = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroups(groupList);

      let studentsSnap;
      if (isTeacher) {
        const myGroupIds = groupList
          .filter(g => g.teacher === profile?.name)
          .map(g => g.id);
        if (myGroupIds.length === 0) {
          setStudents([]);
          setLoading(false);
          return;
        }
        studentsSnap = await getDocs(
          query(collection(db, 'students'), where('group_id', 'in', myGroupIds))
        );
      } else {
        studentsSnap = await getDocs(collection(db, 'students'));
      }

      const list = studentsSnap.docs.map(d => {
        const data = d.data();
        const g = groupList.find(g => g.id === data.group_id);
        return {
          id:          d.id,
          fullname:    data.fullname || 'Noma\'lum',
          group_id:    data.group_id || '',
          group_name:  g?.name || '—',
          login_id:    data.login_id || '',
          student_uid: data.student_uid || null,   // Firebase Auth UID
        };
      });
      setStudents(list);
    } catch (e) {
      console.error('loadData error:', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered = students.filter(s => {
    const matchSearch = s.fullname.toLowerCase().includes(search.toLowerCase()) ||
                        s.login_id.toLowerCase().includes(search.toLowerCase());
    const matchGroup  = filterGroup === 'all' || s.group_id === filterGroup;
    return matchSearch && matchGroup;
  });

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    setSelected(selected.size === filtered.length && filtered.length > 0
      ? new Set()
      : new Set(filtered.map(s => s.id))
    );
  };

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || selected.size === 0) return;

    const targets = students.filter(s => selected.has(s.id));
    const missingUid = targets.filter(s => !s.student_uid);
    if (missingUid.length > 0) {
      setStatus({ ok: false, msg: `Ba'zi o'quvchilarning tizim ID si yo'q: ${missingUid.map(s => s.fullname).join(', ')}` });
      return;
    }

    setSending(true);
    setStatus(null);
    try {
      await Promise.all(
        targets.map(s =>
          addDoc(collection(db, 'notifications'), {
            recipient_uid: s.student_uid,
            sender_uid:    user.uid,
            sender_name:   profile?.name || 'Admin',
            message:       message.trim(),
            type,
            read:          false,
            created_at:    serverTimestamp(),
          })
        )
      );
      setStatus({ ok: true, msg: `${targets.length} ta o'quvchiga muvaffaqiyatli yuborildi!` });
      setMessage('');
      setSelected(new Set());
    } catch (e) {
      console.error('Send notification error:', e);
      setStatus({ ok: false, msg: `Xatolik: ${e.message}` });
    } finally {
      setSending(false);
    }
  };

  const visibleGroups = isTeacher
    ? groups.filter(g => g.teacher === profile?.name)
    : groups;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bildirishnoma yuborish</h2>
        <p className="text-muted-foreground mt-1">
          {isTeacher ? "O'z o'quvchilaringizga xabar yuboring" : "Istalgan o'quvchiga bildirishnoma yuboring"}
        </p>
      </div>

      {/* Status banner */}
      {status && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          status.ok
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-red-50 border-red-200 text-red-700"
        )}>
          {status.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertCircle  className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{status.msg}</span>
          <button onClick={() => setStatus(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6 items-start">

        {/* ── Student picker ── */}
        <div className="lg:col-span-3 bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/20 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ism yoki ID bo'yicha izlash..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={filterGroup}
                onChange={e => setFilterGroup(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring flex-1"
              >
                <option value="all">Barcha guruhlar</option>
                {visibleGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button
                onClick={toggleAll}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
              >
                {selected.size === filtered.length && filtered.length > 0
                  ? <CheckSquare className="h-4 w-4 text-primary" />
                  : <Square className="h-4 w-4" />
                }
                Barchasi
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-96 divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground animate-pulse">Yuklanmoqda...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                <Users className="h-8 w-8 opacity-20" />
                <p className="text-sm">O'quvchilar topilmadi</p>
              </div>
            ) : (
              filtered.map(s => (
                <div
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    selected.has(s.id) && "bg-primary/5"
                  )}
                >
                  {/* Checkbox */}
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    selected.has(s.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {selected.has(s.id) && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                    {s.fullname.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.fullname}</p>
                    <p className="text-xs text-muted-foreground">{s.group_name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.login_id && (
                      <span className="text-xs font-mono text-muted-foreground">{s.login_id}</span>
                    )}
                    {/* Show warning if student has no uid */}
                    {!s.student_uid && (
                      <span title="Tizim ID yo'q" className="text-xs text-orange-500">⚠️</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t bg-muted/10 text-xs text-muted-foreground">
            {selected.size > 0
              ? <span className="text-primary font-semibold">{selected.size} ta tanlandi</span>
              : `Jami ${filtered.length} ta o'quvchi`}
          </div>
        </div>

        {/* ── Compose ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Type selector */}
          <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
            <p className="text-sm font-semibold">Xabar turi</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      type === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", type === t.value ? "text-primary" : t.color)} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message */}
          <div className="bg-card rounded-xl border shadow-sm p-4 space-y-3">
            <p className="text-sm font-semibold">Xabar matni</p>
            <textarea
              rows={6}
              maxLength={300}
              placeholder="Xabar yozing..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/300</p>
          </div>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={sending || selected.size === 0 || !message.trim()}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {sending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda...</>
              : <><Send className="h-4 w-4" /> {selected.size > 0 ? `${selected.size} ta o'quvchiga yuborish` : "O'quvchi tanlang"}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
