import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { format, subDays, addDays } from 'date-fns';
import { CalendarCheck, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function Attendance() {
  const { profile } = useAuthStore();
  const isTeacher = profile?.role === 'teacher';

  const [date, setDate] = useState(new Date());
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchStudentsAndAttendance(selectedGroupId, date);
    } else {
      setStudents([]);
    }
  }, [selectedGroupId, date]);

  const fetchGroups = async () => {
    try {
      const snap = await getDocs(collection(db, 'groups'));
      let groupsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (isTeacher) {
        groupsList = groupsList.filter(g => g.teacher === profile.name);
      }
      setGroups(groupsList);
    } catch (e) { console.error("Error fetching groups", e); }
  };

  const fetchStudentsAndAttendance = async (groupId, targetDate) => {
    setLoading(true);
    try {
      const formattedDate = format(targetDate, 'yyyy-MM-dd');
      
      // Fetch students for group
      const qStudents = query(collection(db, 'students'), where('group_id', '==', groupId));
      const studentsSnap = await getDocs(qStudents);
      const studentsList = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Fetch attendance for this date
      const qAttendance = query(collection(db, 'attendance'), where('date', '==', formattedDate));
      const attSnap = await getDocs(qAttendance);
      
      const records = {};
      attSnap.docs.forEach(doc => {
        const data = doc.data();
        records[data.student_id] = data.status; // 'present' or 'absent'
      });

      setStudents(studentsList);
      setAttendanceRecords(records);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId, status) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    const formattedDate = format(date, 'yyyy-MM-dd');
    try {
      // In a real production app we would use batch operations and update existing docs
      // For MVP, we will just add documents for any recorded state
      for (const student of students) {
        const status = attendanceRecords[student.id];
        if (status) {
           await addDoc(collection(db, 'attendance'), {
             student_id: student.id,
             student_uid: student.student_uid || '',
             group_id: selectedGroupId,
             date: formattedDate,
             status: status,
             recorded_at: Timestamp.now()
           });
        }
      }
      alert('Attendance saved successfully!');
    } catch (error) {
      console.error("Error saving attendance:", error);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendanceRecords).filter(v => v === 'present').length;
  const absentCount = Object.values(attendanceRecords).filter(v => v === 'absent').length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground mt-1">Mark daily attendance for students.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          <button onClick={() => setDate(subDays(date, 1))} className="p-2 hover:bg-muted rounded-md transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-4 font-medium min-w-[140px] justify-center text-sm">
            <CalendarCheck className="h-4 w-4 text-primary" />
            {format(date, 'MMM dd, yyyy')}
          </div>
          <button onClick={() => setDate(addDays(date, 1))} className="p-2 hover:bg-muted rounded-md transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl space-y-4">
        <div className="flex gap-4">
          <select 
            className="flex h-10 w-full sm:w-64 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">-- Select a Group --</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {selectedGroupId && (
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                Students List
              </h3>
              <div className="flex gap-2 text-sm">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {presentCount} Present</span>
                <span className="flex items-center gap-1 ml-3"><span className="w-2 h-2 rounded-full bg-destructive"></span> {absentCount} Absent</span>
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading students...</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No students in this group.</div>
              ) : (
                students.map((student) => (
                  <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors gap-4">
                    <div className="font-medium">{student.fullname}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleAttendance(student.id, 'present')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          attendanceRecords[student.id] === 'present' 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' 
                            : 'bg-background border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Check className="h-4 w-4" /> Present
                      </button>
                      <button 
                        onClick={() => toggleAttendance(student.id, 'absent')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          attendanceRecords[student.id] === 'absent' 
                            ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm' 
                            : 'bg-background border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <X className="h-4 w-4" /> Absent
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {students.length > 0 && (
              <div className="p-4 border-t bg-muted/10 flex justify-end">
                <button 
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
