import React, { useState, useRef, useMemo } from 'react';
import { StudentRecord, ExcelColumnRole } from '../types';
import { formatCurrency, formatPhoneNumber, isValidMobileNumber, generateWhatsAppWebUrl } from '../utils/templateEngine';
import {
  parseExcelFileDetailed,
  applyExcelColumnMappings,
  exportStudentsToExcel,
  ExcelHeaderMapping,
} from '../utils/reportingEngine';
import { OFFICIAL_SCHOOL_DATABASE } from '../utils/sampleData';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Search,
  Filter,
  Plus,
  Phone,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Eye,
  Send,
  UserCheck,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Bus,
  MapPin,
  Calendar,
  X,
  CreditCard,
  Building,
  MessageSquare,
  Zap,
} from 'lucide-react';

interface StudentDataTableProps {
  students: StudentRecord[];
  onUpdateStudents: (students: StudentRecord[]) => void;
  onSelectStudentForPreview: (student: StudentRecord) => void;
  onOpenIndividualOverride: (student: StudentRecord) => void;
  onQuickSend: (student: StudentRecord) => void;
  onOpenWhatsAppSender?: () => void;
  onOpenDirectMessageModal?: () => void;
}

export const StudentDataTable: React.FC<StudentDataTableProps> = ({
  students,
  onUpdateStudents,
  onSelectStudentForPreview,
  onOpenIndividualOverride,
  onQuickSend,
  onOpenWhatsAppSender,
  onOpenDirectMessageModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'transport' | 'overdue' | 'high_dues'>('all');
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentRecord | null>(null);

  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<StudentRecord>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [tableViewMode, setTableViewMode] = useState<'standard' | 'excel'>('standard');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [importReview, setImportReview] = useState<{
    fileName: string;
    sheetName: string;
    records: StudentRecord[];
    mappings: ExcelHeaderMapping[];
    insertMode: 'replace' | 'append';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeExcelColumns = useMemo(() => {
    const sampleWithCols = students.find((s) => (s.excelColumnOrder?.length ?? 0) > 0);
    return sampleWithCols?.excelColumnOrder || [];
  }, [students]);

  // New Student State
  const [newStudent, setNewStudent] = useState<Partial<StudentRecord>>({
    studentName: '',
    enrollmentNo: `${Math.floor(100 + Math.random() * 900)}`,
    rollNo: '1',
    gradeLevel: 'Std-I A',
    parentName: '',
    fatherName: '',
    parentRelationship: 'Father',
    parentMobile: '',
    address: 'Vill- Marwan, Muzaffarpur',
    tuitionDues: 15000,
    transportDues: 4500,
    lateFee: 50,
    duesOwed: 19550,
    expectedPaymentDate: '19/09/2026',
    duesStatus: 'Overdue',
    gpa: 3.5,
    attendanceRate: 92,
    topSubject: 'Mathematics',
    areaToImprove: 'Science',
    academicStanding: 'Good Standing',
    teacherRemarks: 'Regular in classes.',
  });

  // Unique Classes list for filter dropdown
  const availableClasses = Array.from(new Set(students.map((s) => s.gradeLevel))).filter(Boolean);

  // Filter students
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesRawExcel =
      q && s.excelRawColumns
        ? Object.values(s.excelRawColumns).some((val) => val.toLowerCase().includes(q))
        : false;
    const matchesSearch =
      !q ||
      s.studentName.toLowerCase().includes(q) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
      (s.enrollmentNo && s.enrollmentNo.toLowerCase().includes(q)) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q)) ||
      s.parentMobile.includes(q) ||
      s.gradeLevel.toLowerCase().includes(q) ||
      matchesRawExcel;

    if (!matchesSearch) return false;

    if (filterClass !== 'all' && s.gradeLevel !== filterClass) return false;

    if (filterStatus === 'transport') return (s.transportDues ?? 0) > 0;
    if (filterStatus === 'overdue') return s.duesStatus === 'Overdue' && s.duesOwed > 0;
    if (filterStatus === 'high_dues') return s.duesOwed >= 25000;

    return true;
  });

  // Handle Excel/CSV file upload -> captures ALL columns and opens header review modal before inserting
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const parsed = parseExcelFileDetailed(buffer);
        if (parsed.records.length === 0 || parsed.columnOrder.length === 0) {
          setUploadError(
            `No student or fee rows were detected inside "${file.name}". Please ensure the sheet has column headers and at least one data row.`
          );
          return;
        }
        setImportReview({
          fileName: file.name,
          sheetName: parsed.sheetName || 'Sheet1',
          records: parsed.records,
          mappings: parsed.columnOrder.map((col) => ({
            originalHeader: col,
            displayHeader: col,
            role: parsed.columnRoles[col] || 'student',
          })),
          insertMode: 'replace',
        });
      } catch (err) {
        console.error('Failed to parse file:', err);
        setUploadError(`Could not read "${file.name}". Please upload a valid .csv, .xlsx, or .xls file.`);
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmExcelInsert = () => {
    if (!importReview) return;
    const mappedRecords = applyExcelColumnMappings(importReview.records, importReview.mappings);
    if (importReview.insertMode === 'append') {
      onUpdateStudents([...mappedRecords, ...students]);
    } else {
      onUpdateStudents(mappedRecords);
    }
    setTableViewMode('excel');
    setImportReview(null);
  };

  const handleResetToOfficialCSV = () => {
    setTableViewMode('standard');
    onUpdateStudents(OFFICIAL_SCHOOL_DATABASE);
  };

  // Inline edit handlers
  const handleStartEdit = (student: StudentRecord) => {
    setEditingStudentId(student.id);
    setEditForm({ ...student });
  };

  const handleSaveEdit = () => {
    if (!editingStudentId) return;
    onUpdateStudents(
      students.map((s) => {
        if (s.id === editingStudentId) {
          const tu = Number(editForm.tuitionDues) || 0;
          const tr = Number(editForm.transportDues) || 0;
          const lf = Number(editForm.lateFee) || 0;
          const total = tu + tr + lf;
          const updatedRaw = s.excelRawColumns ? { ...s.excelRawColumns } : undefined;
          if (updatedRaw && s.excelColumnOrder) {
            for (const col of s.excelColumnOrder) {
              const lower = col.toLowerCase();
              if (/^name$|student\s*name/i.test(lower) && editForm.studentName) updatedRaw[col] = editForm.studentName;
              else if (/father|guardian/i.test(lower) && editForm.fatherName) updatedRaw[col] = editForm.fatherName;
              else if (/^class|^std/i.test(lower) && editForm.gradeLevel) updatedRaw[col] = editForm.gradeLevel;
              else if (/mobile|contact|phone/i.test(lower) && editForm.parentMobile) updatedRaw[col] = editForm.parentMobile;
              else if (/address|village/i.test(lower) && editForm.address) updatedRaw[col] = editForm.address;
              else if (/tuition|tu\.?\s*due/i.test(lower)) updatedRaw[col] = String(tu);
              else if (/transport|tran\.?\s*due/i.test(lower)) updatedRaw[col] = String(tr);
              else if (s.excelColumnRoles?.[col] === 'total') updatedRaw[col] = String(total);
            }
          }
          return {
            ...s,
            ...editForm,
            tuitionDues: tu,
            transportDues: tr,
            lateFee: lf,
            duesOwed: total,
            duesStatus: total > 0 ? 'Overdue' : 'Paid',
            ...(updatedRaw ? { excelRawColumns: updatedRaw } : {}),
          };
        }
        return s;
      })
    );
    setEditingStudentId(null);
  };

  const handleDeleteStudent = (id: string) => {
    onUpdateStudents(students.filter((s) => s.id !== id));
  };

  const handleCreateStudent = () => {
    if (!newStudent.studentName || !newStudent.parentMobile) return;
    const tu = Number(newStudent.tuitionDues) || 0;
    const tr = Number(newStudent.transportDues) || 0;
    const lf = Number(newStudent.lateFee) || 0;
    const total = tu + tr + lf;

    const student: StudentRecord = {
      id: `stu-${Date.now()}`,
      studentId: newStudent.enrollmentNo || `${Math.floor(100 + Math.random() * 900)}`,
      enrollmentNo: newStudent.enrollmentNo || `${Math.floor(100 + Math.random() * 900)}`,
      rollNo: newStudent.rollNo || '1',
      studentName: newStudent.studentName,
      gradeLevel: newStudent.gradeLevel || 'Std-I A',
      parentName: newStudent.fatherName || newStudent.parentName || `Father of ${newStudent.studentName}`,
      fatherName: newStudent.fatherName || newStudent.parentName || `Father of ${newStudent.studentName}`,
      parentRelationship: 'Father',
      parentMobile: newStudent.parentMobile,
      address: newStudent.address || 'Vill- Marwan',
      tuitionDues: tu,
      transportDues: tr,
      lateFee: lf,
      duesOwed: total,
      dueMonths: '4,5,6,7,8,9,10',
      expectedPaymentDate: newStudent.expectedPaymentDate || '19/09/2026',
      duesDueDate: '2026-10-15',
      duesStatus: total > 0 ? 'Overdue' : 'Paid',
      gpa: 3.5,
      attendanceRate: 92,
      overallPercentage: 86,
      topSubject: 'Mathematics',
      areaToImprove: 'Science',
      academicStanding: 'Good Standing',
      subjectGrades: [],
      teacherRemarks: newStudent.teacherRemarks || 'Enthusiastic participant in class.',
      paymentLink: `https://pay.schoolportal.in/due/${newStudent.enrollmentNo}`,
    };
    onUpdateStudents([student, ...students]);
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Kidzee School Management Database
              </h2>
              {students.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Official CSV Master ({students.length})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                  Empty Register (0 Records)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Student enrollment register with Father contact, village address, tuition & transport dues (Rs.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New CSV</span>
          </button>

          <button
            type="button"
            onClick={handleResetToOfficialCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 shadow-2xs transition-colors"
            title="Reload the 20 records directly from School_Management_System.csv"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reload School CSV (20)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsClearConfirmOpen(true)}
            disabled={students.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
            title="Clear all student records from database register"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear All Records</span>
          </button>

          {onOpenWhatsAppSender && (
            <button
              type="button"
              onClick={onOpenWhatsAppSender}
              disabled={students.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Launch 1-Click WhatsApp Web Sender to notify all parents"
            >
              <MessageSquare className="w-3.5 h-3.5 fill-current" />
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>1-Click WhatsApp Send All</span>
            </button>
          )}

          {onOpenDirectMessageModal && (
            <button
              type="button"
              onClick={onOpenDirectMessageModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs transition-all active:scale-98"
              title="Send direct text or WhatsApp message to any number using Kidzee School"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct Message (Kidzee School)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => exportStudentsToExcel(students)}
            disabled={students.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Student</span>
          </button>
        </div>
      </div>

      {/* Upload error feedback */}
      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl px-4 py-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student, father, village, mobile, roll, or Excel column..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs flex-wrap">
            {activeExcelColumns.length > 0 && (
              <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTableViewMode('standard')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    tableViewMode === 'standard'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard View
                </button>
                <button
                  type="button"
                  onClick={() => setTableViewMode('excel')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap inline-flex items-center gap-1 ${
                    tableViewMode === 'excel'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel Sheet ({activeExcelColumns.length} Cols)</span>
                </button>
              </div>
            )}

            {/* Class filter */}
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Classes ({students.length})</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls} ({students.filter((s) => s.gradeLevel === cls).length})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('transport')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterStatus === 'transport'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
              }`}
            >
              <Bus className="w-3 h-3" />
              With Transport ({students.filter((s) => (s.transportDues ?? 0) > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('overdue')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterStatus === 'overdue'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Overdue ({students.filter((s) => s.duesStatus === 'Overdue').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('high_dues')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                filterStatus === 'high_dues'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              High Dues (&gt;Rs. 25k) ({students.filter((s) => s.duesOwed >= 25000).length})
            </button>
          </div>
        </div>

        {/* Database Grid Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          {tableViewMode === 'excel' && activeExcelColumns.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  {activeExcelColumns.map((col) => (
                    <th key={col} className="py-3 px-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-right sticky right-0 bg-slate-50 border-l border-slate-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors text-slate-800">
                    {activeExcelColumns.map((col, cIdx) => {
                      const role = s.excelColumnRoles?.[col] || 'student';
                      const rawVal = s.excelRawColumns?.[col] ?? '—';
                      return (
                        <td
                          key={col}
                          className={`py-2.5 px-3 whitespace-nowrap ${
                            role === 'total'
                              ? 'font-mono font-bold text-rose-600 tabular-nums'
                              : role === 'fee' || role === 'monthly'
                              ? 'font-mono tabular-nums text-slate-700'
                              : cIdx <= 2
                              ? 'font-semibold text-slate-900'
                              : 'text-slate-700'
                          }`}
                        >
                          {cIdx === 0 || col.toLowerCase().includes('name') ? (
                            <button
                              type="button"
                              onClick={() => setSelectedStudentDetail(s)}
                              className="text-left font-bold text-blue-700 hover:underline"
                            >
                              {rawVal || '—'}
                            </button>
                          ) : (
                            rawVal || '—'
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap sticky right-0 bg-white border-l border-slate-100">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentDetail(s)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View Full Student & Fee Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onQuickSend(s)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Quick Send Notice"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Class & Roll</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Father Name</th>
                <th className="py-3 px-3">Contact (Mobile)</th>
                <th className="py-3 px-3">Village / Address</th>
                <th className="py-3 px-3">Tuition (Rs.)</th>
                <th className="py-3 px-3">Transport (Rs.)</th>
                <th className="py-3 px-3 font-bold text-slate-900">Total Dues (Rs.)</th>
                <th className="py-3 px-3">Expected Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center">
                    {students.length === 0 ? (
                      <div className="max-w-md mx-auto flex flex-col items-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-3 shadow-inner">
                          <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Student Database Register is Cleared
                        </h3>
                        <p className="text-xs text-slate-500 mt-1 mb-5 leading-relaxed">
                          All student records have been removed from the current session. You can restore the official 20 school records, upload a new CSV/Excel file, or add records individually.
                        </p>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          <button
                            type="button"
                            onClick={handleResetToOfficialCSV}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reload School CSV (20 Records)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload CSV / Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Student</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 flex flex-col items-center justify-center text-slate-500">
                        <Search className="w-6 h-6 text-slate-300 mb-2" />
                        <p className="text-xs font-medium text-slate-700">No matching student records found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          None of the {students.length} students matched your current search or class/dues filter.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setFilterClass('all');
                            setFilterStatus('all');
                          }}
                          className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Reset Filters & Show All {students.length} Records
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isEditing = editingStudentId === s.id;
                  const isPhoneValid = isValidMobileNumber(s.parentMobile);

                  if (isEditing) {
                    return (
                      <tr key={s.id} className="bg-blue-50/60">
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editForm.gradeLevel || ''}
                            onChange={(e) => setEditForm({ ...editForm, gradeLevel: e.target.value })}
                            className="w-24 px-2 py-1 text-xs border rounded bg-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editForm.studentName || ''}
                            onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                            className="w-full px-2 py-1 text-xs border rounded bg-white font-semibold"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editForm.fatherName || ''}
                            onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value, parentName: e.target.value })}
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editForm.parentMobile || ''}
                            onChange={(e) => setEditForm({ ...editForm, parentMobile: e.target.value })}
                            className="w-full px-2 py-1 text-xs border rounded bg-white font-mono"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editForm.address || ''}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={editForm.tuitionDues ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, tuitionDues: Number(e.target.value) })}
                            className="w-20 px-2 py-1 text-xs border rounded bg-white font-mono"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            value={editForm.transportDues ?? 0}
                            onChange={(e) => setEditForm({ ...editForm, transportDues: Number(e.target.value) })}
                            className="w-20 px-2 py-1 text-xs border rounded bg-white font-mono"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-600">
                          {formatCurrency((Number(editForm.tuitionDues) || 0) + (Number(editForm.transportDues) || 0) + (Number(editForm.lateFee) || 0))}
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={editForm.expectedPaymentDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, expectedPaymentDate: e.target.value })}
                            className="w-24 px-2 py-1 text-xs border rounded bg-white"
                          />
                        </td>
                        <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingStudentId(null)}
                            className="px-2.5 py-1 text-xs bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 transition-colors group text-slate-800"
                    >
                      {/* Class & Roll */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block">{s.gradeLevel}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          Roll: {s.rollNo} • Enr: {s.enrollmentNo}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-3">
                        <div
                          className="font-bold text-blue-700 hover:underline cursor-pointer"
                          onClick={() => setSelectedStudentDetail(s)}
                          title="Click to view full fee ledger & monthly breakdown"
                        >
                          {s.studentName}
                        </div>
                      </td>

                      {/* Father Name */}
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {s.fatherName || s.parentName}
                      </td>

                      {/* Contact Mobile */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-slate-800">
                          <Phone className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{formatPhoneNumber(s.parentMobile)}</span>
                          {isPhoneValid && (
                            <span title="Valid Indian mobile contact">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Address / Village */}
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="truncate text-slate-600 flex items-center gap-1" title={s.address}>
                          <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                          <span className="truncate">{s.address || 'Muzaffarpur'}</span>
                        </div>
                      </td>

                      {/* Tuition Dues */}
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {formatCurrency(s.tuitionDues ?? 0)}
                      </td>

                      {/* Transport Dues */}
                      <td className="py-3 px-3 font-mono whitespace-nowrap">
                        {(s.transportDues ?? 0) > 0 ? (
                          <span className="text-indigo-600 font-semibold flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            {formatCurrency(s.transportDues)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Total Dues */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                        <span className="text-rose-600">
                          {formatCurrency(s.duesOwed)}
                        </span>
                      </td>

                      {/* Expected Payment Date */}
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {s.expectedPaymentDate || s.duesDueDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectStudentForPreview(s)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview Personalized Message on Phone"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenIndividualOverride(s)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Customize Message for this Parent"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <a
                            href={generateWhatsAppWebUrl(
                              s.parentMobile,
                              `*FEE DUES NOTICE - SCHOOL ACCOUNTS*\n\nDear Parent/Guardian of *${s.studentName}*,\nRoll No: ${s.rollNo} | Class: ${s.gradeLevel}\nEnrollment: ${s.enrollmentNo}\n\n*Fee Breakdown:*\n• Tuition Dues: ${formatCurrency(s.tuitionDues ?? 0)}\n• Transport Dues: ${formatCurrency(s.transportDues ?? 0)}\n• Total Dues Owed: *${formatCurrency(s.duesOwed)}*\n\nPlease clear the pending amount before *${s.expectedPaymentDate || s.duesDueDate}*.\n\nThank you,\nAccounts Department`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center"
                            title="Open chat in WhatsApp Web"
                          >
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onQuickSend(s)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Quick Dispatch via WhatsApp/SMS"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(s)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Record"
                          >
                            <span className="text-[10px] font-semibold uppercase">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(s.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Student Details & Fee Ledger Modal Drawer */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedStudentDetail.studentName}
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {selectedStudentDetail.gradeLevel}
                  </span>
                  <span className="text-xs font-mono text-slate-500">
                    Roll: {selectedStudentDetail.rollNo} • Enrollment: {selectedStudentDetail.enrollmentNo}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Father: <span className="font-semibold text-slate-700">{selectedStudentDetail.fatherName}</span> • Contact: <span className="font-mono text-slate-700">{formatPhoneNumber(selectedStudentDetail.parentMobile)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Address and Contact info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-slate-700 font-medium">
                  Address: {selectedStudentDetail.address || 'Vill- Marwan, Muzaffarpur, Bihar'}
                </span>
              </div>

              {/* Dues Summary Bar */}
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-[10px] text-amber-800 uppercase font-semibold">Tuition Dues</div>
                  <div className="text-base font-bold text-amber-900 font-mono mt-0.5">
                    {formatCurrency(selectedStudentDetail.tuitionDues)}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200">
                  <div className="text-[10px] text-indigo-800 uppercase font-semibold">Transport Dues</div>
                  <div className="text-base font-bold text-indigo-900 font-mono mt-0.5">
                    {formatCurrency(selectedStudentDetail.transportDues)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Late Fee (LF)</div>
                  <div className="text-base font-bold text-slate-700 font-mono mt-0.5">
                    {formatCurrency(selectedStudentDetail.lateFee)}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                  <div className="text-[10px] text-rose-800 uppercase font-semibold">Total Payable</div>
                  <div className="text-base font-bold text-rose-700 font-mono mt-0.5">
                    {formatCurrency(selectedStudentDetail.duesOwed)}
                  </div>
                </div>
              </div>

              {/* Monthly breakdown from April to October if available */}
              {selectedStudentDetail.monthlyFeeBreakdown && (
                <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
                  <div className="font-semibold text-slate-800 text-xs flex items-center justify-between">
                    <span>Monthly Fee Breakdown (April - October):</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Due Months: {selectedStudentDetail.dueMonths}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px]">
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">Apr</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.april)}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">May</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.may)}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">Jun</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.june)}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">Jul</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.july)}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">Aug</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.august)}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">Sep</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.september)}</div>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded">
                      <div className="text-[10px] text-slate-400 font-sans">Oct</div>
                      <div className="font-bold">{formatCurrency(selectedStudentDetail.monthlyFeeBreakdown.october)}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Payment Record */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-emerald-900">Last Payment Record (LPR):</span>
                  <div className="font-mono text-emerald-800 mt-0.5">
                    {selectedStudentDetail.lastPaymentRecord || 'None recorded'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Expected Date:</span>
                  <div className="font-bold text-slate-800 font-mono">
                    {selectedStudentDetail.expectedPaymentDate || selectedStudentDetail.duesDueDate}
                  </div>
                </div>
              </div>

              {/* Full Uploaded Excel Sheet Columns Breakdown (when uploaded via CSV/Excel) */}
              {selectedStudentDetail.excelColumnOrder &&
                selectedStudentDetail.excelColumnOrder.length > 0 &&
                selectedStudentDetail.excelRawColumns && (
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70 space-y-2.5 max-h-52 overflow-y-auto">
                    <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                      <span>Uploaded Excel Sheet Full Columns ({selectedStudentDetail.excelColumnOrder.length})</span>
                      <span className="text-[11px] font-medium text-emerald-700">Synced with PDF Studio</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedStudentDetail.excelColumnOrder.map((col) => {
                        const role = selectedStudentDetail.excelColumnRoles?.[col] || 'student';
                        if (role === 'ignore') return null;
                        return (
                          <div
                            key={col}
                            className="bg-white rounded-lg border border-slate-200 px-2.5 py-1.5"
                          >
                            <div className="text-[10px] font-semibold text-slate-500 truncate">
                              {col}
                            </div>
                            <div className="text-xs font-bold text-slate-900 truncate tabular-nums">
                              {selectedStudentDetail.excelRawColumns?.[col] || '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  onSelectStudentForPreview(selectedStudentDetail);
                  setSelectedStudentDetail(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Message Template</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentDetail(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
                >
                  Close
                </button>
                <a
                  href={generateWhatsAppWebUrl(
                    selectedStudentDetail.parentMobile,
                    `*FEE DUES NOTICE - SCHOOL ACCOUNTS*\n\nDear Parent/Guardian of *${selectedStudentDetail.studentName}*,\nRoll No: ${selectedStudentDetail.rollNo} | Class: ${selectedStudentDetail.gradeLevel}\nEnrollment: ${selectedStudentDetail.enrollmentNo}\n\n*Fee Breakdown:*\n• Tuition Dues: ${formatCurrency(selectedStudentDetail.tuitionDues ?? 0)}\n• Transport Dues: ${formatCurrency(selectedStudentDetail.transportDues ?? 0)}\n• Late Fee: ${formatCurrency(selectedStudentDetail.lateFee ?? 0)}\n• Total Dues Owed: *${formatCurrency(selectedStudentDetail.duesOwed)}*\n\nPlease clear the pending amount before *${selectedStudentDetail.expectedPaymentDate || selectedStudentDetail.duesDueDate}*.\n\nThank you,\nAccounts Department`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 fill-current" />
                  <span>Open in WhatsApp Web</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    onQuickSend(selectedStudentDetail);
                    setSelectedStudentDetail(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Dues Notice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Record Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Add New Student to Register</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class</label>
                  <input
                    type="text"
                    value={newStudent.gradeLevel}
                    onChange={(e) => setNewStudent({ ...newStudent, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Roll No</label>
                  <input
                    type="text"
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Enrollment No</label>
                  <input
                    type="text"
                    value={newStudent.enrollmentNo}
                    onChange={(e) => setNewStudent({ ...newStudent, enrollmentNo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={newStudent.studentName}
                    onChange={(e) => setNewStudent({ ...newStudent, studentName: e.target.value })}
                    placeholder="e.g. Rahul Kumar"
                    className="w-full px-3 py-2 border rounded-xl font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Father Name</label>
                  <input
                    type="text"
                    value={newStudent.fatherName}
                    onChange={(e) => setNewStudent({ ...newStudent, fatherName: e.target.value, parentName: e.target.value })}
                    placeholder="e.g. Mr. Rajesh Kumar"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Mobile</label>
                  <input
                    type="text"
                    value={newStudent.parentMobile}
                    onChange={(e) => setNewStudent({ ...newStudent, parentMobile: e.target.value })}
                    placeholder="e.g. 9801278254"
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Address / Village</label>
                  <input
                    type="text"
                    value={newStudent.address}
                    onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                    placeholder="e.g. Vill- Marwan"
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tuition Dues (Rs.)</label>
                  <input
                    type="number"
                    value={newStudent.tuitionDues}
                    onChange={(e) => setNewStudent({ ...newStudent, tuitionDues: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transport (Rs.)</label>
                  <input
                    type="number"
                    value={newStudent.transportDues}
                    onChange={(e) => setNewStudent({ ...newStudent, transportDues: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Late Fee (Rs.)</label>
                  <input
                    type="number"
                    value={newStudent.lateFee}
                    onChange={(e) => setNewStudent({ ...newStudent, lateFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs"
              >
                Add Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Records Confirmation Modal */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Clear All Student Records?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to clear all{' '}
                  <span className="font-semibold text-slate-800">{students.length}</span> records
                  from the active database register?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 bg-slate-50/70 border-b border-slate-100 text-xs text-slate-600 space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Records to be cleared:</span>
                <span className="font-bold text-slate-900 font-mono">{students.length} students</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Total fees recorded:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {formatCurrency(students.reduce((acc, s) => acc + (s.duesOwed || 0), 0))}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2 mt-2">
                <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Safe & Restorable:</strong> You can restore the official 20 school records at any time by clicking <strong>"Reload School CSV (20)"</strong>.
                </span>
              </div>
            </div>

            <div className="p-4 bg-white flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStudents([]);
                  setIsClearConfirmOpen(false);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All Records</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel / CSV Full-Column Database & Header Mapping Modal */}
      {importReview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excel / CSV Full-Column Database &amp; PDF Data Headers
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  File: <strong className="text-slate-800">{importReview.fileName}</strong> · Sheet:{' '}
                  <strong className="text-slate-800">{importReview.sheetName}</strong> ·{' '}
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    {importReview.records.length} Students &amp; {importReview.mappings.length} Columns Ready
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportReview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold">All Excel Columns Captured for Database &amp; Pending Dues PDF</div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    Rename any Data Header below if needed or verify its PDF section (Student Details / Fee Details / Monthly Dues / Total Dues). All PDF styles, borders, logo &amp; features stay identical.
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 p-1 bg-white rounded-lg border border-emerald-200">
                  <button
                    type="button"
                    onClick={() => setImportReview({ ...importReview, insertMode: 'replace' })}
                    className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${
                      importReview.insertMode === 'replace'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Replace Database
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportReview({ ...importReview, insertMode: 'append' })}
                    className={`px-2.5 py-1 rounded-md font-semibold whitespace-nowrap ${
                      importReview.insertMode === 'append'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Append ({students.length} + {importReview.records.length})
                  </button>
                </div>
              </div>

              {/* Column Header & Role Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {importReview.mappings.map((m, idx) => (
                  <div
                    key={m.originalHeader}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-2.5"
                  >
                    <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-mono font-bold text-slate-500 shrink-0 tabular-nums">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-slate-500 truncate">
                        Excel Col: <span className="font-mono">{m.originalHeader}</span>
                      </div>
                      <input
                        type="text"
                        value={m.displayHeader}
                        onChange={(e) => {
                          const nextMappings = [...importReview.mappings];
                          nextMappings[idx] = { ...m, displayHeader: e.target.value };
                          setImportReview({ ...importReview, mappings: nextMappings });
                        }}
                        className="mt-0.5 w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900"
                        title="Customize Data Header for Database & PDF"
                      />
                    </div>
                    <select
                      value={m.role}
                      onChange={(e) => {
                        const nextMappings = [...importReview.mappings];
                        nextMappings[idx] = {
                          ...m,
                          role: e.target.value as ExcelColumnRole,
                        };
                        setImportReview({ ...importReview, mappings: nextMappings });
                      }}
                      className="px-2 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-300 bg-white text-slate-800 shrink-0"
                    >
                      <option value="student">Student Details</option>
                      <option value="fee">Fee Details</option>
                      <option value="monthly">Monthly Dues</option>
                      <option value="total">Total Dues</option>
                      <option value="ignore">Hide in PDF</option>
                    </select>
                  </div>
                ))}
              </div>

              {/* Sample Preview Rows */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-800">
                  Preview First 3 Rows (Student Details &amp; Fee Details):
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        {importReview.mappings.map((m) => (
                          <th key={m.originalHeader} className="py-2 px-2.5 whitespace-nowrap font-bold">
                            {m.displayHeader || m.originalHeader}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {importReview.records.slice(0, 3).map((rec) => (
                        <tr key={rec.id}>
                          {importReview.mappings.map((m) => (
                            <td key={m.originalHeader} className="py-2 px-2.5 whitespace-nowrap font-mono text-slate-700">
                              {rec.excelRawColumns?.[m.originalHeader] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setImportReview(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExcelInsert}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-2 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Insert All Student &amp; Fee Details into Database ({importReview.records.length} Records)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
