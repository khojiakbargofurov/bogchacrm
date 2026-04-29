import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Wallet, Search, Plus, Trash2, Pencil, Download, PieChart } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { format } from 'date-fns';

const CATEGORIES = {
  rent: "Ijara",
  salary: "Maoshlar",
  food: "Oziq-ovqat",
  utilities: "Kommunal to'lovlar",
  other: "Boshqa xarajatlar"
};

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'other',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching expenses", e);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingExpense(null);
    setFormData({ title: '', amount: '', category: 'other', date: format(new Date(), 'yyyy-MM-dd') });
    setIsModalOpen(true);
  };

  const openEditModal = (exp) => {
    setEditingExpense(exp.id);
    setFormData({
      title: exp.title || '',
      amount: exp.amount || '',
      category: exp.category || 'other',
      date: exp.date || format(new Date(), 'yyyy-MM-dd')
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense), {
          ...formData,
          amount: Number(formData.amount)
        });
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...formData,
          amount: Number(formData.amount),
          created_at: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      fetchExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("Xatolik: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, 'expenses', deleteTarget.id));
      setDeleteTarget(null);
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(value || 0);
  };

  const filteredExpenses = expenses.filter(e => 
    e.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    CATEGORIES[e.category]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const exportToCSV = () => {
    if (filteredExpenses.length === 0) return;
    const headers = ["Nomi", "Kategoriya", "Summa", "Sana"];
    const rows = filteredExpenses.map(e => [
      e.title || '',
      CATEGORIES[e.category] || '',
      e.amount?.toString() || '',
      e.date || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Xarajatlar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Xarajatlar</h2>
          <p className="text-muted-foreground mt-1">Bog'chaning barcha chiqimlarini nazorat qiling.</p>
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
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> Xarajat qo'shish
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Jami xarajatlar</p>
            <h3 className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</h3>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b flex items-center bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Xarajat nomi yoki toifasi bo'yicha qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Nomi</th>
                <th className="px-6 py-4 font-medium">Toifa (Kategoriya)</th>
                <th className="px-6 py-4 font-medium">Sana</th>
                <th className="px-6 py-4 font-medium">Summa</th>
                <th className="px-6 py-4 font-medium text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground animate-pulse">Yuklanmoqda...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">Xarajatlar topilmadi.</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{expense.title}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {CATEGORIES[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{expense.date}</td>
                    <td className="px-6 py-4 font-medium text-red-600">-{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(expense)}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Tahrirlash"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(expense)}
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

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingExpense ? "Xarajatni tahrirlash" : "Yangi xarajat qo'shish"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Xarajat nomi</label>
            <input type="text" required placeholder="Masalan: Sayr uchun avtobus" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Toifa</label>
            <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="rent">Ijara</option>
              <option value="salary">Maoshlar</option>
              <option value="food">Oziq-ovqat</option>
              <option value="utilities">Kommunal to'lovlar</option>
              <option value="other">Boshqa xarajatlar</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Summa (UZS)</label>
            <input type="number" required placeholder="500000" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Sana</label>
            <input type="date" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Bekor qilish</button>
            <button type="submit" disabled={submitting}
              className="h-10 px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xarajatni o'chirish">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Siz haqiqatan ham ushbu xarajatni o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
          </p>
          <div className="pt-2 flex justify-end gap-2">
            <button onClick={() => setDeleteTarget(null)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Bekor qilish</button>
            <button onClick={handleDelete}
              className="h-10 px-4 py-2 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-medium">
              Ha, o'chirish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
