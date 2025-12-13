import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Download, PenTool, BookOpen, Plus, X, List, Edit2, Filter, ChevronDown,
  User, Users, Calendar, Layout, Search, GraduationCap, ClipboardList, Trash2, FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { 
  TeacherData, AppSettings, CalendarEvent, TeacherLeave, 
  TeachingMaterial, TeachingJournal, Student, UserRole, GradeRecord, HomeroomRecord, ChapterGrade
} from '../types';
import { CLASSES, SCHEDULE_DATA } from '../constants';

interface ClassTeacherScheduleProps {
  teacherData: TeacherData[];
  scheduleMap: Record<string, string>;
  currentUser: string;
  role: UserRole;
  appSettings: AppSettings;
  calendarEvents?: CalendarEvent[];
  teacherLeaves?: TeacherLeave[];
  students?: Student[];
  teachingMaterials?: TeachingMaterial[];
  onAddMaterial?: (material: TeachingMaterial) => void;
  onEditMaterial?: (material: TeachingMaterial) => void;
  onDeleteMaterial?: (id: string) => void;
  teachingJournals?: TeachingJournal[];
  onAddJournal?: (journal: TeachingJournal) => void;
  onEditJournal?: (journal: TeachingJournal) => void;
  onDeleteJournal?: (id: string) => void;
  studentGrades?: GradeRecord[];
  onUpdateGrade?: (grade: GradeRecord) => void;
  homeroomRecords?: HomeroomRecord[];
  onAddHomeroomRecord?: (record: HomeroomRecord) => void;
  onEditHomeroomRecord?: (record: HomeroomRecord) => void;
  onDeleteHomeroomRecord?: (id: string) => void;
  initialTab?: string;
}

type TabMode = 'CLASS' | 'TEACHER' | 'JOURNAL' | 'MONITORING' | 'GRADES' | 'HOMEROOM';

const ClassTeacherSchedule: React.FC<ClassTeacherScheduleProps> = ({ 
  teacherData, 
  scheduleMap, 
  currentUser, 
  role,
  appSettings,
  students = [],
  teachingMaterials = [],
  onAddMaterial,
  onEditMaterial,
  onDeleteMaterial,
  teachingJournals = [],
  onAddJournal,
  onEditJournal,
  onDeleteJournal,
  studentGrades = [],
  onUpdateGrade,
  homeroomRecords = [],
  onAddHomeroomRecord,
  onEditHomeroomRecord,
  onDeleteHomeroomRecord,
  initialTab = 'CLASS'
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>(initialTab as TabMode);

  useEffect(() => {
    if(initialTab) setActiveTab(initialTab as TabMode);
  }, [initialTab]);

  const [selectedClass, setSelectedClass] = useState<string>(() => {
    if (role === 'STUDENT' && currentUser && CLASSES.includes(currentUser)) {
      return currentUser;
    }
    return CLASSES[0];
  });

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => {
    if (role === 'TEACHER') {
        const t = teacherData.find(t => t.name === currentUser);
        return t ? String(t.id) : "";
    }
    return "";
  });

  // Journal States
  const [journalMode, setJournalMode] = useState<'INPUT_MATERI' | 'INPUT_JURNAL'>('INPUT_JURNAL');
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [journalFilterClass, setJournalFilterClass] = useState<string>(''); 
  const [journalDateFrom, setJournalDateFrom] = useState<string>('');
  const [journalDateTo, setJournalDateTo] = useState<string>('');
  const [printDate, setPrintDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Monitoring States
  const [monitoringClass, setMonitoringClass] = useState<string>(CLASSES[0]);
  const [monitoringSemester, setMonitoringSemester] = useState<string>(appSettings.semester);
  const [monitoringPrintDate, setMonitoringPrintDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Grade States
  const [gradeClass, setGradeClass] = useState<string>(CLASSES[0]);
  const [gradeSubject, setGradeSubject] = useState<string>('');
  const [gradeYear, setGradeYear] = useState<string>(appSettings.academicYear);
  const [gradeSemester, setGradeSemester] = useState<string>(appSettings.semester);
  const [gradesPrintDate, setGradesPrintDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Homeroom States
  const [homeroomForm, setHomeroomForm] = useState<{
    date: string;
    className: string;
    studentIds: string[];
    violationType: string;
    solution: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    className: CLASSES[0],
    studentIds: [],
    violationType: '',
    solution: '',
    notes: ''
  });
  const [editingHomeroomId, setEditingHomeroomId] = useState<string | null>(null);
  const [isHomeroomDownloadOpen, setIsHomeroomDownloadOpen] = useState(false);
  const homeroomDownloadRef = useRef<HTMLDivElement>(null);
  // Homeroom Filter & Print States
  const [homeroomDateFrom, setHomeroomDateFrom] = useState<string>('');
  const [homeroomDateTo, setHomeroomDateTo] = useState<string>('');
  const [homeroomPrintDate, setHomeroomPrintDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // UI States
  const [isMonitoringDownloadOpen, setIsMonitoringDownloadOpen] = useState(false);
  const monitoringDownloadRef = useRef<HTMLDivElement>(null);
  const [isJournalDownloadOpen, setIsJournalDownloadOpen] = useState(false);
  const journalDownloadRef = useRef<HTMLDivElement>(null);
  const [isGradesDownloadOpen, setIsGradesDownloadOpen] = useState(false);
  const gradesDownloadRef = useRef<HTMLDivElement>(null);

  // Close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (monitoringDownloadRef.current && !monitoringDownloadRef.current.contains(event.target as Node)) setIsMonitoringDownloadOpen(false);
        if (journalDownloadRef.current && !journalDownloadRef.current.contains(event.target as Node)) setIsJournalDownloadOpen(false);
        if (gradesDownloadRef.current && !gradesDownloadRef.current.contains(event.target as Node)) setIsGradesDownloadOpen(false);
        if (homeroomDownloadRef.current && !homeroomDownloadRef.current.contains(event.target as Node)) setIsHomeroomDownloadOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const teacherNames = useMemo(() => Array.from(new Set(teacherData.map(t => t.name))).sort(), [teacherData]);

  const mySubjects = useMemo(() => {
    if (!currentUser) return [];
    const entries = teacherData.filter(t => t.name === currentUser);
    return Array.from(new Set(entries.map(t => t.subject)));
  }, [teacherData, currentUser]);

  useEffect(() => {
    if(mySubjects.length > 0 && !gradeSubject) setGradeSubject(mySubjects[0]);
  }, [mySubjects, gradeSubject]);

  const codeToDataMap = useMemo(() => {
    const map: Record<string, { subject: string, name: string }> = {};
    teacherData.forEach(t => map[t.code] = { subject: t.subject, name: t.name });
    return map;
  }, [teacherData]);

  const [matForm, setMatForm] = useState<{semester: '1' | '2'; classes: string[]; chapter: string; subChapters: string[]; subject: string;}>({
    semester: '2', classes: [], chapter: '', subChapters: [''], subject: ''
  });

  const [jourForm, setJourForm] = useState<{date: string; semester: '1' | '2'; jamKe: string; className: string; subject: string; chapter: string; subChapter: string; activity: string; notes: string; studentAttendance: Record<string, 'H' | 'S' | 'I' | 'A' | 'DL'>;}>({
    date: new Date().toISOString().split('T')[0], semester: '2', jamKe: '', className: '', subject: '', chapter: '', subChapter: '', activity: '', notes: '', studentAttendance: {}
  });

  useEffect(() => {
    if (mySubjects.length === 1) {
       if (journalMode === 'INPUT_MATERI' && !matForm.subject) setMatForm(prev => ({ ...prev, subject: mySubjects[0] }));
       if (journalMode === 'INPUT_JURNAL' && !jourForm.subject) setJourForm(prev => ({ ...prev, subject: mySubjects[0] }));
    }
  }, [journalMode, mySubjects, matForm.subject, jourForm.subject]);

  const getDayNameFromDate = (dateString: string) => {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU'];
    const d = new Date(dateString);
    return days[d.getDay()];
  };

  // Helper for adding signatures to PDF
  const addSignatureToPDF = (doc: jsPDF, dateStr: string, roleLabel: string = "Guru Mata Pelajaran") => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Check if enough space is available, else add page
    if (finalY + 40 > pageHeight) { 
        doc.addPage(); 
        finalY = 20; 
    }
    
    const rightMargin = pageWidth - 60;
    const leftMargin = 20;

    doc.setFontSize(10);
    // Date
    doc.text(`Mojokerto, ${new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}`, rightMargin, finalY, { align: 'center' });
    
    // Titles
    doc.text(`Mengetahui,`, leftMargin, finalY + 5);
    doc.text(`Kepala Sekolah`, leftMargin, finalY + 10);
    doc.text(roleLabel, rightMargin, finalY + 10, { align: 'center' });
    
    // Names
    const currentTeacherData = teacherData.find(t => t.name === currentUser);
    const teacherNIP = currentTeacherData?.nip || '-';
    
    doc.text(`${appSettings.headmaster || '...................'}`, leftMargin, finalY + 35);
    doc.text(`NIP. ${appSettings.headmasterNip || '-' }`, leftMargin, finalY + 40);
    
    doc.text(`${currentUser}`, rightMargin, finalY + 35, { align: 'center' });
    doc.text(`NIP. ${teacherNIP}`, rightMargin, finalY + 40, { align: 'center' });
  };

  const downloadClassSchedulePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(14); doc.text(`Jadwal Pelajaran Kelas ${selectedClass}`, 14, 15);
    doc.setFontSize(10); doc.text(`SMPN 3 Pacet - Semester ${appSettings.semester} ${appSettings.academicYear}`, 14, 21);
    let finalY = 25;
    SCHEDULE_DATA.forEach(daySchedule => {
      if (daySchedule.rows.length === 0) return;
      if (finalY > 270) { doc.addPage(); finalY = 15; }
      doc.setFontSize(11); doc.setTextColor(79, 70, 229); doc.text(`HARI: ${daySchedule.day}`, 14, finalY + 5);
      const tableBody = daySchedule.rows.map(row => {
        if (row.activity) return [row.jam, row.waktu, { content: row.activity, colSpan: 3, styles: { fillColor: [255, 237, 213], halign: 'center', textColor: [154, 52, 18] } }];
        const key = `${daySchedule.day}-${row.jam}-${selectedClass}`;
        const code = scheduleMap[key];
        const info = code ? codeToDataMap[String(code)] : null;
        return [row.jam, row.waktu, code || '-', info?.subject || '-', info?.name || '-'];
      });
      autoTable(doc, { startY: finalY + 8, head: [['Jam', 'Waktu', 'Kode', 'Mata Pelajaran', 'Guru']], body: tableBody as any, theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 }, columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 25 }, 2: { cellWidth: 20 }, 3: { cellWidth: 50 } } });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    });
    doc.save(`Jadwal_Kelas_${selectedClass.replace(' ', '_')}.pdf`);
  };

  const downloadTeacherSchedulePDF = () => {
    if (!selectedTeacherId) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    // Cari nama guru berdasarkan ID
    const teacherName = teacherData.find(t => String(t.id) === selectedTeacherId)?.name || selectedTeacherId;

    doc.setFontSize(14); doc.text(`Jadwal Mengajar: ${teacherName}`, 14, 15);
    doc.setFontSize(10); doc.text(`SMPN 3 Pacet - Semester ${appSettings.semester} ${appSettings.academicYear}`, 14, 21);
    let counter = 1; const tableBody: any[] = [];
    const myCodes = teacherData.filter(t => String(t.id) === selectedTeacherId).map(t => t.code);
    SCHEDULE_DATA.forEach(day => {
       day.rows.forEach(row => {
          if (row.activity) return;
          CLASSES.forEach(cls => {
             const key = `${day.day}-${row.jam}-${cls}`;
             const scheduledCode = scheduleMap[key];
             if (scheduledCode && myCodes.includes(scheduledCode)) {
                const info = codeToDataMap[String(scheduledCode)];
                tableBody.push([counter++, row.jam, row.waktu, day.day, cls, scheduledCode, info?.subject || '-']);
             }
          });
       });
    });
    autoTable(doc, { startY: 25, head: [['No', 'Jam Ke', 'Waktu', 'Hari', 'Kelas', 'Kode', 'Mata Pelajaran']], body: tableBody, theme: 'grid', styles: { fontSize: 9 } });
    doc.save(`Jadwal_Guru_${teacherName.replace(' ', '_')}.pdf`);
  };

  const myTeachingSlots = useMemo(() => {
    if (!currentUser || role !== 'TEACHER') return [];
    const myCodes = teacherData.filter(t => t.name === currentUser).map(t => t.code);
    const slots: string[] = [];
    SCHEDULE_DATA.forEach(day => {
      day.rows.forEach(row => {
        if (row.activity) return;
        CLASSES.forEach(cls => {
          const key = `${day.day}-${row.jam}-${cls}`;
          const code = scheduleMap[key];
          if (code && myCodes.includes(code)) slots.push(`${day.day}|${row.jam}|${cls}`);
        });
      });
    });
    return slots;
  }, [currentUser, role, teacherData, scheduleMap]);

  const selectedDayName = useMemo(() => getDayNameFromDate(jourForm.date), [jourForm.date]);
  const dailyTeachingSlots = useMemo(() => myTeachingSlots.filter(slot => slot.startsWith(selectedDayName + '|')), [myTeachingSlots, selectedDayName]);

  useEffect(() => {
    if (jourForm.jamKe) {
       const firstSlot = jourForm.jamKe.split(',')[0];
       const parts = firstSlot.split('|');
       if (parts.length >= 3) setJourForm(prev => ({ ...prev, className: parts[2] }));
    }
  }, [jourForm.jamKe]);

  useEffect(() => {
    // Populate attendance when class changes or students change
    if (jourForm.className && students.length > 0) {
      if (!editingJournalId) {
          const classStudents = students.filter(s => s.className === jourForm.className);
          // Only update if studentAttendance is empty to avoid overwriting user progress
          setJourForm(prev => {
              if (Object.keys(prev.studentAttendance).length === 0) {
                  const newAttendance: any = {};
                  classStudents.forEach(s => { newAttendance[s.id] = 'H'; });
                  return { ...prev, studentAttendance: newAttendance };
              }
              return prev;
          });
      }
    }
  }, [jourForm.className, students, editingJournalId]);

  // When class changes manually, reset attendance
  useEffect(() => {
      if (!editingJournalId && jourForm.className) {
          const classStudents = students.filter(s => s.className === jourForm.className);
          const newAttendance: any = {};
          classStudents.forEach(s => { newAttendance[s.id] = 'H'; });
          setJourForm(prev => ({ ...prev, studentAttendance: newAttendance }));
      }
  }, [jourForm.className, students]);


  const handleMatClassToggle = (cls: string) => setMatForm(prev => ({ ...prev, classes: prev.classes.includes(cls) ? prev.classes.filter(c => c !== cls) : [...prev.classes, cls] }));
  const handleSubChapterChange = (index: number, val: string) => { const newSubs = [...matForm.subChapters]; newSubs[index] = val; setMatForm(prev => ({ ...prev, subChapters: newSubs })); };
  const addSubChapter = () => setMatForm(prev => ({ ...prev, subChapters: [...prev.subChapters, ''] }));
  const removeSubChapter = (index: number) => { if (matForm.subChapters.length === 1) return; setMatForm(prev => ({ ...prev, subChapters: prev.subChapters.filter((_, i) => i !== index) })); };
  
  const handleEditMaterialClick = (material: TeachingMaterial) => {
    setEditingMaterialId(material.id);
    setMatForm({
        semester: material.semester,
        classes: material.classes,
        chapter: material.chapter,
        subChapters: material.subChapters.length > 0 ? material.subChapters : [''],
        subject: material.subject || ''
    });
  };

  const saveMaterial = (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser || !onAddMaterial) return; if (matForm.classes.length === 0) { alert("Pilih minimal satu kelas!"); return; }
    
    const materialData: TeachingMaterial = { 
        id: editingMaterialId || Date.now().toString(), 
        teacherName: currentUser, 
        subject: matForm.subject, 
        semester: matForm.semester, 
        classes: matForm.classes, 
        chapter: matForm.chapter, 
        subChapters: matForm.subChapters.filter(s => s.trim() !== '') 
    };

    if (editingMaterialId && onEditMaterial) {
        onEditMaterial(materialData);
        setEditingMaterialId(null);
        alert("Materi berhasil diperbarui!");
    } else {
        onAddMaterial(materialData);
        alert("Materi berhasil ditambahkan!");
    }
    setMatForm({ semester: '2', classes: [], chapter: '', subChapters: [''], subject: matForm.subject });
  };

  const availableChapters = useMemo(() => {
    if (!currentUser) return [];
    return teachingMaterials.filter(m => m.teacherName === currentUser && m.semester === jourForm.semester && m.classes.includes(jourForm.className) && (!jourForm.subject || m.subject === jourForm.subject));
  }, [teachingMaterials, currentUser, jourForm.semester, jourForm.className, jourForm.subject]);

  const availableSubChapters = useMemo(() => { const selectedMat = availableChapters.find(m => m.chapter === jourForm.chapter); return selectedMat ? selectedMat.subChapters : []; }, [availableChapters, jourForm.chapter]);

  const saveJournal = (e: React.FormEvent) => {
    e.preventDefault(); if (!currentUser) return;
    const journalData: TeachingJournal = { id: editingJournalId || Date.now().toString(), teacherName: currentUser, ...jourForm };
    if (editingJournalId && onEditJournal) { onEditJournal(journalData); setEditingJournalId(null); alert("Perubahan jurnal berhasil disimpan!"); } else if (onAddJournal) { onAddJournal(journalData); alert("Jurnal berhasil disimpan!"); }
    setJourForm({ date: new Date().toISOString().split('T')[0], semester: '2', jamKe: '', className: '', subject: jourForm.subject, chapter: '', subChapter: '', activity: '', notes: '', studentAttendance: {} });
  };

  const handleEditJournalClick = (journal: TeachingJournal) => {
    setEditingJournalId(journal.id);
    setJourForm({ 
        date: journal.date, 
        semester: journal.semester, 
        jamKe: journal.jamKe, 
        className: journal.className, 
        subject: journal.subject || '', 
        chapter: journal.chapter, 
        subChapter: journal.subChapter, 
        activity: journal.activity, 
        notes: journal.notes, 
        studentAttendance: journal.studentAttendance || {} 
    });
    setJournalMode('INPUT_JURNAL');
  };

  const handleCancelEdit = () => { setEditingJournalId(null); setJourForm({ date: new Date().toISOString().split('T')[0], semester: '2', jamKe: '', className: '', subject: jourForm.subject, chapter: '', subChapter: '', activity: '', notes: '', studentAttendance: {} }); setJournalMode('INPUT_JURNAL'); };
  const myJournals = useMemo(() => { let journals = teachingJournals.filter(j => j.teacherName === currentUser); if (journalFilterClass) { journals = journals.filter(j => j.className === journalFilterClass); } if (journalDateFrom) { journals = journals.filter(j => j.date >= journalDateFrom); } if (journalDateTo) { journals = journals.filter(j => j.date <= journalDateTo); } return journals.sort((a, b) => b.date.localeCompare(a.date)); }, [teachingJournals, currentUser, journalFilterClass, journalDateFrom, journalDateTo]);
  
  const handleJamKeSelection = (slotVal: string) => {
      setJourForm(prev => {
          let currentSelected = prev.jamKe ? prev.jamKe.split(',') : [];
          if (currentSelected.includes(slotVal)) currentSelected = currentSelected.filter(s => s !== slotVal);
          else {
              if (currentSelected.length > 0 && currentSelected[0]) {
                 const existingClass = currentSelected[0].split('|')[2];
                 if (existingClass !== slotVal.split('|')[2]) { alert("Tidak dapat memilih jam mengajar dari kelas yang berbeda."); return prev; }
              }
              currentSelected.push(slotVal);
          }
          let newSubject = prev.subject;
          if (currentSelected.length > 0) {
             const parts = currentSelected[0].split('|');
             if(parts.length >= 3) {
                 const code = scheduleMap[`${parts[0]}-${parts[1]}-${parts[2]}`];
                 if (code && codeToDataMap[code]) newSubject = codeToDataMap[code].subject;
             }
          }
          return { ...prev, jamKe: currentSelected.join(','), subject: newSubject };
      });
  };

  const handleJournalSubChapterToggle = (sub: string) => { setJourForm(prev => { let current = prev.subChapter ? prev.subChapter.split(',') : []; current = current.map(s => s.trim()).filter(s => s !== ''); if (current.includes(sub)) current = current.filter(s => s !== sub); else current.push(sub); return { ...prev, subChapter: current.join(',') }; }); };

  const downloadJournalHistoryPDF = (format: 'a4' | 'f4') => {
    const doc = new jsPDF('l', 'mm', format === 'a4' ? 'a4' : [330, 215] as any);
    doc.setFontSize(14); doc.text(`Jurnal Mengajar Guru`, 14, 15);
    doc.setFontSize(10); doc.text(`Nama Guru: ${currentUser}`, 14, 21);
    doc.text(`Semester ${jourForm.semester} Tahun Ajaran ${appSettings?.academicYear || ''}`, 14, 26);
    
    // Updated Columns: No, Tanggal, Kelas, Mapel, Bab, Sub Bab, Kegiatan, Catatan, Absensi
    const tableBody = myJournals.map((j, idx) => {
        // Format Absensi string: "Budi(S), Ani(I)"
        const absList: string[] = [];
        if (j.studentAttendance) {
            Object.entries(j.studentAttendance).forEach(([sid, status]) => { 
                if (status !== 'H') { 
                    const sName = students.find(s => s.id === sid)?.name || 'Siswa';
                    const shortName = sName.split(' ')[0]; // Use short name to save space 
                    absList.push(`${shortName}(${status})`); 
                }
            });
        }
        return [
            idx + 1, 
            j.date, 
            j.className, 
            j.subject || '-', 
            j.chapter, 
            j.subChapter, 
            j.activity, 
            j.notes || '-', 
            absList.length > 0 ? absList.join(', ') : 'Nihil'
        ];
    });

    autoTable(doc, { 
        startY: 30, 
        head: [['No', 'Tanggal', 'Kelas', 'Mapel', 'Bab', 'Sub Bab', 'Kegiatan', 'Catatan', 'Absensi (S/I/A)']], 
        body: tableBody as any, 
        theme: 'grid', 
        styles: { fontSize: 8 }, 
        columnStyles: { 
            0: { cellWidth: 8 }, 
            1: { cellWidth: 20 }, 
            2: { cellWidth: 15 }, 
            3: { cellWidth: 25 },
            7: { cellWidth: 25 }, // Catatan
            8: { cellWidth: 35 } // Absensi
        } 
    });

    addSignatureToPDF(doc, printDate, "Guru Mata Pelajaran");

    doc.save(`Jurnal_Mengajar_${currentUser?.replace(' ', '_')}.pdf`); setIsJournalDownloadOpen(false);
  };

  const handleHomeroomSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!onAddHomeroomRecord || !onEditHomeroomRecord || !currentUser) return;
    if (homeroomForm.studentIds.length === 0) { alert("Pilih minimal satu siswa!"); return; }
    if (editingHomeroomId) {
        onEditHomeroomRecord({ id: editingHomeroomId, teacherName: currentUser, date: homeroomForm.date, className: homeroomForm.className, studentId: homeroomForm.studentIds[0], violationType: homeroomForm.violationType, solution: homeroomForm.solution, notes: homeroomForm.notes });
        setEditingHomeroomId(null);
    } else {
        homeroomForm.studentIds.forEach(studentId => { onAddHomeroomRecord({ id: Date.now().toString() + Math.random().toString(36).substring(2, 5), teacherName: currentUser, date: homeroomForm.date, className: homeroomForm.className, studentId: studentId, violationType: homeroomForm.violationType, solution: homeroomForm.solution, notes: homeroomForm.notes }); });
    }
    setHomeroomForm({ date: new Date().toISOString().split('T')[0], className: CLASSES[0], studentIds: [], violationType: '', solution: '', notes: '' });
  };

  const handleEditHomeroomClick = (record: HomeroomRecord) => {
    setEditingHomeroomId(record.id); setHomeroomForm({ date: record.date, className: record.className, studentIds: [record.studentId], violationType: record.violationType, solution: record.solution, notes: record.notes });
  };

  const toggleStudentSelection = (studentId: string) => setHomeroomForm(prev => ({ ...prev, studentIds: prev.studentIds.includes(studentId) ? prev.studentIds.filter(id => id !== studentId) : [...prev.studentIds, studentId] }));
  const toggleSelectAllStudents = (studentsInClass: Student[]) => setHomeroomForm(prev => ({ ...prev, studentIds: studentsInClass.map(s => s.id).every(id => prev.studentIds.includes(id)) ? [] : studentsInClass.map(s => s.id) }));

  // --- ATTENDANCE RECAP LOGIC ---
  const attendanceRecap = useMemo(() => {
    const stats: Record<string, { S: number, I: number, A: number }> = {};
    const classStudents = students.filter(s => s.className === monitoringClass);
    
    // Initialize stats for all students in class
    classStudents.forEach(s => {
        stats[s.id] = { S: 0, I: 0, A: 0 };
    });

    // Loop through journals to aggregate attendance
    teachingJournals.forEach(j => {
        // Must match selected class and semester
        const journalSemester = j.semester === '1' ? 'Ganjil' : 'Genap';
        if (j.className === monitoringClass && journalSemester === monitoringSemester) {
            if (j.studentAttendance) {
                Object.entries(j.studentAttendance).forEach(([sid, status]) => {
                    // Only count if student belongs to this class
                    if (stats[sid]) {
                        if (status === 'S') stats[sid].S++;
                        else if (status === 'I') stats[sid].I++;
                        else if (status === 'A') stats[sid].A++;
                    }
                });
            }
        }
    });
    return stats;
  }, [students, teachingJournals, monitoringClass, monitoringSemester]);

  const downloadAttendanceRecapPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(14); doc.text(`Rekap Absensi Siswa - Kelas ${monitoringClass}`, 14, 15);
    doc.setFontSize(10); doc.text(`Semester ${monitoringSemester} Tahun Ajaran ${appSettings.academicYear}`, 14, 21);
    
    const classStudents = students.filter(s => s.className === monitoringClass);
    const tableBody = classStudents.map((s, idx) => {
        const stats = attendanceRecap[s.id] || {S:0, I:0, A:0};
        const total = stats.S + stats.I + stats.A;
        return [idx + 1, s.name, stats.S, stats.I, stats.A, total];
    });

    autoTable(doc, {
        startY: 30,
        head: [['No', 'Nama Siswa', 'Sakit', 'Izin', 'Alpha', 'Total']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], halign: 'center' },
        styles: { fontSize: 9, cellPadding: 1.5 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 80 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
        }
    });

    addSignatureToPDF(doc, monitoringPrintDate, "Guru Mata Pelajaran / Wali Kelas");

    doc.save(`Rekap_Absensi_${monitoringClass.replace(' ', '_')}_${monitoringSemester}.pdf`);
    setIsMonitoringDownloadOpen(false);
  };

  const downloadAttendanceRecapExcel = () => {
    const classStudents = students.filter(s => s.className === monitoringClass);
    const data = classStudents.map((s, idx) => {
        const stats = attendanceRecap[s.id] || {S:0, I:0, A:0};
        return {
            'No': idx + 1,
            'Nama Siswa': s.name,
            'Sakit (S)': stats.S,
            'Izin (I)': stats.I,
            'Alpha (A)': stats.A,
            'Total': stats.S + stats.I + stats.A
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    ws['!cols'] = [{wch:5}, {wch:30}, {wch:10}, {wch:10}, {wch:10}, {wch:10}];
    XLSX.writeFile(wb, `Rekap_Absensi_${monitoringClass.replace(' ', '_')}.xlsx`);
    setIsMonitoringDownloadOpen(false);
  };

  const renderAttendanceMonitoring = () => {
    const filteredStudents = students.filter(s => s.className === monitoringClass);

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-6">
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Kelas</label>
                        <select 
                            value={monitoringClass}
                            onChange={(e) => setMonitoringClass(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Semester</label>
                        <select 
                            value={monitoringSemester}
                            onChange={(e) => setMonitoringSemester(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-end gap-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Cetak</label>
                        <input 
                            type="date" 
                            value={monitoringPrintDate}
                            onChange={(e) => setMonitoringPrintDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="relative" ref={monitoringDownloadRef}>
                        <button onClick={() => setIsMonitoringDownloadOpen(!isMonitoringDownloadOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">
                            <Download size={16}/> Download Rekap <ChevronDown size={14}/>
                        </button>
                        {isMonitoringDownloadOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-20">
                                <button onClick={downloadAttendanceRecapPDF} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF</button>
                                <button onClick={downloadAttendanceRecapExcel} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Excel</button>
                            </div>
                        )}
                    </div>
                </div>
             </div>

             <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-bold text-gray-600 w-12">No</th>
                            <th className="px-4 py-3 text-left font-bold text-gray-600">Nama Siswa</th>
                            <th className="px-4 py-3 text-center font-bold text-blue-600 w-24">Sakit (S)</th>
                            <th className="px-4 py-3 text-center font-bold text-orange-600 w-24">Izin (I)</th>
                            <th className="px-4 py-3 text-center font-bold text-red-600 w-24">Alpha (A)</th>
                            <th className="px-4 py-3 text-center font-bold text-gray-800 w-24">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredStudents.map((student, idx) => {
                            const stats = attendanceRecap[student.id] || {S:0, I:0, A:0};
                            const total = stats.S + stats.I + stats.A;
                            return (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-500">{idx + 1}</td>
                                    <td className="px-4 py-2 font-medium">{student.name}</td>
                                    <td className="px-4 py-2 text-center text-blue-700 font-medium">{stats.S > 0 ? stats.S : '-'}</td>
                                    <td className="px-4 py-2 text-center text-orange-700 font-medium">{stats.I > 0 ? stats.I : '-'}</td>
                                    <td className="px-4 py-2 text-center text-red-700 font-bold">{stats.A > 0 ? stats.A : '-'}</td>
                                    <td className="px-4 py-2 text-center font-bold">{total > 0 ? total : '-'}</td>
                                </tr>
                            );
                        })}
                        {filteredStudents.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada siswa ditemukan di kelas ini.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
             <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                <p><strong>Catatan:</strong> Data ini direkap secara otomatis dari input "Jurnal Mengajar" oleh guru mapel di kelas {monitoringClass} pada semester {monitoringSemester}.</p>
             </div>
        </div>
      </div>
    );
  };

  const renderGradesTab = () => {
    const filteredStudents = useMemo(() => students.filter(s => s.className === gradeClass), [students, gradeClass]);
    
    // DOWNLOAD GRADES PDF
    const downloadGradesPDF = (format: 'a4' | 'f4') => {
        const doc = new jsPDF('l', 'mm', format === 'a4' ? 'a4' : [330, 215] as any);
        doc.setFontSize(14); doc.text(`Rekap Nilai Siswa`, 14, 15);
        doc.setFontSize(10); doc.text(`Kelas: ${gradeClass} | Mapel: ${gradeSubject}`, 14, 21);
        doc.text(`Semester ${gradeSemester} Tahun Ajaran ${gradeYear}`, 14, 26);

        const tableBody = filteredStudents.map((student, idx) => {
            const recordId = `${student.id}_${gradeSubject}_${gradeSemester}`; 
            const r = studentGrades.find(rec => rec.id === recordId);
            return [
                idx + 1,
                student.name,
                r?.chapters[1]?.avg || '',
                r?.chapters[2]?.avg || '',
                r?.chapters[3]?.avg || '',
                r?.chapters[4]?.avg || '',
                r?.chapters[5]?.avg || '',
                r?.sts || '',
                r?.sas || '',
                r?.finalGrade || ''
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [['No', 'Nama Siswa', 'Bab 1', 'Bab 2', 'Bab 3', 'Bab 4', 'Bab 5', 'STS', 'SAS', 'Akhir']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [55, 65, 81], halign: 'center' },
            styles: { fontSize: 9, cellPadding: 1.5, halign: 'center' },
            columnStyles: { 
                0: { cellWidth: 10 }, 
                1: { cellWidth: 80, halign: 'left' } 
            }
        });

        addSignatureToPDF(doc, gradesPrintDate, "Guru Mata Pelajaran");
        doc.save(`Nilai_${gradeClass}_${gradeSubject}.pdf`);
        setIsGradesDownloadOpen(false);
    };

    // DOWNLOAD GRADES EXCEL
    const downloadGradesExcel = () => {
        const data = filteredStudents.map((student, idx) => {
            const recordId = `${student.id}_${gradeSubject}_${gradeSemester}`; 
            const r = studentGrades.find(rec => rec.id === recordId);
            return {
                'No': idx + 1,
                'Nama Siswa': student.name,
                'Bab 1 (RR)': r?.chapters[1]?.avg || 0,
                'Bab 2 (RR)': r?.chapters[2]?.avg || 0,
                'Bab 3 (RR)': r?.chapters[3]?.avg || 0,
                'Bab 4 (RR)': r?.chapters[4]?.avg || 0,
                'Bab 5 (RR)': r?.chapters[5]?.avg || 0,
                'STS': r?.sts || 0,
                'SAS': r?.sas || 0,
                'Nilai Akhir': r?.finalGrade || 0
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
        ws['!cols'] = [{wch:5}, {wch:35}, {wch:10}, {wch:10}, {wch:10}, {wch:10}, {wch:10}, {wch:8}, {wch:8}, {wch:10}];
        XLSX.writeFile(wb, `Nilai_${gradeClass}_${gradeSubject}.xlsx`);
        setIsGradesDownloadOpen(false);
    };

    const handleGradeChange = (studentId: string, field: string, value: string, chapterIdx?: number) => {
        if (!onUpdateGrade) return;
        const recordId = `${studentId}_${gradeSubject}_${gradeSemester}`;
        const existingRecord = studentGrades.find(r => r.id === recordId) || { id: recordId, studentId, teacherName: currentUser, subject: gradeSubject, className: gradeClass, semester: gradeSemester, academicYear: gradeYear, chapters: { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} } };
        const numVal = parseFloat(value); const newRecord = { ...existingRecord };
        
        if (chapterIdx) {
            const chIdx = chapterIdx as 1|2|3|4|5; 
            const ch = { ...newRecord.chapters[chIdx] };
            
            // @ts-ignore
            ch[field] = isNaN(numVal) ? undefined : numVal;
            
            // Recalculate Average with FIX for TS2769
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
        const sts = newRecord.sts || 0; const sas = newRecord.sas || 0;
        
        if (chapterAvgs.length > 0 || sts > 0 || sas > 0) { 
            const avgRR = chapterAvgs.length > 0 ? chapterAvgs.reduce((a, b) => a + b, 0) / chapterAvgs.length : 0;
            newRecord.finalGrade = parseFloat(((avgRR + sts + sas) / 3).toFixed(2)); 
        }
        
        onUpdateGrade(newRecord);
    };
    const chapterColors = { 1: 'bg-blue-50', 2: 'bg-green-50', 3: 'bg-yellow-50', 4: 'bg-purple-50', 5: 'bg-pink-50' };
    const chapterHeaderColors = { 1: 'bg-blue-100 text-blue-800', 2: 'bg-green-100 text-green-800', 3: 'bg-yellow-100 text-yellow-800', 4: 'bg-purple-100 text-purple-800', 5: 'bg-pink-100 text-pink-800' };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4 items-end">
                <div className="flex flex-wrap gap-4 items-end">
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">Mata Pelajaran</label><select value={gradeSubject} onChange={(e) => setGradeSubject(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[200px]">{mySubjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">Kelas</label><select value={gradeClass} onChange={(e) => setGradeClass(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm w-24">{CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-xs font-bold text-gray-600 mb-1">Semester</label><select value={gradeSemester} onChange={(e) => setGradeSemester(e.target.value)} className="border border-gray-300 rounded px-3 py-2 text-sm w-24"><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></div>
                </div>
                <div className="flex items-end gap-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Cetak</label>
                        <input 
                            type="date" 
                            value={gradesPrintDate}
                            onChange={(e) => setGradesPrintDate(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="relative" ref={gradesDownloadRef}>
                        <button onClick={() => setIsGradesDownloadOpen(!isGradesDownloadOpen)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">
                            <Download size={16}/> Download Rekap <ChevronDown size={14}/>
                        </button>
                        {isGradesDownloadOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-20">
                                <button onClick={() => downloadGradesPDF('a4')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF (A4)</button>
                                <button onClick={() => downloadGradesPDF('f4')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF (F4)</button>
                                <button onClick={downloadGradesExcel} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Excel</button>
                            </div>
                        )}
                    </div>
                </div>
             </div>
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-slate-800 text-white">
                        <tr>
                            <th rowSpan={2} className="px-2 py-2 w-8 text-center border-r border-slate-600 bg-slate-800 sticky left-0 z-20">No</th>
                            <th rowSpan={2} className="px-2 py-2 w-48 text-left border-r border-slate-600 bg-slate-800 sticky left-8 z-20">Nama Siswa</th>
                            {[1,2,3,4,5].map(i => (<th key={i} colSpan={7} className={`px-1 py-1 text-center border-r border-slate-600 ${chapterHeaderColors[i as 1|2|3|4|5]}`}>BAB {i}</th>))}
                            <th rowSpan={2} className="px-2 py-2 w-12 text-center border-r border-slate-600 bg-orange-700">STS</th>
                            <th rowSpan={2} className="px-2 py-2 w-12 text-center border-r border-slate-600 bg-orange-800">SAS</th>
                            <th rowSpan={2} className="px-2 py-2 w-16 text-center font-bold bg-slate-900">Nilai Akhir</th>
                        </tr>
                        <tr>{[1,2,3,4,5].map(i => (<React.Fragment key={i}><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-700 text-[10px]">F1</th><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-700 text-[10px]">F2</th><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-700 text-[10px]">F3</th><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-700 text-[10px]">F4</th><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-700 text-[10px]">F5</th><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-600 font-bold text-[10px]">SUM</th><th className="px-1 py-1 w-10 text-center border-r border-slate-600 bg-slate-900 font-bold text-yellow-300 text-[10px]">RR</th></React.Fragment>))}</tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map((student, idx) => {
                            const recordId = `${student.id}_${gradeSubject}_${gradeSemester}`; 
                            // FIX TS2339 by casting fallback to GradeRecord
                            const record = (studentGrades.find(r => r.id === recordId) || { chapters: {1:{},2:{},3:{},4:{},5:{}} }) as GradeRecord;
                            return (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="px-2 py-2 text-center text-gray-500 bg-white sticky left-0 z-10 border-r">{idx + 1}</td>
                                    <td className="px-2 py-2 font-medium truncate max-w-[200px] bg-white sticky left-8 z-10 border-r" title={student.name}>{student.name}</td>
                                    {[1,2,3,4,5].map(chIdx => {
                                        const chData = record?.chapters?.[chIdx as 1|2|3|4|5] || {};
                                        return (
                                            <React.Fragment key={chIdx}>
                                                {['f1', 'f2', 'f3', 'f4', 'f5'].map(field => (<td key={field} className="p-1 border-r"><input type="number" className="w-8 text-center border-none bg-transparent focus:bg-indigo-50 rounded text-[10px] p-0.5" value={(chData as any)?.[field] ?? ''} onChange={(e) => handleGradeChange(student.id, field, e.target.value, chIdx)} /></td>))}
                                                <td className={`p-1 border-r ${chapterColors[chIdx as 1|2|3|4|5]}`}><input type="number" className="w-8 text-center border-none bg-transparent font-semibold text-[10px] p-0.5" value={chData?.sum ?? ''} onChange={(e) => handleGradeChange(student.id, 'sum', e.target.value, chIdx)} /></td>
                                                <td className="p-1 border-r bg-gray-100"><input type="number" className="w-8 text-center border-none bg-transparent font-bold text-gray-800 text-[10px] p-0.5" value={chData?.avg ?? ''} readOnly tabIndex={-1} /></td>
                                            </React.Fragment>
                                        )
                                    })}
                                    <td className="p-1 border-r bg-orange-50"><input type="number" className="w-full text-center border-none bg-transparent rounded text-xs p-1" value={record?.sts ?? ''} onChange={(e) => handleGradeChange(student.id, 'sts', e.target.value)} /></td>
                                    <td className="p-1 border-r bg-orange-50"><input type="number" className="w-full text-center border-none bg-transparent rounded text-xs p-1" value={record?.sas ?? ''} onChange={(e) => handleGradeChange(student.id, 'sas', e.target.value)} /></td>
                                    <td className="p-1 bg-slate-100 font-bold text-center border-l-2 border-slate-300"><input type="number" className="w-full text-center border-none bg-transparent font-bold text-indigo-700 text-xs p-1" value={record?.finalGrade ?? ''} readOnly /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
        </div>
    );
  };

  const renderHomeroomTab = () => {
    const studentsInClass = useMemo(() => students.filter(s => s.className === homeroomForm.className), [students, homeroomForm.className]);
    
    // Filter records
    const myHomeroomRecords = useMemo(() => {
        let records = homeroomRecords.filter(r => r.teacherName === currentUser);
        if (homeroomDateFrom) records = records.filter(r => r.date >= homeroomDateFrom);
        if (homeroomDateTo) records = records.filter(r => r.date <= homeroomDateTo);
        return records.sort((a,b) => b.date.localeCompare(a.date));
    }, [homeroomRecords, currentUser, homeroomDateFrom, homeroomDateTo]);

    // DOWNLOAD HOMEROOM PDF
    const downloadHomeroomPDF = (format: 'a4' | 'f4') => {
        const doc = new jsPDF('l', 'mm', format === 'a4' ? 'a4' : [330, 215] as any);
        doc.setFontSize(14); doc.text(`Riwayat Catatan Wali Kelas`, 14, 15);
        doc.setFontSize(10); doc.text(`Wali Kelas: ${currentUser}`, 14, 21);
        doc.text(`Tahun Ajaran ${appSettings.academicYear}`, 14, 26);

        const tableBody = myHomeroomRecords.map((rec, idx) => {
            const sName = students.find(s => s.id === rec.studentId)?.name || 'Siswa Hapus';
            return [
                idx + 1,
                rec.date,
                rec.className,
                sName,
                rec.violationType,
                rec.solution
            ];
        });

        autoTable(doc, {
            startY: 30,
            head: [['No', 'Tanggal', 'Kelas', 'Nama Siswa', 'Masalah / Pelanggaran', 'Solusi / Tindak Lanjut']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229], halign: 'center' },
            styles: { fontSize: 9, cellPadding: 1.5 },
            columnStyles: { 
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 25 },
                2: { cellWidth: 15, halign: 'center' },
                3: { cellWidth: 50 }
            }
        });

        addSignatureToPDF(doc, homeroomPrintDate, "Wali Kelas");
        doc.save(`Catatan_Wali_Kelas_${currentUser.replace(' ', '_')}.pdf`);
        setIsHomeroomDownloadOpen(false);
    };

    // DOWNLOAD HOMEROOM EXCEL
    const downloadHomeroomExcel = () => {
        const data = myHomeroomRecords.map((rec, idx) => {
            const sName = students.find(s => s.id === rec.studentId)?.name || 'Siswa Hapus';
            return {
                'No': idx + 1,
                'Tanggal': rec.date,
                'Kelas': rec.className,
                'Nama Siswa': sName,
                'Masalah': rec.violationType,
                'Solusi': rec.solution,
                'Catatan': rec.notes
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Catatan Wali Kelas");
        ws['!cols'] = [{wch:5}, {wch:15}, {wch:10}, {wch:30}, {wch:30}, {wch:30}, {wch:30}];
        XLSX.writeFile(wb, `Catatan_Wali_Kelas_${currentUser.replace(' ', '_')}.xlsx`);
        setIsHomeroomDownloadOpen(false);
    };

    return (
      <div className="space-y-6 animate-fade-in">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
               <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ClipboardList size={20} className="text-indigo-600"/> {editingHomeroomId ? 'Edit Catatan' : 'Input Catatan Wali Kelas'}
               </h3>
               <form onSubmit={handleHomeroomSubmit} className="space-y-4">
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label><input type="date" value={homeroomForm.date} onChange={(e) => setHomeroomForm({...homeroomForm, date: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required /></div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Kelas Binaan</label>
                    <select value={homeroomForm.className} onChange={(e) => setHomeroomForm({...homeroomForm, className: e.target.value, studentIds: []})} className="w-full border rounded px-3 py-2 text-sm">
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1"><label className="block text-xs font-bold text-gray-600">Siswa (Bisa pilih &gt; 1)</label><button type="button" onClick={() => toggleSelectAllStudents(studentsInClass)} className="text-[10px] text-indigo-600 hover:underline">{studentsInClass.length > 0 && homeroomForm.studentIds.length === studentsInClass.length ? 'Unselect All' : 'Select All'}</button></div>
                    <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 space-y-1">
                      {studentsInClass.map(s => (
                        <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                          <input type="checkbox" checked={homeroomForm.studentIds.includes(s.id)} onChange={() => toggleStudentSelection(s.id)} className="rounded text-indigo-600"/>
                          <span className="text-xs text-gray-700">{s.name}</span>
                        </label>
                      ))}
                      {studentsInClass.length === 0 && <p className="text-xs text-gray-400 text-center">Tidak ada siswa.</p>}
                    </div>
                  </div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Jenis Pelanggaran / Masalah</label><input type="text" value={homeroomForm.violationType} onChange={(e) => setHomeroomForm({...homeroomForm, violationType: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="Contoh: Terlambat, Bolos..." required /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Tindak Lanjut / Solusi</label><textarea value={homeroomForm.solution} onChange={(e) => setHomeroomForm({...homeroomForm, solution: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Solusi..." required /></div>
                  <div><label className="block text-xs font-bold text-gray-600 mb-1">Catatan Tambahan</label><textarea value={homeroomForm.notes} onChange={(e) => setHomeroomForm({...homeroomForm, notes: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={2} /></div>
                  
                  <div className="flex gap-2 pt-2">
                    {editingHomeroomId && <button type="button" onClick={() => { setEditingHomeroomId(null); setHomeroomForm({date: new Date().toISOString().split('T')[0], className: CLASSES[0], studentIds: [], violationType: '', solution: '', notes: ''}); }} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm">Batal</button>}
                    <button type="submit" className="flex-[2] py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm">{editingHomeroomId ? 'Update' : 'Simpan'}</button>
                  </div>
               </form>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
               <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <h3 className="font-bold text-gray-800">Riwayat Catatan Wali Kelas</h3>
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-end w-full md:w-auto">
                      <div className="flex flex-col gap-1">
                         <span className="text-xs font-bold text-gray-600">Filter Tanggal:</span>
                         <div className="flex items-center gap-2">
                             <input type="date" value={homeroomDateFrom} onChange={(e) => setHomeroomDateFrom(e.target.value)} className="border rounded px-2 py-1 text-xs" />
                             <span className="text-gray-400">-</span>
                             <input type="date" value={homeroomDateTo} onChange={(e) => setHomeroomDateTo(e.target.value)} className="border rounded px-2 py-1 text-xs" />
                         </div>
                      </div>
                      <div className="flex flex-col gap-1">
                         <span className="text-xs font-bold text-gray-600">Tanggal Cetak:</span>
                         <input type="date" value={homeroomPrintDate} onChange={(e) => setHomeroomPrintDate(e.target.value)} className="text-xs border rounded px-2 py-1" />
                      </div>
                      <div className="relative" ref={homeroomDownloadRef}>
                         <button onClick={() => setIsHomeroomDownloadOpen(!isHomeroomDownloadOpen)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">
                            <Download size={16}/> Download <ChevronDown size={14}/>
                         </button>
                         {isHomeroomDownloadOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-20">
                                <button onClick={() => downloadHomeroomPDF('a4')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF (A4)</button>
                                <button onClick={() => downloadHomeroomPDF('f4')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">PDF (F4)</button>
                                <button onClick={downloadHomeroomExcel} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Excel</button>
                            </div>
                         )}
                      </div>
                  </div>
               </div>
               <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50"><tr><th className="px-3 py-3 text-left font-bold text-gray-600 w-8">No</th><th className="px-3 py-3 text-left font-bold text-gray-600 w-20">Tanggal</th><th className="px-3 py-3 text-left font-bold text-gray-600 w-16">Kelas</th><th className="px-3 py-3 text-left font-bold text-gray-600">Nama Siswa</th><th className="px-3 py-3 text-left font-bold text-gray-600">Masalah</th><th className="px-3 py-3 text-left font-bold text-gray-600">Solusi</th><th className="px-3 py-3 text-center font-bold text-gray-600 w-16">Aksi</th></tr></thead>
                        <tbody className="divide-y divide-gray-200">
                           {myHomeroomRecords.map((rec, idx) => {
                             const sName = students.find(s => s.id === rec.studentId)?.name || 'Siswa Hapus';
                             return (
                               <tr key={rec.id} className="hover:bg-gray-50">
                                 <td className="px-3 py-2 text-center text-gray-500">{idx+1}</td>
                                 <td className="px-3 py-2 whitespace-nowrap">{rec.date}</td>
                                 <td className="px-3 py-2 font-bold text-indigo-600">{rec.className}</td>
                                 <td className="px-3 py-2 font-medium">{sName}</td>
                                 <td className="px-3 py-2 text-red-600 font-medium">{rec.violationType}</td>
                                 <td className="px-3 py-2 text-gray-600">{rec.solution}</td>
                                 <td className="px-3 py-2 text-center flex justify-center gap-1">
                                    <button onClick={() => handleEditHomeroomClick(rec)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => onDeleteHomeroomRecord && onDeleteHomeroomRecord(rec.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                 </td>
                               </tr>
                             )
                           })}
                           {myHomeroomRecords.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada catatan{homeroomDateFrom ? ' pada rentang tanggal ini' : ''}.</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  };

  const renderJournalTab = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex gap-4 mb-4 border-b border-gray-200 pb-2">
            <button 
                onClick={() => setJournalMode('INPUT_JURNAL')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${journalMode === 'INPUT_JURNAL' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                <BookOpen size={18} className="inline mr-2"/> Input Jurnal Harian
            </button>
            <button 
                onClick={() => setJournalMode('INPUT_MATERI')}
                className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${journalMode === 'INPUT_MATERI' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
                <List size={18} className="inline mr-2"/> Bank Materi (Bab/Sub-Bab)
            </button>
        </div>

        {journalMode === 'INPUT_MATERI' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {editingMaterialId ? 'Edit Materi' : 'Tambah Materi Baru'}
                    </h3>
                    <form onSubmit={saveMaterial} className="space-y-4">
                         <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Mata Pelajaran</label>
                            <select value={matForm.subject} onChange={(e) => setMatForm({...matForm, subject: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required>
                                <option value="">-- Pilih Mapel --</option>
                                {mySubjects.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Semester</label>
                             <select value={matForm.semester} onChange={(e) => setMatForm({...matForm, semester: e.target.value as '1'|'2'})} className="w-full border rounded px-3 py-2 text-sm">
                                <option value="1">Ganjil</option>
                                <option value="2">Genap</option>
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1">Kelas Target</label>
                             <div className="flex flex-wrap gap-2">
                                {CLASSES.map(cls => (
                                    <button 
                                        key={cls} type="button" 
                                        onClick={() => handleMatClassToggle(cls)}
                                        className={`px-2 py-1 text-xs rounded border ${matForm.classes.includes(cls) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}
                                    >
                                        {cls}
                                    </button>
                                ))}
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Judul Bab</label>
                            <input type="text" value={matForm.chapter} onChange={(e) => setMatForm({...matForm, chapter: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="Misal: Bab 1. Bilangan Bulat" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Sub Bab (Topik Bahasan)</label>
                            <div className="space-y-2">
                                {matForm.subChapters.map((sub, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input type="text" value={sub} onChange={(e) => handleSubChapterChange(idx, e.target.value)} className="flex-1 border rounded px-3 py-2 text-sm" placeholder={`Sub Bab ${idx+1}`} required />
                                        {matForm.subChapters.length > 1 && (
                                            <button type="button" onClick={() => removeSubChapter(idx)} className="text-red-500 hover:bg-red-50 p-2 rounded"><X size={16}/></button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addSubChapter} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"><Plus size={14}/> Tambah Sub Bab</button>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            {editingMaterialId && <button type="button" onClick={() => { setEditingMaterialId(null); setMatForm({semester: '2', classes: [], chapter: '', subChapters: [''], subject: matForm.subject}); }} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm">Batal</button>}
                            <button type="submit" className="flex-[2] py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm">{editingMaterialId ? 'Update Materi' : 'Simpan Materi'}</button>
                        </div>
                    </form>
                </div>
                
                <div className="lg:col-span-2 space-y-4">
                     {teachingMaterials.filter(m => m.teacherName === currentUser).map(mat => (
                         <div key={mat.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEditMaterialClick(mat)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                <button onClick={() => onDeleteMaterial && onDeleteMaterial(mat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded uppercase">{mat.subject}</span>
                                <span className="text-xs text-gray-500 font-medium">Semester {mat.semester === '1' ? 'Ganjil' : 'Genap'}</span>
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg mb-1">{mat.chapter}</h4>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {mat.classes.map(c => <span key={c} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono font-bold">{c}</span>)}
                            </div>
                            <div className="pl-4 border-l-2 border-indigo-200">
                                <ul className="list-disc list-inside text-sm text-gray-600">
                                    {mat.subChapters.map((sub, i) => <li key={i}>{sub}</li>)}
                                </ul>
                            </div>
                         </div>
                     ))}
                     {teachingMaterials.filter(m => m.teacherName === currentUser).length === 0 && (
                         <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">Belum ada materi. Silakan tambah materi terlebih dahulu.</div>
                     )}
                </div>
            </div>
        )}

        {journalMode === 'INPUT_JURNAL' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {editingJournalId ? 'Edit Jurnal' : 'Input Jurnal Harian'}
                    </h3>
                    <form onSubmit={saveJournal} className="space-y-4">
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Tanggal</label><input type="date" value={jourForm.date} onChange={(e) => setJourForm({...jourForm, date: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" required /></div>
                        
                        <div>
                             <label className="block text-xs font-bold text-gray-600 mb-1">Jam Mengajar Hari Ini ({selectedDayName})</label>
                             <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border p-2 rounded bg-gray-50">
                                {dailyTeachingSlots.length > 0 ? dailyTeachingSlots.map(slot => (
                                    <button 
                                        key={slot} type="button"
                                        onClick={() => handleJamKeSelection(slot)}
                                        className={`text-xs p-2 rounded border text-left ${jourForm.jamKe.includes(slot) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}
                                    >
                                        <div className="font-bold">Jam ke-{slot.split('|')[1]}</div>
                                        <div className="text-[10px] opacity-90">{slot.split('|')[2]}</div>
                                    </button>
                                )) : <p className="text-xs text-gray-400 col-span-2 text-center py-2">Tidak ada jadwal mengajar di hari ini.</p>}
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Kelas</label>
                                <input type="text" value={jourForm.className} readOnly className="w-full bg-gray-100 border rounded px-3 py-2 text-sm font-bold text-gray-700" placeholder="Pilih jam..." />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Mapel</label>
                                <input type="text" value={jourForm.subject} readOnly className="w-full bg-gray-100 border rounded px-3 py-2 text-sm font-bold text-gray-700" />
                             </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Materi Pembelajaran (Bab)</label>
                            <select value={jourForm.chapter} onChange={(e) => setJourForm({...jourForm, chapter: e.target.value, subChapter: ''})} className="w-full border rounded px-3 py-2 text-sm" required>
                                <option value="">-- Pilih Materi --</option>
                                {availableChapters.map(c => <option key={c.id} value={c.chapter}>{c.chapter}</option>)}
                            </select>
                        </div>
                        
                        {jourForm.chapter && (
                            <div>
                                <label className="block text-xs font-bold text-gray-600 mb-1">Sub Bab (Bisa pilih &gt; 1)</label>
                                <div className="space-y-1 bg-gray-50 p-2 rounded border">
                                    {availableSubChapters.map(sub => (
                                        <label key={sub} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input type="checkbox" checked={jourForm.subChapter.split(',').map(s=>s.trim()).includes(sub)} onChange={() => handleJournalSubChapterToggle(sub)} className="rounded text-indigo-600"/>
                                            <span className="text-xs text-gray-700">{sub}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Kegiatan Pembelajaran</label><textarea value={jourForm.activity} onChange={(e) => setJourForm({...jourForm, activity: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={2} required /></div>
                        
                        {/* ABSENSI SISWA GRID - Updated Logic */}
                        {jourForm.className && (
                            <div className="border rounded p-3 bg-gray-50">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-gray-700">Absensi Siswa (Kelas {jourForm.className})</label>
                                    <span className="text-[10px] text-gray-500">Total: {students.filter(s => s.className === jourForm.className).length} Siswa</span>
                                </div>
                                <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
                                    {students.filter(s => s.className === jourForm.className).map(student => {
                                        const status = jourForm.studentAttendance[student.id] || 'H';
                                        return (
                                            <div key={student.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 shadow-sm text-xs">
                                                <span className="font-medium text-gray-800 truncate w-1/2" title={student.name}>{student.name}</span>
                                                <div className="flex gap-1">
                                                    {(['S', 'I', 'A'] as const).map(sKey => (
                                                        <button
                                                            key={sKey}
                                                            type="button"
                                                            onClick={() => setJourForm(prev => ({
                                                                ...prev,
                                                                studentAttendance: {
                                                                    ...prev.studentAttendance,
                                                                    [student.id]: status === sKey ? 'H' : sKey
                                                                }
                                                            }))}
                                                            className={`w-6 h-6 flex items-center justify-center rounded font-bold transition-all ${
                                                                status === sKey 
                                                                    ? (sKey === 'S' ? 'bg-blue-600 text-white' : sKey === 'I' ? 'bg-orange-500 text-white' : 'bg-red-600 text-white')
                                                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            {sKey}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {students.filter(s => s.className === jourForm.className).length === 0 && (
                                        <p className="text-xs text-center text-gray-400 py-4">Data siswa belum tersedia untuk kelas ini.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Catatan Kejadian / Lain-lain</label><textarea value={jourForm.notes} onChange={(e) => setJourForm({...jourForm, notes: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows={2} /></div>

                        <div className="flex gap-2 pt-2">
                            {editingJournalId && <button type="button" onClick={handleCancelEdit} className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold text-sm">Batal</button>}
                            <button type="submit" className="flex-[2] py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-sm">{editingJournalId ? 'Update Jurnal' : 'Simpan Jurnal'}</button>
                        </div>
                    </form>
                 </div>

                 <div className="lg:col-span-2 space-y-4">
                     <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <h3 className="font-bold text-gray-800">Riwayat Jurnal</h3>
                            <div className="flex gap-2 items-center">
                                <span className="text-xs font-bold text-gray-600">Filter:</span>
                                <input type="date" value={journalDateFrom} onChange={(e) => setJournalDateFrom(e.target.value)} className="border rounded px-2 py-1 text-xs" />
                                <span className="text-gray-400">-</span>
                                <input type="date" value={journalDateTo} onChange={(e) => setJournalDateTo(e.target.value)} className="border rounded px-2 py-1 text-xs" />
                                <select value={journalFilterClass} onChange={(e) => setJournalFilterClass(e.target.value)} className="border rounded px-2 py-1 text-xs">
                                    <option value="">Semua Kelas</option>
                                    {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-600">Tanggal Cetak:</label>
                                <input type="date" value={printDate} onChange={(e) => setPrintDate(e.target.value)} className="text-xs border rounded px-2 py-1" />
                            </div>
                            <div className="relative" ref={journalDownloadRef}>
                                 <button onClick={() => setIsJournalDownloadOpen(!isJournalDownloadOpen)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50">
                                    <Download size={16}/> Download Rekap <ChevronDown size={14}/>
                                 </button>
                                 {isJournalDownloadOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-20">
                                        <button onClick={() => downloadJournalHistoryPDF('a4')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Kertas A4</button>
                                        <button onClick={() => downloadJournalHistoryPDF('f4')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Kertas F4</button>
                                    </div>
                                 )}
                            </div>
                        </div>
                     </div>
                     
                     <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600 w-10">No</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600 w-24">Tanggal</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600 w-16">Kelas</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600">Mapel</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600">Bab</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600">Sub Bab</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600">Kegiatan</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600">Catatan</th>
                                        <th className="px-3 py-3 text-left font-bold text-gray-600 w-32">Absensi</th>
                                        <th className="px-3 py-3 text-center font-bold text-gray-600 w-16">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {myJournals.map((j, idx) => {
                                        const absList: string[] = [];
                                        if (j.studentAttendance) {
                                            Object.entries(j.studentAttendance).forEach(([sid, status]) => {
                                                if (status !== 'H') {
                                                    const s = students.find(stud => stud.id === sid);
                                                    if (s) absList.push(`${s.name.split(' ')[0]}(${status})`);
                                                }
                                            });
                                        }
                                        return (
                                            <tr key={j.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{j.date}</td>
                                                <td className="px-3 py-2 font-bold text-indigo-600">{j.className}</td>
                                                <td className="px-3 py-2">{j.subject}</td>
                                                <td className="px-3 py-2">{j.chapter}</td>
                                                <td className="px-3 py-2 text-gray-500">{j.subChapter}</td>
                                                <td className="px-3 py-2">{j.activity}</td>
                                                <td className="px-3 py-2 text-gray-500 italic">{j.notes || '-'}</td>
                                                <td className="px-3 py-2 text-red-600 font-medium text-[10px]">
                                                    {absList.length > 0 ? absList.join(', ') : 'Nihil'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button onClick={() => handleEditJournalClick(j)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Edit2 size={14}/></button>
                                                        <button onClick={() => onDeleteJournal && onDeleteJournal(j.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    {myJournals.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">Belum ada jurnal mengajar.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                     </div>
                 </div>
             </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] flex flex-col animate-fade-in">
      <div className="p-6">
         {activeTab === 'CLASS' && (
            <div className="space-y-6 animate-fade-in">
               <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-gray-600">Pilih Kelas:</span>
                     <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">{CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}</select>
                  </div>
                  <button onClick={downloadClassSchedulePDF} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm"><Download size={16} /> Download PDF</button>
               </div>
               <div className="overflow-x-auto border rounded-xl shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                     <thead className="bg-slate-800 text-white"><tr><th className="px-4 py-3 text-center w-24">Jam</th><th className="px-4 py-3 text-center w-32">Waktu</th><th className="px-4 py-3 text-left">Mata Pelajaran</th><th className="px-4 py-3 text-left">Guru</th></tr></thead>
                     <tbody className="bg-white divide-y divide-gray-200">{SCHEDULE_DATA.flatMap(day => [<tr key={`header-${day.day}`} className="bg-gray-100"><td colSpan={4} className="px-4 py-2 font-bold text-gray-700 border-y border-gray-200">{day.day}</td></tr>, ...day.rows.map((row) => { if(row.activity) { return (<tr key={`${day.day}-${row.jam}`} className="bg-orange-50"><td className="px-4 py-3 text-center font-bold text-gray-500">{row.jam}</td><td className="px-4 py-3 text-center font-mono text-xs text-gray-500">{row.waktu}</td><td colSpan={2} className="px-4 py-3 text-center font-bold text-orange-800">{row.activity}</td></tr>); } const key = `${day.day}-${row.jam}-${selectedClass}`; const code = scheduleMap[key]; const info = code ? codeToDataMap[code] : null; return (<tr key={`${day.day}-${row.jam}`} className="hover:bg-gray-50"><td className="px-4 py-3 text-center font-bold text-gray-600">{row.jam}</td><td className="px-4 py-3 text-center font-mono text-xs text-gray-500">{row.waktu}</td><td className="px-4 py-3 font-medium text-gray-900">{info?.subject || '-'}</td><td className="px-4 py-3 text-gray-600">{info?.name || '-'}</td></tr>); })])}</tbody>
                  </table>
               </div>
            </div>
         )}

         {activeTab === 'TEACHER' && (
            <div className="space-y-6 animate-fade-in">
               <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-gray-600">Pilih Guru:</span>
                     <select value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 max-w-xs"><option value="">-- Pilih Guru --</option>{teacherNames.map(name => { const t = teacherData.find(td => td.name === name); return t ? <option key={name} value={String(t.id)}>{name}</option> : null; })}</select>
                  </div>
                  <button onClick={downloadTeacherSchedulePDF} disabled={!selectedTeacherId} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm disabled:bg-gray-300"><Download size={16} /> Download PDF</button>
               </div>
               {selectedTeacherId ? (
                   <div className="overflow-x-auto border rounded-xl shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                         <thead className="bg-emerald-700 text-white"><tr><th className="px-4 py-3 text-left w-32">Hari</th><th className="px-4 py-3 text-center w-24">Jam</th><th className="px-4 py-3 text-center w-32">Waktu</th><th className="px-4 py-3 text-center w-24">Kelas</th><th className="px-4 py-3 text-left">Mata Pelajaran</th></tr></thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                            {(() => {
                               const myRows: React.ReactElement[] = []; const myCodes = teacherData.filter(t => String(t.id) === selectedTeacherId).map(t => t.code);
                               SCHEDULE_DATA.forEach(day => { day.rows.forEach(row => { if(row.activity) return; CLASSES.forEach(cls => { const key = `${day.day}-${row.jam}-${cls}`; const code = scheduleMap[key]; if (code && myCodes.includes(code)) { const info = codeToDataMap[code]; myRows.push(<tr key={key} className="hover:bg-gray-50"><td className="px-4 py-3 font-bold text-gray-700">{day.day}</td><td className="px-4 py-3 text-center font-bold text-gray-600">{row.jam}</td><td className="px-4 py-3 text-center font-mono text-xs text-gray-500">{row.waktu}</td><td className="px-4 py-3 text-center font-bold text-indigo-600 bg-indigo-50 rounded-lg">{cls}</td><td className="px-4 py-3 text-gray-800">{info?.subject}</td></tr>); } }); }); });
                               return myRows.length > 0 ? myRows : (<tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada jadwal mengajar.</td></tr>);
                            })()}
                         </tbody>
                      </table>
                   </div>
               ) : (<div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl"><User size={48} className="mx-auto mb-2 opacity-20"/><p>Pilih nama guru untuk melihat jadwal.</p></div>)}
            </div>
         )}

         {activeTab === 'JOURNAL' && renderJournalTab()}
         {activeTab === 'MONITORING' && renderAttendanceMonitoring()}
         {activeTab === 'GRADES' && renderGradesTab()}
         {activeTab === 'HOMEROOM' && renderHomeroomTab()}
      </div>
    </div>
  );
};

export default ClassTeacherSchedule;