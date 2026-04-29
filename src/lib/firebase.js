import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAlpxbBU6afiSpx2t2errNlI7wz3HwguL8",
  authDomain: "bogchacrm-5baff.firebaseapp.com",
  projectId: "bogchacrm-5baff",
  storageBucket: "bogchacrm-5baff.firebasestorage.app",
  messagingSenderId: "586158633678",
  appId: "1:586158633678:web:7b832c95afc983238b569f",
  measurementId: "G-DK5XMH86S0"
};

// Primary App for normal usage
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary App for creating users without logging out the current admin
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);
