import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { StudentRecord, MessageTemplate, DispatchLog } from '../types';
import {
  generateWhatsAppWebUrl,
  generateWaMeUrl,
  renderPersonalizedMessage,
  formatCurrency,
  formatPhoneNumber,
  getWhatsAppPhoneDigits,
} from '../utils/templateEngine';
import { CustomDurationSelector } from './CustomDurationSelector';
import { AutoSendHelpModal } from './AutoSendHelpModal';
import { FormattedMessageText } from './FormattedMessageText';
import {
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Smartphone,
  Sparkles,
  Users,
  Search,
  Filter,
  DollarSign,
  AlertCircle,
  RotateCcw,
  X,
  Zap,
  Play,
  Pause,
  FastForward,
  CheckCheck,
  FileSpreadsheet,
  Server,
  Download,
  FileText,
} from 'lucide-react';

interface WhatsAppWebHubProps {
  students: StudentRecord[];
  templates: MessageTemplate[];
  onLogDispatch: (log: DispatchLog) => void;
  onSelectStudentForPreview: (student: StudentRecord) => void;
  initialOpenOneClickModal?: boolean;
  onCloseOneClickModal?: () => void;
  onNavigateToLoginServer?: () => void;
  onOpenDirectMessageModal?: () => void;
  onOpenInstallationModal?: () => void;
  onOpenPdfStudio?: (student?: StudentRecord) => void;
}

export const WhatsAppWebHub: React.FC<WhatsAppWebHubProps> = ({
  students,
  templates,
  onLogDispatch,
  onSelectStudentForPreview,
  initialOpenOneClickModal,
  onCloseOneClickModal,
  onNavigateToLoginServer,
  onOpenDirectMessageModal,
  onOpenInstallationModal,
  onOpenPdfStudio,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.channel === 'WhatsApp')?.id || templates[0].id
  );
  const [urlMode, setUrlMode] = useState<'web_direct' | 'wa_me'>('web_direct');
  const [sentStudentIds, setSentStudentIds] = useState<Set<string>>(new Set());
  const [queueIndex, setQueueIndex] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [cohortFilter, setCohortFilter] = useState<'all' | 'dues' | 'overdue' | 'transport'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // 1-Click Multi-Record Sender state
  const [isOneClickModalOpen, setIsOneClickModalOpen] = useState(initialOpenOneClickModal ?? false);
  const [autoIndex, setAutoIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoIntervalSec, setAutoIntervalSec] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);
  const [batchSendCompleted, setBatchSendCompleted] = useState(false);

  // Auto-send and auto-close tab controls
  const [autoClickSendCommand, setAutoClickSendCommand] = useState(true);
  const [autoCloseTab, setAutoCloseTab] = useState(true);
  const [autoCloseDelaySec, setAutoCloseDelaySec] = useState(8);
  const [closePreviousTab, setClosePreviousTab] = useState(true);
  const [isAutoSendHelpOpen, setIsAutoSendHelpOpen] = useState(false);
  const [tabStatusNotice, setTabStatusNotice] = useState<string | null>(null);

  const lastOpenedWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (initialOpenOneClickModal) {
      setIsOneClickModalOpen(true);
      setAutoIndex(0);
      setBatchSendCompleted(false);
    }
  }, [initialOpenOneClickModal]);

  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Filtered queue
  const queueStudents = students.filter((s) => {
    const q = searchFilter.toLowerCase().trim();
    const matches =
      !q ||
      s.studentName.toLowerCase().includes(q) ||
      (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
      s.parentMobile.includes(q) ||
      s.gradeLevel.toLowerCase().includes(q);

    if (!matches) return false;

    if (cohortFilter === 'dues') return s.duesOwed > 0;
    if (cohortFilter === 'overdue') return s.duesStatus === 'Overdue';
    if (cohortFilter === 'transport') return (s.transportDues ?? 0) > 0;

    return true;
  });

  const currentStudent = queueStudents[queueIndex] || queueStudents[0];

  const handleMarkSent = (student: StudentRecord) => {
    setSentStudentIds((prev) => new Set(prev).add(student.id));

    const rendered = renderPersonalizedMessage(activeTemplate.body, student);
    const newLog: DispatchLog = {
      id: `wa-web-${Date.now()}-${student.id}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      studentId: student.enrollmentNo || student.studentId,
      studentName: student.studentName,
      parentName: student.fatherName || student.parentName,
      parentMobile: student.parentMobile,
      channel: 'WhatsApp',
      messageText: rendered,
      duesOwedAtDispatch: student.duesOwed,
      gpaAtDispatch: student.gpa,
      attendanceAtDispatch: student.attendanceRate,
      status: 'Sent',
    };
    onLogDispatch(newLog);
  };

  const handleNextInQueue = () => {
    if (currentStudent) {
      handleMarkSent(currentStudent);
    }
    if (queueIndex < queueStudents.length - 1) {
      setQueueIndex((prev) => prev + 1);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getUrlForStudent = (student: StudentRecord) => {
    const message = renderPersonalizedMessage(activeTemplate.body, student, {
      design: activeTemplate.design,
      allStudents: students,
    });
    let base = urlMode === 'web_direct'
      ? generateWhatsAppWebUrl(student.parentMobile, message)
      : generateWaMeUrl(student.parentMobile, message);
    if (autoClickSendCommand) {
      base += '#autosend=1&autoclose=1';
    }
    return base;
  };

  // Open WhatsApp Web tab with auto-close timer and previous tab management
  const openAndManageWhatsAppTab = (student: StudentRecord) => {
    // 1. Close previously opened student tab if enabled to avoid tab clutter
    if (closePreviousTab && lastOpenedWindowRef.current && !lastOpenedWindowRef.current.closed) {
      try {
        lastOpenedWindowRef.current.close();
      } catch (err) {
        console.warn('Could not close previous tab:', err);
      }
    }

    const url = getUrlForStudent(student);
    // Note: Do NOT pass 'noopener,noreferrer' so we retain the Window reference to close it!
    const win = window.open(url, '_blank');
    lastOpenedWindowRef.current = win;

    // 2. Schedule automatic tab close after sending
    if (autoCloseTab && win) {
      setTabStatusNotice(`Tab opened for ${student.studentName} — Auto-closing in ${autoCloseDelaySec}s...`);
      setTimeout(() => {
        try {
          if (!win.closed) {
            win.close();
            setTabStatusNotice(`Auto-closed WhatsApp tab for ${student.studentName}`);
            setTimeout(() => setTabStatusNotice(null), 3000);
          }
        } catch (e) {
          console.warn('Could not auto-close tab:', e);
        }
      }, autoCloseDelaySec * 1000);
    }

    return win;
  };

  // 1-Click Multi-Sender Auto Runner countdown effect
  useEffect(() => {
    if (!isAutoPlaying || !isOneClickModalOpen) return;

    if (autoIndex >= queueStudents.length) {
      setIsAutoPlaying(false);
      setBatchSendCompleted(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const studentToOpen = queueStudents[autoIndex];
          if (studentToOpen) {
            openAndManageWhatsAppTab(studentToOpen);
            handleMarkSent(studentToOpen);
          }

          if (autoIndex + 1 < queueStudents.length) {
            setAutoIndex((idx) => idx + 1);
            return autoIntervalSec;
          } else {
            setIsAutoPlaying(false);
            setBatchSendCompleted(true);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    isAutoPlaying,
    isOneClickModalOpen,
    autoIndex,
    queueStudents,
    autoIntervalSec,
    autoCloseTab,
    autoCloseDelaySec,
    closePreviousTab,
    autoClickSendCommand,
  ]);

  // Fast 1-Click Send current step and advance
  const handleStepSendAndNext = () => {
    const student = queueStudents[autoIndex];
    if (!student) return;

    openAndManageWhatsAppTab(student);
    handleMarkSent(student);

    if (autoIndex + 1 < queueStudents.length) {
      setAutoIndex((prev) => prev + 1);
      setCountdown(autoIntervalSec);
    } else {
      setBatchSendCompleted(true);
    }
  };

  // Instant 1-Click Mark All as Dispatched in Audit Trail
  const handleMarkAllAsDispatched = () => {
    queueStudents.forEach((student) => {
      handleMarkSent(student);
    });
    setBatchSendCompleted(true);
  };

  // Copy all formatted messages and URLs to clipboard
  const handleCopyAllLinksAndText = () => {
    const lines = queueStudents
      .map((s, idx) => {
        const msg = renderPersonalizedMessage(activeTemplate.body, s);
        const url = getUrlForStudent(s);
        return `[#${idx + 1}] ${s.studentName} | Father: ${s.fatherName || s.parentName} | Mobile: ${s.parentMobile} | Dues: Rs. ${s.duesOwed}\nWhatsApp Link: ${url}\nMessage Body:\n${msg}\n${'='.repeat(50)}`;
      })
      .join('\n\n');

    navigator.clipboard.writeText(lines);
    setCopyAllSuccess(true);
    setTimeout(() => setCopyAllSuccess(false), 2500);
  };

  // Export WhatsApp Web Dispatch Sheet (.xlsx)
  const handleExportWhatsAppExcel = () => {
    const data = queueStudents.map((s, idx) => ({
      'S.No': idx + 1,
      'Class': s.gradeLevel,
      'Roll': s.rollNo,
      'Student Name': s.studentName,
      'Father Name': s.fatherName || s.parentName,
      'Mobile Number': s.parentMobile,
      'Address': s.address,
      'Tuition Dues (Rs.)': s.tuitionDues ?? 0,
      'Transport Dues (Rs.)': s.transportDues ?? 0,
      'Total Dues (Rs.)': s.duesOwed,
      'WhatsApp Web URL': getUrlForStudent(s),
      'Personalized Notice Text': renderPersonalizedMessage(activeTemplate.body, s),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'WhatsApp Direct Send List');
    XLSX.writeFile(workbook, `WhatsApp_Web_Send_All_${queueStudents.length}_Records.xlsx`);
  };

  const handleCloseOneClickModal = () => {
    setIsOneClickModalOpen(false);
    setIsAutoPlaying(false);
    if (onCloseOneClickModal) onCloseOneClickModal();
  };

  const totalDuesInQueue = queueStudents.reduce((acc, s) => acc + (s.duesOwed || 0), 0);
  const sentCount = queueStudents.filter((s) => sentStudentIds.has(s.id)).length;
  const progressPercent = Math.round((sentCount / Math.max(queueStudents.length, 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner & Connection Status */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Kidzee School — WhatsApp Web Dispatch Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Kidzee Official Web Sender
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Send personalized dues notices directly to parent mobile numbers using logged-in WhatsApp Web as Kidzee School
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Web Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setUrlMode('web_direct')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                urlMode === 'web_direct'
                  ? 'bg-white shadow-xs text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Opens web.whatsapp.com directly (Ideal for logged-in desktop WhatsApp Web)"
            >
              web.whatsapp.com
            </button>
            <button
              type="button"
              onClick={() => setUrlMode('wa_me')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                urlMode === 'wa_me'
                  ? 'bg-white shadow-xs text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Universal wa.me link (Works on phone or desktop app)"
            >
              wa.me Direct
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setAutoIndex(0);
              setBatchSendCompleted(false);
              setIsOneClickModalOpen(true);
            }}
            disabled={queueStudents.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Launch 1-Click automated sender for all records in the queue"
          >
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse" />
            <span>1-Click Send All Records ({queueStudents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Web Login Guide</span>
          </button>

          {onNavigateToLoginServer && (
            <button
              type="button"
              onClick={onNavigateToLoginServer}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Login Server (Port 3000)</span>
            </button>
          )}

          {onOpenDirectMessageModal && (
            <button
              type="button"
              onClick={onOpenDirectMessageModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs transition-all active:scale-98"
              title="Send direct text or WhatsApp message to any phone number using Kidzee School"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct Message (Kidzee School)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAutoSendHelpOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs transition-all active:scale-98"
            title="Setup auto-clicking Send button and auto-closing WhatsApp Web tabs"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Auto-Click & Close Setup</span>
          </button>

          {onOpenPdfStudio && (
            <button
              type="button"
              onClick={() => onOpenPdfStudio(currentStudent)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-2xs transition-all active:scale-98"
              title="Customize & automatically send Pending Dues PDF via WhatsApp"
            >
              <FileText className="w-3.5 h-3.5 text-amber-700" />
              <span>Pending Dues PDF Auto-Send</span>
            </button>
          )}

          {onOpenInstallationModal && (
            <button
              type="button"
              onClick={onOpenInstallationModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all active:scale-98"
              title="Download 1-click Windows installer (install.bat), Mac/Linux scripts, or complete offline ZIP package"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Installer</span>
            </button>
          )}
        </div>
      </div>

      {/* Step Instruction Card */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-emerald-900 text-sm">How WhatsApp Web Sending Works:</span>
            <p className="text-emerald-800 mt-0.5">
              1. Log into your school WhatsApp at <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline">web.whatsapp.com</a>.
              <br />
              2. Click <span className="font-semibold text-emerald-950">"Send via WhatsApp Web"</span> on any student. A new tab opens directly in WhatsApp Web with the parent's contact number (<span className="font-mono font-semibold">+91 ...</span>) and pre-filled personalized dues breakdown ready to send!
            </p>
          </div>
        </div>

        <a
          href="https://web.whatsapp.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs shrink-0 transition-colors"
        >
          <span>Open WhatsApp Web</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Queue Focus Runner Card & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Current Parent in Queue (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Send className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Active Dispatch Queue
                </h3>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Sent: <span className="font-bold text-emerald-600">{sentCount}</span> / {queueStudents.length} parents
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Current Target Parent Card */}
            {currentStudent ? (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">
                        {currentStudent.studentName}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {currentStudent.gradeLevel}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Roll: {currentStudent.rollNo} • Enr: {currentStudent.enrollmentNo}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                      <span>Father: <strong className="text-slate-800">{currentStudent.fatherName || currentStudent.parentName}</strong></span>
                      <span>•</span>
                      <span className="font-mono font-semibold text-emerald-700 flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        {formatPhoneNumber(currentStudent.parentMobile)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Dues</div>
                    <div className="font-mono font-bold text-rose-600 text-lg">
                      {formatCurrency(currentStudent.duesOwed)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Due: {currentStudent.expectedPaymentDate || currentStudent.duesDueDate}
                    </div>
                  </div>
                </div>

                {/* Message Draft Preview in WhatsApp green styling */}
                <div
                  className="rounded-xl p-3 bg-[#005c4b] text-[#e9edef] text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-xs max-h-52 overflow-y-auto"
                  style={
                    activeTemplate.design?.fullBorderBox ||
                    activeTemplate.design?.borderStyle === 'full-box'
                      ? {
                          border: `2px solid ${
                            activeTemplate.design?.accentColor || '#34d399'
                          }`,
                        }
                      : undefined
                  }
                >
                  <FormattedMessageText
                    text={renderPersonalizedMessage(activeTemplate.body, currentStudent, {
                      design: activeTemplate.design,
                      allStudents: students,
                    })}
                  />
                </div>

                {/* Primary Action Button to Send in WhatsApp Web */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          renderPersonalizedMessage(activeTemplate.body, currentStudent),
                          currentStudent.id
                        )
                      }
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1"
                    >
                      {copiedId === currentStudent.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Text</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectStudentForPreview(currentStudent)}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                    >
                      View on Phone
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setAutoIndex(queueIndex);
                        setBatchSendCompleted(false);
                        setIsOneClickModalOpen(true);
                      }}
                      className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors"
                      title="Launch 1-click batch runner for all parents in queue"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                      <span>1-Click Send All</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextInQueue}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1"
                    >
                      <span>Skip / Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={getUrlForStudent(currentStudent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleMarkSent(currentStudent)}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-2 transition-all active:scale-98"
                    >
                      <MessageSquare className="w-4 h-4 fill-current" />
                      <span>Send to {currentStudent.fatherName || currentStudent.parentName} via WhatsApp Web</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                No students in queue matching the active filters.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Template Selector & Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              WhatsApp Message Template Settings
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Active Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.channel})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Parent Cohort
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setCohortFilter('all');
                    setQueueIndex(0);
                  }}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    cohortFilter === 'all'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>All Parents</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {students.length} recipients
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCohortFilter('overdue');
                    setQueueIndex(0);
                  }}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    cohortFilter === 'overdue'
                      ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>Overdue Dues Only</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {students.filter((s) => s.duesStatus === 'Overdue').length} recipients
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCohortFilter('transport');
                    setQueueIndex(0);
                  }}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    cohortFilter === 'transport'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>With Transport</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {students.filter((s) => (s.transportDues ?? 0) > 0).length} recipients
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCohortFilter('dues');
                    setQueueIndex(0);
                  }}
                  className={`p-2 rounded-xl border text-left font-medium transition-all ${
                    cohortFilter === 'dues'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div>All with Dues</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    {students.filter((s) => s.duesOwed > 0).length} recipients
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Cohort Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Recipients in Queue:</span>
                <span className="font-bold text-slate-900">{queueStudents.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Dues in Queue:</span>
                <span className="font-bold text-rose-600 font-mono">
                  {formatCurrency(totalDuesInQueue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Gateway URL:</span>
                <span className="font-mono text-emerald-700 font-medium">
                  {urlMode === 'web_direct' ? 'web.whatsapp.com/send' : 'wa.me/91...'}
                </span>
              </div>
            </div>

            {sentStudentIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSentStudentIds(new Set())}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Sent Status Checklist</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Complete Student WhatsApp Dispatch Directory Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setQueueIndex(0);
              }}
              placeholder="Search student, father, village, or mobile..."
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Showing {queueStudents.length} parent contacts
            </span>
            <button
              type="button"
              onClick={() => {
                setAutoIndex(0);
                setBatchSendCompleted(false);
                setIsOneClickModalOpen(true);
              }}
              disabled={queueStudents.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span>1-Click Send All ({queueStudents.length})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Class & Roll</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Father Name</th>
                <th className="py-3 px-3">Parent Contact (Mobile)</th>
                <th className="py-3 px-3">Village / Address</th>
                <th className="py-3 px-3">Total Dues (Rs.)</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Send via WhatsApp Web</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {queueStudents.map((s, idx) => {
                const isSent = sentStudentIds.has(s.id);
                const waUrl = getUrlForStudent(s);

                return (
                  <tr
                    key={s.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSent ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{s.gradeLevel}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Roll: {s.rollNo} • Enr: {s.enrollmentNo}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900">{s.studentName}</span>
                    </td>

                    <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                      {s.fatherName || s.parentName}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-mono font-medium text-slate-800 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{formatPhoneNumber(s.parentMobile)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {s.address}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-rose-600 whitespace-nowrap">
                      {formatCurrency(s.duesOwed)}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {isSent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Sent on Web
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 w-fit block">
                          Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              renderPersonalizedMessage(activeTemplate.body, s),
                              s.id
                            )
                          }
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="Copy personalized text"
                        >
                          {copiedId === s.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {onOpenPdfStudio && (
                          <button
                            type="button"
                            onClick={() => onOpenPdfStudio(s)}
                            className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1"
                            title="Open colorful Pending Dues PDF & WhatsApp Sender for this student"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                            <span>Dues PDF</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            openAndManageWhatsAppTab(s);
                            handleMarkSent(s);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-all active:scale-98 ${
                            isSent
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                          title={`Send via WhatsApp Web for ${s.fatherName || s.parentName} (Auto-sends & auto-closes)`}
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-current" />
                          <span>{isSent ? 'Sent (Reopen)' : 'Send via WhatsApp'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code / WhatsApp Web Login Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <QrCode className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  WhatsApp Web Connection Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 text-center space-y-4 text-xs">
              {/* Simulated QR Box */}
              <div className="w-48 h-48 mx-auto bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center text-white relative shadow-inner">
                <div className="w-36 h-36 border-2 border-dashed border-emerald-400/60 rounded-xl flex flex-col items-center justify-center p-2 text-center">
                  <QrCode className="w-16 h-16 text-emerald-400 mb-1" />
                  <span className="text-[10px] text-slate-300 font-mono">
                    Scan via WhatsApp
                  </span>
                </div>
              </div>

              <div className="text-left space-y-2 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">How to link your school WhatsApp:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>Open WhatsApp on your school mobile phone.</li>
                  <li>Tap <strong>Settings / Linked Devices</strong>.</li>
                  <li>Go to <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline">web.whatsapp.com</a> on your computer.</li>
                  <li>Point your phone to scan the QR code on screen.</li>
                </ol>
              </div>

              <p className="text-[11px] text-slate-500">
                Once logged in on your browser, clicking any "Open in WhatsApp Web" button in EduNotify instantly brings up that parent's conversation with pre-typed message!
              </p>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 font-bold text-xs inline-flex items-center gap-1"
              >
                <span>Go to web.whatsapp.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click WhatsApp Web Multi-Record Sender Modal */}
      {isOneClickModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      1-Click WhatsApp Web Sender
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      {queueStudents.length} Records Queued
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Personalized dues notices dispatched via your logged-in WhatsApp Web
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseOneClickModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics & Configuration Strip */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Cohort</span>
                <span className="font-bold text-slate-900 font-mono">{queueStudents.length} Parents</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Fees</span>
                <span className="font-bold text-rose-700 font-mono">{formatCurrency(totalDuesInQueue)}</span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Template</span>
                <span className="font-bold text-slate-800 truncate block" title={activeTemplate.name}>
                  {activeTemplate.name}
                </span>
              </div>
              <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Link</span>
                <span className="font-semibold text-emerald-700 font-mono text-[11px]">
                  {urlMode === 'web_direct' ? 'web.whatsapp.com' : 'wa.me Direct'}
                </span>
              </div>
            </div>

            {/* Body Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {queueStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="font-bold text-slate-800">No records found matching current queue.</p>
                  <p className="text-[11px]">Adjust your filter or reload the official school register.</p>
                </div>
              ) : batchSendCompleted ? (
                <div className="py-8 px-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">
                      All {queueStudents.length} Notices Processed Successfully!
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Dispatches have been recorded in the transmission audit log, and parent records have been stamped with the dispatch date.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAutoIndex(0);
                        setBatchSendCompleted(false);
                      }}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
                    >
                      Start Over
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseOneClickModal}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              ) : (
                (() => {
                  const target = queueStudents[autoIndex] || queueStudents[0];
                  const personalizedMsg = renderPersonalizedMessage(activeTemplate.body, target);
                  const progressPct = Math.round(((autoIndex + 1) / queueStudents.length) * 100);

                  return (
                    <div className="space-y-4">
                      {/* Step Progress Header */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Queue Position: Record {autoIndex + 1} of {queueStudents.length}
                          </span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {progressPct}% Completed
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Current Student Highlight Card */}
                      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">
                                {target.studentName}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {target.gradeLevel} (Roll {target.rollNo})
                              </span>
                            </div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              Father: <strong className="text-slate-800">{target.fatherName || target.parentName}</strong> • {target.address}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-sm text-rose-700">
                              {formatCurrency(target.duesOwed)}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Tuition: {formatCurrency(target.tuitionDues ?? 0)} + Transport: {formatCurrency(target.transportDues ?? 0)}
                            </div>
                          </div>
                        </div>

                        {/* WhatsApp Contact Box */}
                        <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>WhatsApp Contact: <strong>+91 {target.parentMobile}</strong></span>
                          </div>
                          <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            Valid Mobile
                          </span>
                        </div>

                        {/* WhatsApp Message Preview */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-bold text-slate-600">
                              Personalized Message to be Sent:
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {personalizedMsg.length} characters
                            </span>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-sans text-xs whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed shadow-2xs">
                            {personalizedMsg}
                          </div>
                        </div>

                        {/* Big 1-Click Action Button */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleStepSendAndNext}
                            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <MessageSquare className="w-5 h-5 fill-current" />
                            <span>
                              Send via WhatsApp Web & Next ({autoIndex + 1}/{queueStudents.length})
                            </span>
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Automation Controls Strip */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {isAutoPlaying ? (
                              <button
                                type="button"
                                onClick={() => setIsAutoPlaying(false)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs transition-colors"
                              >
                                <Pause className="w-4 h-4" />
                                <span>Pause Auto-Runner</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAutoPlaying(true);
                                  setCountdown(autoIntervalSec);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
                              >
                                <Play className="w-4 h-4" />
                                <span>Start Auto-Send All</span>
                              </button>
                            )}

                            {isAutoPlaying && (
                              <span className="text-xs font-mono text-emerald-800 font-bold bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl animate-pulse flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                Next tab in{' '}
                                {countdown >= 60
                                  ? `${Math.floor(countdown / 60)}m ${countdown % 60}s`
                                  : `${countdown}s`}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500">
                            (Requires browser popup permission for web.whatsapp.com)
                          </div>
                        </div>

                        {/* Custom Duration Selector (Seconds & Minutes) */}
                        <div className="pt-2 border-t border-slate-200/70">
                          <CustomDurationSelector
                            durationMs={autoIntervalSec * 1000}
                            onChangeDurationMs={(ms) => {
                              const sec = Math.max(1, Math.round(ms / 1000));
                              setAutoIntervalSec(sec);
                              if (!isAutoPlaying) setCountdown(sec);
                            }}
                            disabled={isAutoPlaying}
                            label="Auto-Send Interval Duration (Seconds & Minutes)"
                            totalItems={queueStudents.length - autoIndex}
                          />
                        </div>

                        {/* Auto-Click Send Command & Auto-Close Tab Controls */}
                        <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={autoCloseTab}
                                  onChange={(e) => setAutoCloseTab(e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                              </label>
                              <div>
                                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                                  Auto-Close WhatsApp Web Tab After Send
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold uppercase ${
                                    autoCloseTab ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                  }`}>
                                    {autoCloseTab ? 'Enabled' : 'Off'}
                                  </span>
                                </span>
                                <p className="text-[11px] text-slate-500">
                                  Automatically closes the opened WhatsApp Web tab after sending the message.
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsAutoSendHelpOpen(true)}
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline inline-flex items-center gap-1 shrink-0"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              <span>Auto-Click Send Extension</span>
                            </button>
                          </div>

                          {autoCloseTab && (
                            <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-xl">
                              <span className="text-[11px] font-semibold text-emerald-900">
                                Close tab after:
                              </span>
                              {[5, 8, 10, 15, 20].map((sec) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => setAutoCloseDelaySec(sec)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                    autoCloseDelaySec === sec
                                      ? 'bg-emerald-600 text-white shadow-2xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  {sec}s {sec === 8 ? '(Recommended)' : ''}
                                </button>
                              ))}

                              <label className="flex items-center gap-1.5 ml-auto text-[11px] text-emerald-950 font-medium">
                                <input
                                  type="checkbox"
                                  checked={closePreviousTab}
                                  onChange={(e) => setClosePreviousTab(e.target.checked)}
                                  className="rounded text-emerald-600 focus:ring-0"
                                />
                                <span>Close previous tab when next record opens</span>
                              </label>
                            </div>
                          )}

                          {/* Auto-Click Send Command Protocol indicator */}
                          <div className="flex items-center justify-between bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-[11px]">
                            <span className="text-slate-600 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              Auto-Click Send Command Protocol: <strong className="text-slate-800">{autoClickSendCommand ? '#autosend=1 (Active)' : 'Disabled'}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setAutoClickSendCommand((prev) => !prev)}
                              className="text-emerald-700 font-bold hover:underline"
                            >
                              {autoClickSendCommand ? 'Disable' : 'Enable'}
                            </button>
                          </div>

                          {tabStatusNotice && (
                            <div className="text-[11px] font-mono text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-2 animate-pulse">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                              <span>{tabStatusNotice}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Alternative 1-Click Instant Batch Actions */}
                      <div className="pt-2 border-t border-slate-200/80">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">
                          Instant Bulk Tools (All {queueStudents.length} Records)
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={handleMarkAllAsDispatched}
                            className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center gap-1.5 transition-colors"
                            title="Instantly marks all records as sent in the audit log"
                          >
                            <CheckCheck className="w-4 h-4 text-emerald-600" />
                            <span>Mark All Dispatched</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyAllLinksAndText}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            title="Copy all 20 personalized WhatsApp URLs & messages to clipboard"
                          >
                            {copyAllSuccess ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied All!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 text-slate-500" />
                                <span>Copy All Links & Text</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleExportWhatsAppExcel}
                            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            title="Download Excel spreadsheet with direct web.whatsapp.com links"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            <span>Export Dispatch Excel</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Logged in on <a href="https://web.whatsapp.com" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-emerald-700">web.whatsapp.com</a>
              </span>

              <button
                type="button"
                onClick={handleCloseOneClickModal}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Send & Auto-Close Extension & Userscript Setup Modal */}
      <AutoSendHelpModal
        isOpen={isAutoSendHelpOpen}
        onClose={() => setIsAutoSendHelpOpen(false)}
        onSwitchToServerGateway={onNavigateToLoginServer}
      />
    </div>
  );
};
