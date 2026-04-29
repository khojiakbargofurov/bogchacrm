import { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, deleteDoc,
  doc, setDoc, serverTimestamp, query, where, getDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, updatePassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../lib/firebase';
import {
  Plus, Search, UserCircle, Trash2, Key, Eye,
  Phone, BookOpen, CalendarCheck, CreditCard,
  CheckCircle2, XCircle, Clock, ArrowLeft, Pencil, Lock, Download
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import useAuthStore from '../store/useAuthStore';

const formatCurrency = (v) =>
  new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(v || 0);

// ─── Student Detail Panel ────────────────────────────────────────────────────
function StudentDetail({ student, groups, onClose }) {
  const [attendance, setAttendance] = useState([]);
  const [payments,   setPayments]   = useState([]);
  const [loading,    setLoading]    = useState(true);

  const group = groups.find(g => g.id === student.group_id);

  useEffect(() => {
    const load = async () => {
      try {
        const [attSnap, paySnap] = await Promise.all([
          getDocs(query(collection(db, 'attendance'), where('student_id', '==', student.id))),
          getDocs(query(collection(db, 'payments'),   where('student_id', '==', student.id))),
        ]);
        setAttendance(attSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPayments(paySnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => b.month?.localeCompare(a.month)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [student.id]);

  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [newPass, setNewPass] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPass || newPass.length < 6) {
      alert("Parol kamida 6 ta belgi bo'lishi kerak!");
      return;
    }

    const currentPass = student.password;
    if (!currentPass) {
      alert("Xatolik: Ushbu o'quvchining eski paroli bazada topilmadi. Eski o'quvchilar parolini yangilab bo'lmaydi (faqat yangi qo'shilganlar uchun amal qiladi).");
      return;
    }

    setUpdating(true);
    try {
      const email = `${student.login_id}@bogcha.uz`;

      // 1. Sign in as student using secondaryAuth
      const cred = await signInWithEmailAndPassword(secondaryAuth, email, currentPass);
      
      // 2. Update password in Firebase Auth
      await updatePassword(cred.user, newPass);
      
      // 3. Update password in Firestore (both collections)
      await setDoc(doc(db, 'users', student.student_uid), { password: newPass }, { merge: true });
      await setDoc(doc(db, 'students', student.id), { password: newPass }, { merge: true });
      
      // 4. Sign out from secondaryAuth
      await signOut(secondaryAuth);
      
      alert("Parol muvaffaqiyatli yangilandi!");
      setIsPassModalOpen(false);
      setNewPass('');
      // Update local state
      student.password = newPass;
    } catch (err) {
      console.error(err);
      alert("Xatolik: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount  = attendance.filter(a => a.status === 'absent').length;
  const totalPaid    = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{student.fullname}</h2>
          <p className="text-muted-foreground text-sm">O'quvchi ma'lumotlari</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
            <UserCircle className="h-4 w-4" /> Shaxsiy ma'lumot
          </h3>
          <div className="space-y-3">
            <Row label="To'liq ism"    value={student.fullname} />
            <Row label="Tug'ilgan sana" value={student.birthdate || '—'} />
            <Row label="Login ID"      value={<span className="font-mono text-primary font-bold">{student.login_id || '—'}</span>} />
            <Row 
              label="Parol"      
              value={
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">{student.password || '—'}</span>
                  <button 
                    onClick={() => setIsPassModalOpen(true)}
                    className="p-1 hover:bg-primary/10 rounded text-primary transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              } 
            />
            <Row label="Ota-ona"       value={student.parent_name || '—'} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground uppercase tracking-wide">
            <BookOpen className="h-4 w-4" /> Guruh
          </h3>
          {group ? (
            <div className="space-y-3">
              <Row label="Guruh nomi"   value={group.name} />
              <Row label="O'qituvchi"   value={group.teacher || '—'} />
              <Row label="Yosh oralig'" value={group.age_range || '—'} />
              <Row label="Oylik to'lov" value={<span className="text-emerald-600 font-semibold">{formatCurrency(group.fee)}</span>} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Guruh biriktirilmagan</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />} label="Kelgan kunlar"  value={presentCount} color="emerald" />
        <StatCard icon={<XCircle      className="h-5 w-5 text-red-400"     />} label="Kelmagan"       value={absentCount}  color="red"     />
        <StatCard icon={<CreditCard   className="h-5 w-5 text-blue-500"    />} label="To'langan"     value={formatCurrency(totalPaid).replace('UZS','').trim()} color="blue" />
        <StatCard icon={<Clock        className="h-5 w-5 text-orange-400"  />} label="Qarzdorlik"    value={formatCurrency(totalPending).replace('UZS','').trim()} color="orange" />
      </div>

      {loading ? (
        <p className="text-center py-8 text-muted-foreground animate-pulse">Yuklanmoqda...</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Attendance */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Davomat tarixi</h3>
              <span className="ml-auto text-xs text-muted-foreground">{attendance.length} yozuv</span>
            </div>
            {attendance.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Davomat ma'lumoti yo'q.</p>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto">
                {attendance.slice().sort((a,b) => b.date?.localeCompare(a.date)).map(a => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                    <span className="text-sm">{a.date}</span>
                    {a.status === 'present'
                      ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><CheckCircle2 className="h-3 w-3"/> Keldi</span>
                      : <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><XCircle className="h-3 w-3"/> Kelmadi</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">To'lovlar tarixi</h3>
              <span className="ml-auto text-xs text-muted-foreground">{payments.length} yozuv</span>
            </div>
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">To'lovlar ma'lumoti yo'q.</p>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.month}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(p.amount)}</p>
                    </div>
                    {p.status === 'paid'
                      ? <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">To'langan</span>
                      : <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Kutilmoqda</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      <Modal isOpen={isPassModalOpen} onClose={() => setIsPassModalOpen(false)} title="Parolni yangilash">
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Yangi parol</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                required 
                minLength={6}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Yangi parolni kiriting"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Eski parol: <span className="font-mono">{student.password}</span></p>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setIsPassModalOpen(false)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Bekor qilish</button>
            <button type="submit" disabled={updating}
              className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
              {updating ? 'Yangilanmoqda...' : "Saqlash"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const bg = { emerald: 'bg-emerald-50', red: 'bg-red-50', blue: 'bg-blue-50', orange: 'bg-orange-50' };
  return (
    <div className={`rounded-xl border ${bg[color]} p-4 flex items-center gap-3`}>
      {icon}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Students Page ──────────────────────────────────────────────────────
export default function Students() {
  const { profile } = useAuthStore();
  const isTeacher = profile?.role === 'teacher';

  const [students, setStudents]   = useState([]);
  const [groups,   setGroups]     = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [deleting, setDeleting]   = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null); // <-- detail view

  const [formData, setFormData] = useState({
    fullname: '', birthdate: '', group_id: '', parent_name: ''
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsSnap, groupsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'groups'))
      ]);
      let groupsList = groupsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      let studentsList = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (isTeacher) {
        groupsList = groupsList.filter(g => g.teacher === profile.name);
        const groupIds = groupsList.map(g => g.id);
        studentsList = studentsList.filter(s => groupIds.includes(s.group_id));
      }

      setGroups(groupsList);
      setStudents(studentsList.map(data => {
        const g = groupsList.find(g => g.id === data.group_id);
        return { ...data, group_name: g ? g.name : 'Biriktirilmagan' };
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingStudent) {
        await setDoc(doc(db, 'students', editingStudent), {
          ...formData
        }, { merge: true });
        
        const targetStudent = students.find(s => s.id === editingStudent);
        if (targetStudent && targetStudent.student_uid) {
          await setDoc(doc(db, 'users', targetStudent.student_uid), { name: formData.fullname }, { merge: true });
        }
        
        setIsModalOpen(false);
        setEditingStudent(null);
        setFormData({ fullname: '', birthdate: '', group_id: '', parent_name: '' });
        fetchData();
      } else {
        const generatedPassword = Math.random().toString(36).slice(-8);
        const lastStudentSnap = await getDocs(query(collection(db, 'students'), orderBy('created_at', 'desc'), limit(1)));
        let newIdNumber = 1000;
        if (!lastStudentSnap.empty) {
          const lastIdStr = lastStudentSnap.docs[0].data().login_id;
          if (lastIdStr && lastIdStr.startsWith('st')) {
            const num = parseInt(lastIdStr.replace('st', ''), 10);
            if (!isNaN(num)) newIdNumber = num + 1;
          }
        }
        const generatedId = `st${newIdNumber}`;
        const email = `${generatedId}@bogcha.uz`;
  
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, generatedPassword);
        const studentUid = cred.user.uid;
        await signOut(secondaryAuth);
  
        await setDoc(doc(db, 'users', studentUid), {
          role: 'student',
          name: formData.fullname,
          email: email,
          created_at: serverTimestamp()
        });
        await addDoc(collection(db, 'students'), {
          ...formData, student_uid: studentUid,
          login_id: generatedId, 
          password: generatedPassword,
          created_at: serverTimestamp()
        });
  
        setNewCredentials({ id: generatedId, password: generatedPassword, name: formData.fullname });
        setIsModalOpen(false);
        setFormData({ fullname: '', birthdate: '', group_id: '', parent_name: '' });
        fetchData();
      }
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'students', studentToDelete.id));
      setStudentToDelete(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.login_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToCSV = () => {
    if (filteredStudents.length === 0) return;
    const headers = ["ID", "Ismi", "Guruh", "Tug'ilgan sana", "Ota-onasi"];
    const rows = filteredStudents.map(s => [
      s.login_id || '',
      s.fullname || '',
      s.group_name || '',
      s.birthdate || '',
      s.parent_name || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Oquvchilar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── If detail view is open, show it instead ──────────────────────────────
  if (viewingStudent) {
    return (
      <StudentDetail
        student={viewingStudent}
        groups={groups}
        onClose={() => setViewingStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Credentials Banner */}
      {newCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-xl shadow-sm relative">
          <button onClick={() => setNewCredentials(null)} className="absolute top-3 right-4 text-xl text-emerald-600 hover:text-emerald-900">×</button>
          <div className="flex items-start gap-4">
            <div className="bg-emerald-100 p-3 rounded-full"><Key className="h-6 w-6 text-emerald-600" /></div>
            <div>
              <h3 className="text-lg font-bold">O'quvchi muvaffaqiyatli ro'yxatdan o'tdi!</h3>
              <p className="text-sm mt-1 mb-4">Quyidagi ma'lumotlarni ota-onaga yoki o'quvchiga bering.</p>
              <div className="bg-white p-4 rounded-lg border border-emerald-100 space-y-2">
                <Row label="O'quvchi ismi" value={newCredentials.name} />
                <Row label="Login ID"      value={<span className="font-mono text-primary font-bold text-lg">{newCredentials.id}</span>} />
                <Row label="Parol"         value={<span className="font-mono font-bold text-lg">{newCredentials.password}</span>} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">O'quvchilar</h2>
          <p className="text-muted-foreground mt-1">Bog'chadagi barcha bolalar ro'yxati.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border bg-background hover:bg-muted h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <Download className="mr-2 h-4 w-4" /> Excel ga yuklash
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> O'quvchi qo'shish
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Ism yoki ID bo'yicha izlash..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{filteredStudents.length} ta o'quvchi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">O'quvchi & ID</th>
                <th className="px-6 py-4 font-medium">Guruh</th>
                <th className="px-6 py-4 font-medium">Tug'ilgan sana</th>
                <th className="px-6 py-4 font-medium">Ota-ona</th>
                <th className="px-6 py-4 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground animate-pulse">Yuklanmoqda...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">O'quvchilar topilmadi.</td></tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                          {student.fullname?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <span className="font-medium block">{student.fullname}</span>
                          {student.login_id && <span className="text-xs text-primary font-mono">{student.login_id}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                        {student.group_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{student.birthdate || '—'}</td>
                    <td className="px-6 py-4">{student.parent_name || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="p-2 hover:bg-primary/10 rounded-md text-muted-foreground hover:text-primary transition-colors"
                          title="Ko'rish"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {user.role !== 'teacher' && (
                          <button
                            onClick={() => openEditModal(student)}
                            className="p-2 hover:bg-blue-100 rounded-md text-muted-foreground hover:text-blue-600 transition-colors"
                            title="Tahrirlash"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setStudentToDelete(student)}
                          className="p-2 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Student Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStudent ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish"}>
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">To'liq ism</label>
            <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.fullname} onChange={e => setFormData({ ...formData, fullname: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tug'ilgan sana</label>
            <input type="date" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.birthdate} onChange={e => setFormData({ ...formData, birthdate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Guruhga biriktirish</label>
            <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.group_id} onChange={e => setFormData({ ...formData, group_id: e.target.value })}>
              <option value="">Guruhni tanlang...</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ota-ona ismi</label>
            <input type="text" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.parent_name} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} />
          </div>
          {!editingStudent && (
            <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground">
              Ro'yxatdan o'tish tugallangach Login ID va Parol avtomatik yaratiladi.
            </div>
          )}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Bekor qilish</button>
            <button type="submit" disabled={submitting}
              className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Saqlanmoqda...' : (editingStudent ? "Saqlash" : "Ro'yxatdan o'tkazish")}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)} title="O'quvchini o'chirish">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Siz haqiqatan ham <strong>{studentToDelete?.fullname}</strong>ni bazadan o'chirishni xohlaysizmi?
            Bu amalni ortga qaytarib bo'lmaydi.
          </p>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={() => setStudentToDelete(null)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Bekor qilish</button>
            <button onClick={confirmDelete} disabled={deleting}
              className="h-10 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium disabled:opacity-50">
              {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
