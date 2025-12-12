import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  TeacherData, UserRole, AppSettings, CalendarEvent, TeacherLeave, 
  TeachingMaterial, TeachingJournal, Student, GradeRecord, HomeroomRecord,
  ChapterGrade
} from '../types';
import { SCHEDULE_DATA, CLASSES, COLOR_PALETTE } from '../constants';
import { 
  Calendar, User, BookOpen, Users, GraduationCap, ClipboardList, 
  ChevronDown, Search, Plus, Save, Trash2, Edit2, CheckCircle2, AlertTriangle, FileText, Download,
  Filter, FileSpreadsheet, X
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ClassTeacherScheduleProps {
  teacherData: TeacherData[];
  scheduleMap: Record<string, string>;
  currentUser: string;
  role: UserRole;
  appSettings: AppSettings;
  calendarEvents: CalendarEvent[];
  teacherLeaves: TeacherLeave[];
  students: Student[];
  
  // Journal Props
  teachingMaterials: TeachingMaterial[];
  onAddMaterial?: (m: TeachingMaterial) => void;
  onEditMaterial?: (m: TeachingMaterial) => void;
  onDeleteMaterial?: (id: string) => void;

  teachingJournals: TeachingJournal[];
  onAddJournal?: (j: TeachingJournal) => void;
  onEditJournal?: (j: TeachingJournal) => void;
  onDeleteJournal?: (id: string) => void;

  // Grades Props
  studentGrades: GradeRecord[];
  onUpdateGrade?: (g: GradeRecord) => void;

  // Homeroom Props
  homeroomRecords: HomeroomRecord[];
  onAddHomeroomRecord?: (r: HomeroomRecord) => void;
  onEditHomeroomRecord?: (r: HomeroomRecord) => void;
  onDeleteHomeroomRecord?: (id: string) => void;

  initialTab?: string;
}

const ClassTeacherSchedule: React.FC<ClassTeacherScheduleProps> = (props) => {
  const {
    teacherData, scheduleMap, currentUser, role, appSettings,
    studentGrades, onUpdateGrade, students
  } = props;

  // Tabs
  const [activeTab, setActiveTab] = useState(props.initialTab || 'CLASS');

  // Class Schedule State
  const [selectedClass, setSelectedClass] = useState(CLASSES[0]);

  // Teacher Schedule State
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Grades State
  const [gradeClass, setGradeClass] = useState(CLASSES[0]);
  const [gradeSubject, setGradeSubject] = useState('');
  
  // Derived
  const gradeYear = appSettings.academicYear;
  const gradeSemester = appSettings.semester;

  // Initial Logic
  useEffect(() => {
    if (role === 'TEACHER') {
        const t = teacherData.find(t => t.name === currentUser);
        if (t) {
            setSelectedTeacherId(String(t.id));
            setGradeSubject(t.subject);
        }
    } else if (role === 'STUDENT') {
        // If student, lock class view to their class
        setSelectedClass(currentUser); 
    }
  }, [role, currentUser, teacherData]);

  // Handle Tab Switch
  useEffect(() => {
    if (props.initialTab) setActiveTab(props.initialTab);
  }, [props.initialTab]);

  // --- LOGIC: GRADE CHANGE ---
  const handleGradeChange = (studentId: string, field: string, value: string, chapterIdx?: number) => {
        if (!onUpdateGrade) return;
        const recordId = `${studentId}_${gradeSubject}_${gradeSemester}`;
        
        const existingRecord = studentGrades.find(r => r.id === recordId) || { 
            id: recordId, 
            studentId, 
            teacherName: currentUser, 
            subject: gradeSubject, 
            className: gradeClass, 
            semester: gradeSemester, 
            academicYear: gradeYear, 
            chapters: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } 
        };
        
        const numVal = parseFloat(value); 
        const newRecord = { ...existingRecord };
        // Ensure chapters structure exists
        if (!newRecord.chapters) newRecord.chapters = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} };
        
        if (chapterIdx) {
            const chIdx = chapterIdx as 1|2|3|4|5; 
            const ch = { ...(newRecord.chapters[chIdx] || {}) };
            
            // @ts-ignore
            ch[field] = isNaN(numVal) ? undefined : numVal;
            
            // Recalculate Average
            const scoreFields = [ch.f1, ch.f2, ch.f3, ch.f4, ch.f5]
                .filter((n) => n !== undefined && n !== null && typeof n === 'number' && !isNaN(n)) as number[];
            
            if (scoreFields.length > 0) {
               const sumScores = scoreFields.reduce((a, b) => a + b, 0);
               ch.avg = parseFloat((sumScores / scoreFields.length).toFixed(2));
            } else if (ch.sum !== undefined && ch.sum !== null && !isNaN(ch.sum)) {
               ch.avg = ch.sum;
            } else {
               ch.avg = undefined;
            }

            newRecord.chapters[chIdx] = ch;
        } else { 
            // @ts-ignore
            (newRecord as any)[field] = isNaN(numVal) ? undefined : numVal; 
        }
        
        const chapterAvgs = Object.values(newRecord.chapters).map((c: ChapterGrade) => c.avg).filter(n => n !== undefined && n !== null) as number[];
        const sts = newRecord.sts || 0; 
        const sas = newRecord.sas || 0;
        
        if (chapterAvgs.length > 0 || sts > 0 || sas > 0) { 
            const avgRR = chapterAvgs.length > 0 ? chapterAvgs.reduce((a, b) => a + b, 0) / chapterAvgs.length : 0;
            newRecord.finalGrade = parseFloat(((avgRR + sts + sas) / 3).toFixed(2)); 
        }
        
        onUpdateGrade(newRecord);
  };

  // --- RENDER HELPERS ---
  const getTeacherNameByCode = (code: string) => teacherData.find(t => t.code === code)?.name || code;
  
  // Render Class Schedule
  const renderClassSchedule = () => {
    return (
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <span className="font-bold text-gray-700">Pilih Kelas:</span>
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5"
                  disabled={role === 'STUDENT'}
                >
                   {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <button onClick={() => window.print()} className="text-gray-500 hover:text-gray-700"><Download size={18} /></button>
          </div>
          <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100">
                   <tr>
                      <th className="px-4 py-3 text-left">Hari</th>
                      <th className="px-4 py-3 text-center">Jam</th>
                      <th className="px-4 py-3 text-center">Waktu</th>
                      <th className="px-4 py-3 text-left">Mata Pelajaran & Guru</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                   {SCHEDULE_DATA.map(day => (
                      <React.Fragment key={day.day}>
                         {day.rows.map((row, idx) => {
                            const key = `${day.day}-${row.jam}-${selectedClass}`;
                            const code = scheduleMap[key];
                            const teacherName = code ? getTeacherNameByCode(code) : '';
                            
                            // Rowspan for Day
                            const isFirstRow = idx === 0;

                            return (
                               <tr key={`${day.day}-${row.jam}`} className={row.activity ? 'bg-orange-50' : 'hover:bg-gray-50'}>
                                  {isFirstRow && (
                                     <td rowSpan={day.rows.length} className="px-4 py-3 align-top font-bold text-gray-700 border-r border-gray-200 bg-white">
                                        {day.day}
                                     </td>
                                  )}
                                  <td className="px-4 py-2 text-center text-gray-500 font-medium">{row.jam}</td>
                                  <td className="px-4 py-2 text-center text-gray-500 font-mono text-xs">{row.waktu}</td>
                                  <td className="px-4 py-2 font-medium text-gray-800">
                                     {row.activity ? (
                                        <span className="text-orange-700 italic">{row.activity}</span>
                                     ) : code ? (
                                        <div>
                                           <span className="inline-block px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-xs font-bold mr-2">{code}</span>
                                           {teacherName}
                                        </div>
                                     ) : <span className="text-gray-400">-</span>}
                                  </td>
                               </tr>
                            );
                         })}
                         <tr className="bg-gray-200 h-1"><td colSpan={4}></td></tr>
                      </React.Fragment>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  // Render Teacher Schedule
  const renderTeacherSchedule = () => {
     const selectedTeacher = teacherData.find(t => String(t.id) === selectedTeacherId);
     const teacherCode = selectedTeacher?.code;

     return (
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <span className="font-bold text-gray-700">Pilih Guru:</span>
                <select 
                  value={selectedTeacherId} 
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5"
                  disabled={role === 'TEACHER'}
                >
                   <option value="">-- Pilih Guru --</option>
                   {teacherData.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
             </div>
          </div>
          
          {selectedTeacher ? (
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                   <thead className="bg-gray-100">
                      <tr>
                         <th className="px-4 py-3 text-left">Hari</th>
                         <th className="px-4 py-3 text-center">Jam</th>
                         <th className="px-4 py-3 text-center">Waktu</th>
                         <th className="px-4 py-3 text-left">Kelas yang Diajar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-200">
                      {SCHEDULE_DATA.map(day => (
                         <React.Fragment key={day.day}>
                            {day.rows.map((row) => {
                               // Find classes taught by teacher at this time
                               const classesTaught: string[] = [];
                               CLASSES.forEach(cls => {
                                  const key = `${day.day}-${row.jam}-${cls}`;
                                  if (scheduleMap[key] === teacherCode) {
                                     classesTaught.push(cls);
                                  }
                               });

                               if (classesTaught.length === 0 && !row.activity) return null;

                               return (
                                  <tr key={`${day.day}-${row.jam}`} className="hover:bg-gray-50">
                                     <td className="px-4 py-2 font-medium text-gray-700">{day.day}</td>
                                     <td className="px-4 py-2 text-center text-gray-500">{row.jam}</td>
                                     <td className="px-4 py-2 text-center text-gray-500 font-mono text-xs">{row.waktu}</td>
                                     <td className="px-4 py-2 font-bold text-indigo-700">
                                        {row.activity ? (
                                           <span className="text-gray-400 font-normal italic">{row.activity}</span>
                                        ) : classesTaught.join(', ')}
                                     </td>
                                  </tr>
                               );
                            })}
                         </React.Fragment>
                      ))}
                   </tbody>
                </table>
             </div>
          ) : (
             <div className="p-8 text-center text-gray-500">Silakan pilih guru untuk melihat jadwal.</div>
          )}
       </div>
     );
  };

  // Render Grades View
  const renderGrades = () => {
    // Filter students by class
    const classStudents = students.filter(s => s.className === gradeClass);
    
    return (
       <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Kelas</label>
                <select 
                  value={gradeClass} 
                  onChange={(e) => setGradeClass(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
                >
                   {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Mata Pelajaran</label>
                {role === 'ADMIN' ? (
                   <select 
                     value={gradeSubject} 
                     onChange={(e) => setGradeSubject(e.target.value)}
                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48"
                   >
                     <option value="">-- Pilih Mapel --</option>
                     {Array.from(new Set(teacherData.map(t => t.subject))).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                ) : (
                   <input 
                     type="text" 
                     value={gradeSubject} 
                     readOnly 
                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 w-48"
                   />
                )}
             </div>
             <div className="flex-1 text-right">
                <button 
                  onClick={() => alert("Simpan berhasil!")} 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                >
                  <Save size={16} className="inline mr-1"/> Simpan Nilai
                </button>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100">
                   <tr>
                      <th className="px-3 py-2 text-left sticky left-0 bg-gray-100 z-10 w-10">No</th>
                      <th className="px-3 py-2 text-left sticky left-10 bg-gray-100 z-10 w-48">Nama Siswa</th>
                      {[1,2,3,4,5].map(i => (
                         <th key={i} className="px-1 py-1 text-center border-l border-gray-200 bg-blue-50" colSpan={2}>
                           BAB {i}
                         </th>
                      ))}
                      <th className="px-2 py-2 text-center border-l border-gray-200 bg-yellow-50 w-12">STS</th>
                      <th className="px-2 py-2 text-center border-l border-gray-200 bg-yellow-50 w-12">SAS</th>
                      <th className="px-2 py-2 text-center border-l border-gray-200 bg-green-50 w-16">Nilai Akhir</th>
                   </tr>
                   <tr>
                      <th className="sticky left-0 bg-gray-100 z-10"></th>
                      <th className="sticky left-10 bg-gray-100 z-10"></th>
                      {[1,2,3,4,5].map(i => (
                         <React.Fragment key={i}>
                           <th className="px-1 py-1 text-center text-[10px] bg-blue-50/50 border-l border-gray-200">Formatif</th>
                           <th className="px-1 py-1 text-center text-[10px] bg-blue-50/50">Avg</th>
                         </React.Fragment>
                      ))}
                      <th className="bg-yellow-50/50 border-l border-gray-200"></th>
                      <th className="bg-yellow-50/50 border-l border-gray-200"></th>
                      <th className="bg-green-50/50 border-l border-gray-200"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                   {classStudents.map((student, idx) => {
                      const recordId = `${student.id}_${gradeSubject}_${gradeSemester}`;
                      const record = studentGrades.find(r => r.id === recordId) || { chapters: {1:{},2:{},3:{},4:{},5:{}} } as GradeRecord;
                      
                      return (
                         <tr key={student.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 sticky left-0 bg-white">{idx+1}</td>
                            <td className="px-3 py-2 sticky left-10 bg-white font-medium">{student.name}</td>
                            {[1,2,3,4,5].map(i => {
                               // @ts-ignore
                               const ch = record.chapters?.[i] || {};
                               return (
                                 <React.Fragment key={i}>
                                    <td className="p-1 border-l border-gray-200">
                                       <input 
                                         type="number" 
                                         className="w-12 text-center border rounded p-1 text-xs"
                                         value={ch.sum || ''}
                                         onChange={(e) => handleGradeChange(student.id, 'sum', e.target.value, i)}
                                       />
                                    </td>
                                    <td className="p-1 text-center bg-gray-50 text-xs font-bold text-blue-700">
                                       {ch.avg || '-'}
                                    </td>
                                 </React.Fragment>
                               );
                            })}
                            <td className="p-1 border-l border-gray-200">
                               <input 
                                 type="number" 
                                 className="w-12 text-center border rounded p-1 text-xs"
                                 value={record.sts || ''}
                                 onChange={(e) => handleGradeChange(student.id, 'sts', e.target.value)}
                               />
                            </td>
                            <td className="p-1 border-l border-gray-200">
                               <input 
                                 type="number" 
                                 className="w-12 text-center border rounded p-1 text-xs"
                                 value={record.sas || ''}
                                 onChange={(e) => handleGradeChange(student.id, 'sas', e.target.value)}
                               />
                            </td>
                            <td className="p-1 border-l border-gray-200 text-center font-bold text-green-700">
                               {record.finalGrade || '-'}
                            </td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>
    );
  };

  return (
    <div className="space-y-6">
       {/* Tab Navigation */}
       <div className="flex overflow-x-auto space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          {[
            { id: 'CLASS', label: 'Jadwal Kelas', icon: <Calendar size={16}/> },
            { id: 'TEACHER', label: 'Jadwal Guru', icon: <User size={16}/> },
            { id: 'JOURNAL', label: 'Jurnal Mengajar', icon: <BookOpen size={16}/> },
            { id: 'MONITORING', label: 'Monitoring', icon: <Users size={16}/> },
            { id: 'GRADES', label: 'Nilai Siswa', icon: <GraduationCap size={16}/> },
            { id: 'HOMEROOM', label: 'Wali Kelas', icon: <ClipboardList size={16}/> },
          ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
               `}
             >
                {tab.icon} {tab.label}
             </button>
          ))}
       </div>

       {/* Tab Content */}
       <div className="animate-fade-in">
          {activeTab === 'CLASS' && renderClassSchedule()}
          {activeTab === 'TEACHER' && renderTeacherSchedule()}
          {activeTab === 'GRADES' && renderGrades()}
          {/* Placeholders for other tabs for brevity, can be expanded */}
          {activeTab === 'JOURNAL' && <div className="p-8 text-center bg-white rounded-xl border border-gray-200">Fitur Jurnal Mengajar (Dalam Pengembangan)</div>}
          {activeTab === 'MONITORING' && <div className="p-8 text-center bg-white rounded-xl border border-gray-200">Fitur Monitoring Absensi (Dalam Pengembangan)</div>}
          {activeTab === 'HOMEROOM' && <div className="p-8 text-center bg-white rounded-xl border border-gray-200">Fitur Catatan Wali Kelas (Dalam Pengembangan)</div>}
       </div>
    </div>
  );
};

export default ClassTeacherSchedule;