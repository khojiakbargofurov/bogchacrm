import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import { CheckCircle2, XCircle, CalendarDays } from 'lucide-react';

export default function StudentAttendance() {
  const { user } = useAuthStore();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const qS = query(collection(db, 'students'), where('student_uid', '==', user.uid));
        const snap = await getDocs(qS);
        if (snap.empty) { setLoading(false); return; }
        
        const studentDocs = snap.docs;
        const studentIds = studentDocs.map(d => d.id);
        
        const attendanceList = [];
        for (const sId of studentIds) {
          const aSnap = await getDocs(query(collection(db, 'attendance'), where('student_id', '==', sId)));
          aSnap.forEach(d => attendanceList.push({ id: d.id, ...d.data() }));
        }

        // Also query by UID directly for redundancy
        const aUidSnap = await getDocs(query(collection(db, 'attendance'), where('student_uid', '==', user.uid)));
        aUidSnap.forEach(d => {
          if (!attendanceList.find(a => a.id === d.id)) attendanceList.push({ id: d.id, ...d.data() });
        });

        setAttendance(attendanceList.sort((a, b) => b.date?.localeCompare(a.date)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const present = attendance.filter(a => a.status === 'present').length;
  const absent  = attendance.filter(a => a.status === 'absent').length;
  const rate    = attendance.length ? Math.round((present / attendance.length) * 100) : 0;

  // Group by month
  const grouped = attendance.reduce((acc, item) => {
    const month = item.date?.slice(0, 7) || 'Noma\'lum';
    if (!acc[month]) acc[month] = [];
    acc[month].push(item);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Davomat</h2>
        <p className="text-sm text-slate-500 mt-0.5">Sizning darsga qatnashish holatingiz</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-500">{present}</div>
          <div className="text-xs text-slate-500 mt-1">Kelgan</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{absent}</div>
          <div className="text-xs text-slate-500 mt-1">Kelmagan</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{rate}%</div>
          <div className="text-xs text-slate-500 mt-1">Foiz</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-4">
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Davomat foizi</span>
          <span>{rate}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* Attendance records grouped by month */}
      {attendance.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <CalendarDays className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Davomat ma'lumotlari yo'q</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([month, records]) => (
            <div key={month} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">{month}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {records.filter(r => r.status === 'present').length} kelgan / {records.length} kun
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {records.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-slate-700">{a.date}</span>
                    {a.status === 'present' ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Keldi
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
                        <XCircle className="h-3.5 w-3.5" /> Kelmadi
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
