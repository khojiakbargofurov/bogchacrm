import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CreditCard, Search, Plus, Download } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { format } from 'date-fns';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDebtorsOnly, setShowDebtorsOnly] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [formData, setFormData] = useState({
    student_id: '',
    amount: '',
    month: currentMonthStr,
    status: 'paid'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studentsSnap, groupsSnap, paymentsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'groups')),
        getDocs(collection(db, 'payments'))
      ]);
      
      const groupsList = groupsSnap.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data().name;
        return acc;
      }, {});

      const studentsList = studentsSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          fullname: data.fullname,
          group_name: groupsList[data.group_id] || 'Unassigned'
        };
      });
      setStudents(studentsList);
      
      const studentsMap = studentsList.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {});

      // Sort client-side by month desc
      const paymentsList = paymentsSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          student_name: studentsMap[data.student_id]?.fullname || 'Noma\'lum',
          group_name: studentsMap[data.student_id]?.group_name || '-'
        };
      }).sort((a, b) => b.month?.localeCompare(a.month));
      
      setPayments(paymentsList);
    } catch (e) {
      console.error("Error fetching payments", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selectedStudent = students.find(s => s.id === formData.student_id);
      await addDoc(collection(db, 'payments'), {
        ...formData,
        student_uid: selectedStudent?.student_uid || '',
        amount: Number(formData.amount),
        created_at: serverTimestamp(),
        paid_at: formData.status === 'paid' ? serverTimestamp() : null
      });
      setIsModalOpen(false);
      setFormData({ student_id: '', amount: '', month: currentMonthStr, status: 'paid' });
      fetchData();
    } catch (error) {
      console.error("Error recording payment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async (paymentId) => {
    // Optimistic update — show change immediately
    setPayments(prev =>
      prev.map(p => p.id === paymentId
        ? { ...p, status: 'paid' }
        : p
      )
    );
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'paid',
        paid_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      alert("To'lovni yangilashda xatolik: " + error.message);
      // Revert optimistic update on failure
      fetchData();
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending</span>;
      case 'overdue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Overdue</span>;
      default:
        return null;
    }
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDebtor = showDebtorsOnly ? (p.status === 'overdue' || p.status === 'pending') : true;
    return matchesSearch && matchesDebtor;
  });

  const exportToCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ["O'quvchi", "Guruh", "Oy", "Summa", "Holat"];
    const rows = filteredPayments.map(p => [
      p.student_name || '',
      p.group_name || '',
      p.month || '',
      p.amount?.toString() || '',
      p.status === 'paid' ? "To'langan" : p.status === 'overdue' ? "Muddati o'tgan" : "Kutilmoqda"
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.map(item => `"${item}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Tulovlar.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">To'lovlar</h2>
          <p className="text-muted-foreground mt-1">Oylik to'lovlarni kuzatib boring.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border bg-background hover:bg-muted h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <Download className="mr-2 h-4 w-4" /> Excel ga yuklash
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" /> To'lov qo'shish
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="O'quvchi ismini qidirish..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <button
            onClick={() => setShowDebtorsOnly(!showDebtorsOnly)}
            className={`inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 transition-colors ${
              showDebtorsOnly 
                ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' 
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            Faqat qarzdorlar
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
            <tr>
                <th className="px-6 py-4 font-medium">O'quvchi</th>
                <th className="px-6 py-4 font-medium">Guruh</th>
                <th className="px-6 py-4 font-medium">Oy</th>
                <th className="px-6 py-4 font-medium">Summa</th>
                <th className="px-6 py-4 font-medium">Holat</th>
                <th className="px-6 py-4 font-medium text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-muted-foreground">No payments found.</td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{payment.student_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{payment.group_name}</td>
                    <td className="px-6 py-4 font-medium">{payment.month}</td>
                    <td className="px-6 py-4 font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="px-6 py-4">
                      {payment.status === 'paid'
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">To'langan</span>
                        : payment.status === 'overdue'
                        ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Muddati o'tgan</span>
                        : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Kutilmoqda</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      {payment.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(payment.id)}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          To'landi deb belgilash
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Payment">
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">O'quvchi</label>
            <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})}>
              <option value="">O'quvchini tanlang...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.fullname} ({s.group_name})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Summa (UZS)</label>
            <input type="number" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Oy</label>
              <input type="month" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.month} onChange={e => setFormData({...formData, month: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Holat</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="paid">To'langan</option>
                <option value="pending">Kutilmoqda</option>
              </select>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="h-10 px-4 py-2 rounded-md border bg-background hover:bg-muted text-sm font-medium">Bekor qilish</button>
            <button type="submit" disabled={submitting}
              className="h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
              {submitting ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
