import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/lib/firebase.js';

async function check() {
  console.log("--- STUDENTS ---");
  const s = await getDocs(collection(db, 'students'));
  s.forEach(d => console.log(d.id, d.data().fullname, d.data().student_uid));

  console.log("--- PAYMENTS ---");
  const p = await getDocs(collection(db, 'payments'));
  p.forEach(d => console.log(d.id, d.data().student_id, d.data().amount, d.data().month));
}

check();
