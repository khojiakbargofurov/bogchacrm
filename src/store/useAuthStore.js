import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  loading: true,
  
  initialize: () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        set({ user: firebaseUser });
        
        // Fetch user profile/role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            set({ profile: userDoc.data(), loading: false });
          } else {
            // Default empty profile
            set({ profile: { role: 'parent' }, loading: false });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          set({ profile: null, loading: false });
        }
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  setLoading: (loading) => set({ loading }),
  setProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
}));

export default useAuthStore;
