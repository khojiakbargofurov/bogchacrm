import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from '../lib/firebase';
import { ShieldAlert, Plus, Mail, Pencil, Trash2, UserCheck, UserCog, X } from 'lucide-react';
import Modal from '../components/ui/Modal';

const ROLE_COLORS = {
  owner:   'bg-purple-100 text-purple-700 border-purple-200',
  admin:   'bg-blue-100 text-blue-700 border-blue-200',
  teacher: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  parent:  'bg-orange-100 text-orange-700 border-orange-200',
  student: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ROLE_LABELS = {
  owner: 'Egalik',
  admin: 'Admin',
  teacher: "O'qituvchi",
  parent: 'Ota-ona',
  student: "O'quvchi",
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'admin' };

export default function Users() {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = add mode
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData]   = useState(EMPTY_FORM);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching users', e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingUser(null);
    setFormData(EMPTY_FORM);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({ name: u.name || '', email: u.email || '', password: '', role: u.role || 'admin' });
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingUser) {
        // UPDATE — only name & role (can't change email/auth via client SDK safely)
        await updateDoc(doc(db, 'users', editingUser.id), {
          name: formData.name,
          role: formData.role,
        });
      } else {
        // CREATE
        const cred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          created_at: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setFormData(EMPTY_FORM);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.message || "Foydalanuvchini saqlashda xatolik yuz berdi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'users', deleteTarget.id));
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Foydalanuvchilar</h2>
          <p className="text-muted-foreground mt-1">Admin va o'qituvchilar kirishini boshqarish.</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" /> Foydalanuvchi qo'shish
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {['admin','teacher','parent','student'].map(role => {
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} className="rounded-xl border bg-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${ROLE_COLORS[role]}`}>
                {count}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jami</p>
                <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Ism</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Rol</th>
                <th className="px-6 py-4 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-muted-foreground animate-pulse">Yuklanmoqda...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-muted-foreground">Foydalanuvchilar topilmadi.</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium">{u.name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {u.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.student}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        title={editingUser ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm border border-destructive/30 flex items-start gap-2">
              <X className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">To'liq ism</label>
            <input
              type="text" required
              placeholder="Ism Familiya"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {!editingUser && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email manzil</label>
                <input
                  type="email" required
                  placeholder="example@email.com"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parol</label>
                <input
                  type="password" required minLength={6}
                  placeholder="Kamida 6 ta belgi"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Rol</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="admin">Admin</option>
              <option value="teacher">O'qituvchi</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setIsModalOpen(false); setEditingUser(null); }}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium"
            >
              Bekor qilish
            </button>
            <button
              type="submit" disabled={submitting}
              className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {editingUser ? <UserCog className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              {submitting ? 'Saqlanmoqda...' : editingUser ? 'Saqlash' : 'Hisob yaratish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="O'chirishni tasdiqlang">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span> foydalanuvchisini tizimdan o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleDelete}
              className="h-10 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              O'chirish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
