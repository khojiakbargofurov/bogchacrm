import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, Users, DollarSign, Plus, Trash2, Pencil } from 'lucide-react';
import Modal from '../components/ui/Modal';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age_range: '',
    teacher: '',
    fee: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'groups'));
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(docs);
    } catch (e) {
      console.error("Error fetching groups", e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingGroup(null);
    setFormData({ name: '', age_range: '', teacher: '', fee: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (group) => {
    setEditingGroup(group.id);
    setFormData({
      name: group.name,
      age_range: group.age_range || '',
      teacher: group.teacher || '',
      fee: group.fee || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingGroup) {
        await updateDoc(doc(db, 'groups', editingGroup), {
          ...formData,
          fee: Number(formData.fee)
        });
      } else {
        await addDoc(collection(db, 'groups'), {
          ...formData,
          fee: Number(formData.fee),
          students_count: 0,
          created_at: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      fetchGroups();
    } catch (error) {
      console.error("Error saving group:", error);
      alert("Xatolik yuz berdi: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        await deleteDoc(doc(db, 'groups', id));
        fetchGroups();
      } catch (error) {
        console.error("Error deleting group:", error);
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(value || 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Guruhlar</h2>
          <p className="text-muted-foreground mt-1">Guruhlarni boshqarish, o'qituvchi biriktirish va oylik to'lovni belgilash.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" /> Guruh qo'shish
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="flex justify-center p-8 border rounded-xl border-dashed text-muted-foreground">
          No groups found. Create one to get started.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">{group.age_range}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => openEditModal(group)}
                      className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Tahrirlash"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(group.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> Teacher
                    </span>
                    <span className="font-medium">{group.teacher}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" /> Students
                    </span>
                    <span className="font-medium">{group.students_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <DollarSign className="h-4 w-4" /> Monthly Fee
                    </span>
                    <span className="font-medium text-emerald-600">{formatCurrency(group.fee)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Group Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingGroup ? "Guruhni Tahrirlash" : "Yangi Guruh Yaratish"}>
        <form onSubmit={handleSaveGroup} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Guruh nomi</label>
            <input 
              type="text" required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Masalan: Qaldirg'ochlar"
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Yosh oralig'i</label>
            <input 
              type="text" required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Masalan: 4-5 yosh"
              value={formData.age_range} onChange={e => setFormData({...formData, age_range: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">O'qituvchi ism-sharifi</label>
            <input 
              type="text" required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="To'liq ismi"
              value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Oylik to'lov (UZS)</label>
            <input 
              type="number" required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Masalan: 1500000"
              value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})}
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium"
            >
              Bekor qilish
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
