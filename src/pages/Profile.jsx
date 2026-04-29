import { useState, useEffect } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { db, storage, auth } from '../lib/firebase';
import useAuthStore from '../store/useAuthStore';
import { 
  UserCircle, Camera, Lock, Save, Loader2, Phone, 
  MapPin, Building2, User, ShieldCheck, Mail
} from 'lucide-react';

export default function Profile() {
  const { user, profile, setProfile } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState('general');

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(profile?.photoURL || null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    gender: profile?.gender || '',
    branch: profile?.branch || '',
    address: profile?.address || ''
  });
  const [savingInfo, setSavingInfo] = useState(false);

  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        gender: profile.gender || '',
        branch: profile.branch || '',
        address: profile.address || ''
      });
      setPhotoPreview(profile.photoURL || null);
    }
  }, [profile]);

  const handlePhotoChange = async (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      
      setUploading(true);
      try {
        const fileRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(fileRef, file);
        const photoURL = await getDownloadURL(fileRef);
        await updateDoc(doc(db, 'users', user.uid), { photoURL });
        setProfile({ photoURL });
      } catch (error) {
        console.error("Error uploading photo:", error);
        alert("Rasmni yuklashda xatolik: " + error.message);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleSaveGeneralInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        branch: formData.branch,
        address: formData.address
      });
      setProfile({
        name: formData.name,
        phone: formData.phone,
        gender: formData.gender,
        branch: formData.branch,
        address: formData.address
      });
      // Show success briefly (you could use a toast here)
      alert("Ma'lumotlar muvaffaqiyatli saqlandi!");
    } catch (error) {
      console.error("Error saving profile:", error);
      alert("Saqlashda xatolik: " + error.message);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPassMessage({ text: "Yangi parollar mos tushmadi.", type: 'error' });
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setPassMessage({ text: "Parol kamida 6 ta belgidan iborat bo'lishi kerak.", type: 'error' });
      return;
    }

    setPassLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, passwordData.oldPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, passwordData.newPassword);
      
      setPassMessage({ text: "Parol muvaffaqiyatli o'zgartirildi!", type: 'success' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error("Password change error:", error);
      let msg = "Parolni yangilashda xatolik.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        msg = "Eski parol noto'g'ri.";
      }
      setPassMessage({ text: msg, type: 'error' });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Sozlamalar</h2>
        <p className="text-slate-500 mt-2 text-lg">Shaxsiy profil va xavfsizlik ma'lumotlarini boshqarish.</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-8 border-t border-slate-200 pt-8">
        
        {/* Sidebar Nav */}
        <div className="space-y-1">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'general' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className="w-5 h-5" /> Asosiy Ma'lumotlar
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'security' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-5 h-5" /> Xavfsizlik
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Asosiy Ma'lumotlar</h3>
              
              {/* Avatar Section */}
              <div className="flex items-center gap-6 pb-8 mb-8 border-b border-slate-100">
                <div className="relative group cursor-pointer">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-slate-50" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 ring-4 ring-slate-50">
                      <UserCircle className="w-16 h-16" />
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-slate-900/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                  </label>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900">{profile?.name}</h4>
                  <p className="text-sm text-slate-500 mb-2 flex items-center gap-1.5"><Mail className="w-4 h-4"/> {user?.email}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-wide">
                    {profile?.role}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveGeneralInfo} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">To'liq ism</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input type="text" required
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Telefon raqam</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input type="tel" placeholder="+998 90 123 45 67"
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Jinsi</label>
                    <select 
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="">Tanlang...</option>
                      <option value="erkak">Erkak</option>
                      <option value="ayol">Ayol</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Filial</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input type="text" placeholder="Asosiy filial"
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Manzil</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input type="text" placeholder="Shahar, Tuman, Ko'cha..."
                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" disabled={savingInfo}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {savingInfo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingInfo ? "Saqlanmoqda..." : "Saqlash"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Xavfsizlik & Parol</h3>
              
              {passMessage.text && (
                <div className={`p-4 rounded-lg text-sm mb-6 flex items-center gap-3 font-medium ${passMessage.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                  {passMessage.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="max-w-md space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Joriy (Eski) Parol</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input type="password" required
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={passwordData.oldPassword} 
                      onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Yangi Parol</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input type="password" required minLength={6}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={passwordData.newPassword} 
                      onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Yangi Parolni Tasdiqlang</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input type="password" required minLength={6}
                      className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      value={passwordData.confirmPassword} 
                      onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={passLoading}
                    className="flex items-center justify-center w-full gap-2 px-6 py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {passLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {passLoading ? "Saqlanmoqda..." : "Parolni O'zgartirish"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
