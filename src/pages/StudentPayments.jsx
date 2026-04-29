import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import { CreditCard, CheckCircle2, Clock, Receipt } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('uz-UZ').format(v || 0) + ' UZS';

export default function StudentPayments() {
  const { user } = useAuthStore();
  const [payments, setPayments]   = useState([]);
  const [group,    setGroup]      = useState(null);
  const [loading,  setLoading]    = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const qS = query(collection(db, 'students'), where('student_uid', '==', user.uid));
        const sSnap = await getDocs(qS);
        if (sSnap.empty) { setLoading(false); return; }

        const studentDocs = sSnap.docs;
        const studentIds = studentDocs.map(d => d.id);
        const studentData = studentDocs[0].data();

        // fetch group
        if (studentData.group_id) {
          const gDoc = await getDoc(doc(db, 'groups', studentData.group_id));
          if (gDoc.exists()) setGroup(gDoc.data());
        }

        const paymentsList = [];
        for (const sId of studentIds) {
          const pSnap = await getDocs(query(collection(db, 'payments'), where('student_id', '==', sId)));
          pSnap.forEach(d => paymentsList.push({ id: d.id, ...d.data() }));
        }
        
        // Also query by UID directly for redundancy
        const pUidSnap = await getDocs(query(collection(db, 'payments'), where('student_uid', '==', user.uid)));
        pUidSnap.forEach(d => {
          if (!paymentsList.find(p => p.id === d.id)) paymentsList.push({ id: d.id, ...d.data() });
        });

        setPayments(
          paymentsList.sort((a, b) => b.month?.localeCompare(a.month))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const paid    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">To'lovlar</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Oylik to'lov:{' '}
          <span className="font-semibold text-slate-700">{group ? fmt(group.fee) : '—'}</span>
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mb-2" />
          <div className="text-lg font-bold text-slate-800">{fmt(paid)}</div>
          <div className="text-xs text-slate-500 mt-0.5">To'langan</div>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <Clock className="h-5 w-5 text-orange-400 mb-2" />
          <div className="text-lg font-bold text-slate-800">{fmt(pending)}</div>
          <div className="text-xs text-slate-500 mt-0.5">Qarzdorlik</div>
        </div>
      </div>

      {/* Payment list */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">To'lovlar ma'lumoti yo'q</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-50">
            {payments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{p.month}</p>
                    <p className="text-xs text-slate-400">{fmt(p.amount)}</p>
                  </div>
                </div>
                {p.status === 'paid' ? (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    To'langan
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
                    Kutilmoqda
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
