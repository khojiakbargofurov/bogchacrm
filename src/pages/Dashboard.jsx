import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import {
  Users, GraduationCap, CreditCard, Activity,
  CalendarCheck, TrendingUp, ChevronUp, ChevronDown, Eye, EyeOff, Menu, UserCircle, Plus, BookOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (value) =>
  new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(value || 0);

export default function Dashboard() {
  const { user, profile } = useAuthStore();
  const isStudent = profile?.role === 'student';
  const isTeacher = profile?.role === 'teacher';

  const [loading, setLoading] = useState(true);

  // Admin Stats
  const [stats, setStats] = useState({ students: 0, groups: 0, revenue: 0, expense: 0, attendanceRate: '0%' });

  // Student data
  const [studentData,       setStudentData]       = useState(null);
  const [studentGroup,      setStudentGroup]      = useState(null);
  const [studentPayments,   setStudentPayments]   = useState([]);
  const [studentAttendance, setStudentAttendance] = useState({ present: 0, absent: 0 });

  // Teacher data
  const [teacherStats, setTeacherStats] = useState({ groups: 0, students: 0, salary: 0, attendanceRate: '-' });
  const [teacherGroupsWithDetails, setTeacherGroupsWithDetails] = useState([]);

  useEffect(() => {
    if (isStudent) fetchStudentDashboard();
    else if (isTeacher) fetchTeacherDashboard();
    else fetchAdminStats();
  }, [isStudent, isTeacher, user]);

  // ── Admin stats ──────────────────────────────────────────────────────────
  const fetchAdminStats = async () => {
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const groupsSnap   = await getDocs(collection(db, 'groups'));

      const currentMonthStr = format(new Date(), 'yyyy-MM');
      const paymentsSnap = await getDocs(
        query(collection(db, 'payments'), where('month', '==', currentMonthStr), where('status', '==', 'paid'))
      );
      const totalRevenue = paymentsSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const attSnap  = await getDocs(query(collection(db, 'attendance'), where('date', '==', todayStr)));
      let attendanceRate = '-';
      if (attSnap.size > 0) {
        const present = attSnap.docs.filter(d => d.data().status === 'present').length;
        attendanceRate = Math.round((present / attSnap.size) * 100) + '%';
      }

      const expensesSnap = await getDocs(
        query(collection(db, 'expenses')) // For MVP we sum all expenses, but in production we can filter by month
      );
      // Let's filter expenses for the current month locally to keep it simple
      const totalExpense = expensesSnap.docs
        .filter(d => d.data().date?.startsWith(currentMonthStr))
        .reduce((s, d) => s + (d.data().amount || 0), 0);

      setStats({ students: studentsSnap.size, groups: groupsSnap.size, revenue: totalRevenue, expense: totalExpense, attendanceRate });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Teacher data ─────────────────────────────────────────────────────────
  const fetchTeacherDashboard = async () => {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const qGroups = query(collection(db, 'groups'), where('teacher', '==', profile.name));
      const snapGroups = await getDocs(qGroups);
      const groups = snapGroups.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const groupIds = groups.map(g => g.id);
      
      let allStudents = [];
      if (groupIds.length > 0) {
        const snapStudents = await getDocs(collection(db, 'students'));
        allStudents = snapStudents.docs.map(d => ({ id: d.id, ...d.data() }))
                        .filter(s => groupIds.includes(s.group_id));
      }

      const snapAtt = await getDocs(query(collection(db, 'attendance'), where('date', '==', todayStr)));
      let present = 0, totalAtt = 0;
      snapAtt.docs.forEach(doc => {
        const d = doc.data();
        if (allStudents.some(s => s.id === d.student_id)) {
          totalAtt++;
          if (d.status === 'present') present++;
        }
      });
      let attendanceRate = '-';
      if (totalAtt > 0) attendanceRate = Math.round((present / totalAtt) * 100) + '%';

      let totalSalary = 0;
      const groupsWithDetails = groups.map(g => {
        const groupStudentsCount = allStudents.filter(s => s.group_id === g.id).length;
        const groupRevenue = (g.fee || 0) * groupStudentsCount;
        const teacherShare = groupRevenue * 0.20; // 20%
        totalSalary += teacherShare;
        return {
          ...g,
          studentsCount: groupStudentsCount,
          teacherShare
        };
      });

      setTeacherGroupsWithDetails(groupsWithDetails);
      setTeacherStats({
        groups: groups.length,
        students: allStudents.length,
        salary: totalSalary,
        attendanceRate
      });
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Student data ─────────────────────────────────────────────────────────
  const fetchStudentDashboard = async () => {
    try {
      const qStudent = query(collection(db, 'students'), where('student_uid', '==', user.uid));
      const studentSnap = await getDocs(qStudent);
      if (studentSnap.empty) { setLoading(false); return; }

      const studentDocs = studentSnap.docs;
      const studentIds = studentDocs.map(d => d.id);
      const studentInfo = { id: studentDocs[0].id, ...studentDocs[0].data() };
      setStudentData(studentInfo);

      if (studentInfo.group_id) {
        const gDoc = await getDoc(doc(db, 'groups', studentInfo.group_id));
        if (gDoc.exists()) setStudentGroup(gDoc.data());
      }

      const paymentsList = [];
      for (const sId of studentIds) {
        const pSnap = await getDocs(query(collection(db, 'payments'), where('student_id', '==', sId)));
        pSnap.forEach(d => paymentsList.push({ id: d.id, ...d.data() }));
      }
      const pUidSnap = await getDocs(query(collection(db, 'payments'), where('student_uid', '==', user.uid)));
      pUidSnap.forEach(d => {
        if (!paymentsList.find(p => p.id === d.id)) paymentsList.push({ id: d.id, ...d.data() });
      });

      setStudentPayments(paymentsList.sort((a, b) => b.month?.localeCompare(a.month)));

      let present = 0, absent = 0;
      for (const sId of studentIds) {
        const aSnap = await getDocs(query(collection(db, 'attendance'), where('student_id', '==', sId)));
        aSnap.forEach(d => { if (d.data().status === 'present') present++; else absent++; });
      }
      setStudentAttendance({ present, absent });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Yuklanmoqda...</div>;

  // ════════════════════════════════════════════════════════════════════
  // TEACHER DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  if (isTeacher) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Mening panelim</h2>
          <p className="text-muted-foreground mt-1">Guruhlaringiz va o'quvchilaringizning joriy holati.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label:"Mening Guruhlarim", val: teacherStats.groups,       sub:"Jami biriktirilgan", Icon: GraduationCap, color:'text-purple-500'   },
            { label:"O'quvchilarim",     val: teacherStats.students,     sub:"Jami o'quvchilar",   Icon: Users,         color:'text-blue-500' },
            { label:"Hisoblangan Maosh", val: formatCurrency(teacherStats.salary), sub:"O'quvchilar soniga qarab (20%)", Icon: CreditCard,   color:'text-emerald-500'},
            { label:"Bugungi Davomat",   val: teacherStats.attendanceRate, sub:"Guruhlar bo'yicha",  Icon: Activity,      color:'text-orange-500' },
          ].map(({ label, val, sub, Icon, color }) => (
            <div key={label} className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden relative group">
              <div className="p-6 flex flex-row items-center justify-between pb-2 space-y-0">
                <h3 className="tracking-tight text-sm font-medium">{label}</h3>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="p-6 pt-0">
                <div className="text-2xl font-bold">{val}</div>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-primary/50 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"/>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-muted/20 flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" /> Guruhlarim va Maosh
              </h3>
            </div>
            <div className="divide-y divide-border">
              {teacherGroupsWithDetails.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground border-dashed">Sizga guruhlar biriktirilmagan.</div>
              ) : (
                teacherGroupsWithDetails.map(g => (
                  <div key={g.id} className="p-5 hover:bg-muted/10 transition-colors flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{g.name}</h4>
                        <span className="text-xs text-muted-foreground">{g.age_range || 'Yosh oralig\'i noma\'lum'}</span>
                      </div>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 uppercase tracking-wide">
                        Aktiv
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">O'quvchilar</p>
                        <p className="font-semibold text-slate-800 flex items-center gap-1">
                          <Users className="w-4 h-4 text-slate-400" /> {g.studentsCount} ta
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Ushbu guruhdan maosh (20%)</p>
                        <p className="font-semibold text-emerald-600">
                          {formatCurrency(g.teacherShare)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // STUDENT DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  if (isStudent) {
    if (!studentData) return <div className="p-8 text-center text-slate-400">O'quvchi ma'lumotlari topilmadi.</div>;

    const total = studentAttendance.present + studentAttendance.absent;
    const rate  = total ? Math.round((studentAttendance.present / total) * 100) : 0;

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#4ADE80] via-[#22c55e] to-[#16a34a] px-6 py-7 text-white shadow-sm">
          <div className="relative z-10">
            <p className="text-green-100 text-sm font-medium mb-1">Xush kelibsiz 👋</p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">{studentData.fullname}</h1>
            {studentGroup && (
              <p className="text-green-100 mt-1 text-sm">{studentGroup.name} guruhi · O'qituvchi: {studentGroup.teacher}</p>
            )}
          </div>
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-6 w-24 h-24 bg-white/10 rounded-full" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: <CalendarCheck className="h-5 w-5 text-emerald-500"/>, bg:'bg-emerald-50', val: studentAttendance.present, label:'Kelgan kunlar' },
            { icon: <Activity      className="h-5 w-5 text-red-400"    />, bg:'bg-red-50',     val: studentAttendance.absent,  label:'Kelmagan'      },
            { icon: <TrendingUp    className="h-5 w-5 text-blue-500"   />, bg:'bg-blue-50',    val: `${rate}%`,                label:'Davomat foizi' },
            { icon: <CreditCard    className="h-5 w-5 text-[#D4A373]"  />, bg:'bg-[#FDF6F0]', val: studentPayments.filter(p=>p.status==='paid').length, label:"To'langan oylar" },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-1 hover:shadow-sm transition-shadow">
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-1`}>{c.icon}</div>
              <span className="text-2xl font-black text-slate-800">{c.val}</span>
              <span className="text-xs text-slate-400 font-medium">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-4">
            <h3 className="font-bold text-slate-800">Davomat holati</h3>
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5"/>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4ade80" strokeWidth="3.5"
                    strokeDasharray={`${rate} ${100-rate}`} strokeLinecap="round"/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-lg font-black text-slate-800">{rate}%</span>
                </div>
              </div>
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"/>
                  <span className="text-sm text-slate-600">Kelgan: <strong>{studentAttendance.present}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0"/>
                  <span className="text-sm text-slate-600">Kelmagan: <strong>{studentAttendance.absent}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
            <h3 className="font-bold text-slate-800">Guruh ma'lumotlari</h3>
            {studentGroup ? (
              <>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">Guruh nomi</p>
                  <p className="text-2xl font-black text-[#D4A373]">{studentGroup.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">O'qituvchi</p>
                    <p className="text-sm font-semibold text-slate-700 truncate">{studentGroup.teacher || '—'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">Oylik</p>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(studentGroup.fee)}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-sm">Guruh biriktirilmagan</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">To'lovlar tarixi</h3>
            <span className="text-xs text-slate-400">{studentPayments.length} ta yozuv</span>
          </div>
          {studentPayments.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">
              <CreditCard className="h-10 w-10 mx-auto mb-3 text-slate-200"/>
              <p>Hali to'lovlar amalga oshirilmagan</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {studentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 text-slate-400"/>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.month}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(p.amount)}</p>
                    </div>
                  </div>
                  {p.status === 'paid'
                    ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">To'langan</span>
                    : <span className="text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">Kutilmoqda</span>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bosh sahifa</h2>
        <p className="text-muted-foreground mt-1">Bugun bog'chada nimalar bo'layotgani bilan tanishing.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label:"Jami o'quvchilar", val: stats.students,       sub:"Ro'yxatdan o'tgan bolalar", Icon: Users,        color:'text-blue-500'   },
          { label:"Faol guruhlar",    val: stats.groups,         sub:"Barcha yosh toifalari",     Icon: GraduationCap,color:'text-purple-500' },
          { label:"Sof foyda (Shu oy)",val: formatCurrency(stats.revenue - stats.expense), sub:`Tushum: ${formatCurrency(stats.revenue)} | Chiqim: ${formatCurrency(stats.expense)}`, Icon: CreditCard,   color:'text-emerald-500'},
          { label:"Davomat foizi",   val: stats.attendanceRate, sub:"Bugungi o'rtacha",          Icon: Activity,     color:'text-orange-500' },
        ].map(({ label, val, sub, Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden relative group">
            <div className="p-6 flex flex-row items-center justify-between pb-2 space-y-0">
              <h3 className="tracking-tight text-sm font-medium">{label}</h3>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="p-6 pt-0">
              <div className="text-2xl font-bold">{val}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary to-primary/50 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"/>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm col-span-4 p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Daromadlar ko'rinishi (Oxirgi 6 oy)</h3>
          <div className="flex-1 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Noy', daromad: 4000000 },
                { name: 'Dek', daromad: 5000000 },
                { name: 'Yan', daromad: 4500000 },
                { name: 'Fev', daromad: 6000000 },
                { name: 'Mar', daromad: 7500000 },
                { name: 'Apr', daromad: stats.revenue || 8000000 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `${value / 1000000}M`} dx={-10} />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="daromad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm col-span-3 p-6">
          <h3 className="font-semibold text-lg mb-4">Tizim xabarlari</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">S</div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">Baza ulandi</p>
                <p className="text-xs text-muted-foreground">Sinxronizatsiya muvaffaqiyatli</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
