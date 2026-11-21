import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  PdfCustomizationConfig,
  PdfTemplateItem,
  StudentRecord,
  DispatchLog,
  ExcelColumnRole,
} from '../types';
import {
  PDF_THEME_PRESETS,
  DEFAULT_PDF_CONFIG,
  DEFAULT_PDF_TEMPLATES,
  generatePendingDuesPdfBlob,
  generatePendingDuesPdfFile,
  downloadPendingDuesPdf,
  downloadCombinedPendingDuesPdf,
  buildPendingDuesWhatsAppCaption,
} from '../utils/pdfDuesGenerator';
import {
  formatCurrency,
  formatPhoneNumber,
  generateWhatsAppWebUrl,
  getPdfMonthlyBreakdownEntries,
} from '../utils/templateEngine';
import {
  applyExcelColumnMappings,
  ExcelHeaderMapping,
} from '../utils/reportingEngine';
import { CustomDurationSelector } from './CustomDurationSelector';
import { FormattedMessageText } from './FormattedMessageText';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Palette,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Share2,
  Image as ImageIcon,
  MessageSquare,
  ExternalLink,
  ShieldCheck,
  Eye,
  Zap,
  Plus,
  Copy,
  Layers,
  FileSpreadsheet,
  X,
} from 'lucide-react';

interface PendingDuesPdfStudioProps {
  students: StudentRecord[];
  onUpdateStudents?: (students: StudentRecord[]) => void;
  pdfTemplates: PdfTemplateItem[];
  activePdfTemplateId: string;
  onSelectPdfTemplate: (id: string) => void;
  onUpdatePdfTemplates: (templates: PdfTemplateItem[]) => void;
  onLogDispatch: (log: DispatchLog) => void;
  initialStudentId?: string;
}

export const PendingDuesPdfStudio: React.FC<PendingDuesPdfStudioProps> = ({
  students,
  onUpdateStudents,
  pdfTemplates,
  activePdfTemplateId,
  onSelectPdfTemplate,
  onUpdatePdfTemplates,
  onLogDispatch,
  initialStudentId,
}) => {
  const activePdfTemplate = useMemo(
    () =>
      pdfTemplates.find((t) => t.id === activePdfTemplateId) ||
      pdfTemplates[0] ||
      DEFAULT_PDF_TEMPLATES[0],
    [pdfTemplates, activePdfTemplateId]
  );

  const pdfConfig: PdfCustomizationConfig = activePdfTemplate;

  const onUpdatePdfConfig = (nextConfig: PdfCustomizationConfig) => {
    const updatedItem: PdfTemplateItem = {
      ...activePdfTemplate,
      ...nextConfig,
      id: activePdfTemplate.id,
      name: activePdfTemplate.name,
      description: activePdfTemplate.description,
    };
    onUpdatePdfTemplates(
      pdfTemplates.map((t) => (t.id === activePdfTemplate.id ? updatedItem : t))
    );
  };

  const handleRenameTemplate = (name: string) => {
    onUpdatePdfTemplates(
      pdfTemplates.map((t) =>
        t.id === activePdfTemplate.id ? { ...t, name } : t
      )
    );
  };

  const handleCreatePdfTemplate = () => {
    const newTpl: PdfTemplateItem = {
      ...DEFAULT_PDF_CONFIG,
      id: `pdf-tpl-${Date.now()}`,
      name: `Custom Dues PDF ${pdfTemplates.length + 1}`,
      description: 'Custom colorful Pending Dues PDF template',
    };
    onUpdatePdfTemplates([...pdfTemplates, newTpl]);
    onSelectPdfTemplate(newTpl.id);
    notify('success', `Created new PDF template "${newTpl.name}".`);
  };

  const handleDuplicatePdfTemplate = () => {
    const dup: PdfTemplateItem = {
      ...activePdfTemplate,
      id: `pdf-tpl-${Date.now()}`,
      name: `${activePdfTemplate.name} (Copy)`,
    };
    onUpdatePdfTemplates([...pdfTemplates, dup]);
    onSelectPdfTemplate(dup.id);
    notify('success', `Duplicated template as "${dup.name}".`);
  };

  const handleDeletePdfTemplate = () => {
    if (pdfTemplates.length <= 1) return;
    const remaining = pdfTemplates.filter((t) => t.id !== activePdfTemplate.id);
    onUpdatePdfTemplates(remaining);
    onSelectPdfTemplate(remaining[0].id);
    notify('success', `Deleted PDF template "${activePdfTemplate.name}".`);
  };

  const [cohortFilter, setCohortFilter] = useState<'dues' | 'overdue' | 'transport' | 'all'>('dues');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students.find((s) => s.duesOwed > 0)?.id || students[0]?.id || ''
  );
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [headerEditorMappings, setHeaderEditorMappings] = useState<ExcelHeaderMapping[] | null>(null);

  const excelColumnsInfo = useMemo(() => {
    const sample = students.find((s) => (s.excelColumnOrder?.length ?? 0) > 0);
    if (!sample?.excelColumnOrder) return null;
    return {
      order: sample.excelColumnOrder,
      roles: sample.excelColumnRoles || {},
    };
  }, [students]);

  // Batch Automatic Pending Dues PDF Messaging state
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [intervalSec, setIntervalSec] = useState(4);
  const [countdown, setCountdown] = useState(4);
  const [downloadDuringBatch, setDownloadDuringBatch] = useState(true);
  const [autoCloseTab, setAutoCloseTab] = useState(true);
  const [autoCloseDelaySec, setAutoCloseDelaySec] = useState(8);
  const [sentBatchIds, setSentBatchIds] = useState<Set<string>>(new Set());

  const logoInputRef = useRef<HTMLInputElement>(null);
  const lastOpenedWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  const targetStudents = useMemo(() => {
    return students.filter((s) => {
      if (cohortFilter === 'dues') return s.duesOwed > 0;
      if (cohortFilter === 'overdue') return s.duesStatus === 'Overdue' && s.duesOwed > 0;
      if (cohortFilter === 'transport') return (s.transportDues ?? 0) > 0;
      return true;
    });
  }, [students, cohortFilter]);

  const currentStudent =
    students.find((s) => s.id === selectedStudentId) ||
    targetStudents[0] ||
    students[0];

  const notify = (type: 'success' | 'error', text: string) => {
    setActionStatus({ type, text });
    setTimeout(() => setActionStatus(null), 4500);
  };

  // Re-generate live PDF preview Blob URL whenever selected student or customization config changes
  useEffect(() => {
    if (!currentStudent) {
      setPdfBlobUrl('');
      return;
    }
    let objectUrl = '';
    try {
      const blob = generatePendingDuesPdfBlob(currentStudent, pdfConfig);
      objectUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(objectUrl);
    } catch (err) {
      console.error('Failed to render PDF preview:', err);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentStudent, pdfConfig]);

  // Handle Logo Image Upload -> downscale cleanly onto canvas for crisp PDF & fast storage
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 260;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(40, Math.round(img.width * scale));
        canvas.height = Math.max(40, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngDataUrl = canvas.toDataURL('image/png');
          onUpdatePdfConfig({ ...pdfConfig, logoDataUrl: pngDataUrl });
          notify('success', 'School logo uploaded and applied to Pending Dues PDF.');
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleApplyThemePreset = (presetId: typeof PDF_THEME_PRESETS[number]['id']) => {
    const preset = PDF_THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onUpdatePdfConfig({
      ...pdfConfig,
      themeId: preset.id,
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      surfaceTint: preset.surfaceTint,
    });
  };

  const logPdfDispatch = (student: StudentRecord, caption: string) => {
    onLogDispatch({
      id: `pdf-wa-${Date.now()}-${student.id}`,
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
      messageText: `[PDF DUES NOTICE] ${caption}`,
      duesOwedAtDispatch: student.duesOwed,
      gpaAtDispatch: student.gpa,
      attendanceAtDispatch: student.attendanceRate,
      status: 'Sent',
    });
  };

  // Dispatch single Pending Dues PDF via WhatsApp (STRICTLY PDF file + 3-line caption only, NO URL links or extra text)
  const dispatchStudentPdfViaWhatsApp = async (
    student: StudentRecord,
    shouldDownloadFile: boolean,
    preferNativeFileShare = false
  ) => {
    const caption = buildPendingDuesWhatsAppCaption(student);

    if (preferNativeFileShare) {
      try {
        const pdfFile = generatePendingDuesPdfFile(student, pdfConfig);
        if (navigator.share && (navigator as any).canShare?.({ files: [pdfFile] })) {
          await navigator.share({
            title: `Pending Dues - ${student.studentName}`,
            text: caption,
            files: [pdfFile],
          });
          setSentBatchIds((prev) => new Set(prev).add(student.id));
          logPdfDispatch(student, caption);
          return 'shared';
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return 'aborted';
      }
    }

    if (shouldDownloadFile) {
      downloadPendingDuesPdf(student, pdfConfig);
    }

    const waUrl = generateWhatsAppWebUrl(student.parentMobile, caption) + '#autosend=1&autoclose=1';

    if (lastOpenedWindowRef.current && !lastOpenedWindowRef.current.closed) {
      try {
        lastOpenedWindowRef.current.close();
      } catch {}
    }

    const win = window.open(waUrl, '_blank');
    lastOpenedWindowRef.current = win;

    if (autoCloseTab && win) {
      setTimeout(() => {
        try {
          if (!win.closed) win.close();
        } catch {}
      }, autoCloseDelaySec * 1000);
    }

    setSentBatchIds((prev) => new Set(prev).add(student.id));
    logPdfDispatch(student, caption);
    return 'whatsapp-web';
  };

  const handleSendSinglePdfWhatsApp = async () => {
    if (!currentStudent) return;
    setIsSendingSingle(true);
    try {
      const mode = await dispatchStudentPdfViaWhatsApp(currentStudent, true, true);
      if (mode === 'shared') {
        notify(
          'success',
          `Shared Pending Dues PDF file directly with ${currentStudent.studentName} details.`
        );
      } else if (mode === 'whatsapp-web') {
        notify(
          'success',
          `Downloaded Pending Dues PDF & opened WhatsApp Web for ${currentStudent.studentName} (${formatPhoneNumber(
            currentStudent.parentMobile
          )}) with Student Name, Class & Pending Dues only — attach the downloaded PDF!`
        );
      }
    } catch (err: any) {
      notify('error', err.message || 'Failed to prepare Pending Dues PDF.');
    } finally {
      setIsSendingSingle(false);
    }
  };

  const handleNativeSharePdf = async () => {
    if (!currentStudent) return;
    try {
      const file = generatePendingDuesPdfFile(currentStudent, pdfConfig);
      const caption = buildPendingDuesWhatsAppCaption(currentStudent);
      if (navigator.share && (navigator as any).canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Pending Dues - ${currentStudent.studentName}`,
          text: caption,
          files: [file],
        });
        logPdfDispatch(currentStudent, caption);
        notify('success', `Shared PDF file directly for ${currentStudent.studentName}!`);
      } else {
        downloadPendingDuesPdf(currentStudent, pdfConfig);
        notify(
          'success',
          'Direct file share is unavailable in this browser—PDF downloaded! Drop the file into WhatsApp Web.'
        );
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        notify('error', err.message || 'Could not share PDF file.');
      }
    }
  };

  // Automatic Batch Runner Effect
  useEffect(() => {
    if (!isBatchRunning) return;

    if (batchIndex >= targetStudents.length) {
      setIsBatchRunning(false);
      notify('success', `Completed automated Pending Dues PDF messaging for ${targetStudents.length} parents!`);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const target = targetStudents[batchIndex];
          if (target) {
            setSelectedStudentId(target.id);
            dispatchStudentPdfViaWhatsApp(target, downloadDuringBatch);
          }

          if (batchIndex + 1 < targetStudents.length) {
            setBatchIndex((i) => i + 1);
            return intervalSec;
          } else {
            setIsBatchRunning(false);
            notify(
              'success',
              `Finished automated Pending Dues PDF broadcast for all ${targetStudents.length} parents!`
            );
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBatchRunning, batchIndex, targetStudents, intervalSec, downloadDuringBatch, autoCloseTab, autoCloseDelaySec]);

  const totalPendingAmount = targetStudents.reduce((acc, s) => acc + (s.duesOwed || 0), 0);
  const sampleCaption = currentStudent ? buildPendingDuesWhatsAppCaption(currentStudent) : '';
  const currentMonthlyEntries = useMemo(
    () => (currentStudent ? getPdfMonthlyBreakdownEntries(currentStudent) : []),
    [currentStudent]
  );

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-sm"
            style={{ backgroundColor: pdfConfig.primaryColor }}
          >
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                Pending Dues PDF Studio &amp; Auto-WhatsApp Sender
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {pdfTemplates.length} customizable PDF templates · Month-by-Month Ledger
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize multiple colorful PDF templates with School Logo &amp; Month-by-Month dues. WhatsApp sends only the PDF file + Student Name, Class &amp; Pending Dues.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Target Cohort</span>
            <span className="font-bold text-slate-900 tabular-nums">{targetStudents.length} Students</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200">
            <span className="text-[10px] font-bold uppercase text-rose-500 block">Pending Dues Pool</span>
            <span className="font-mono font-bold text-rose-700 tabular-nums">{formatCurrency(totalPendingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Multiple PDF Template Switcher & Manager */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>PDF Templates ({pdfTemplates.length}):</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {pdfTemplates.map((tpl) => {
              const isSelected = tpl.id === activePdfTemplate.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => onSelectPdfTemplate(tpl.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: tpl.primaryColor }}
                  />
                  <span>{tpl.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={activePdfTemplate.name}
            onChange={(e) => handleRenameTemplate(e.target.value)}
            placeholder="Template name"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 w-44 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            title="Rename active PDF template"
          />

          <button
            type="button"
            onClick={handleCreatePdfTemplate}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New PDF Template</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicatePdfTemplate}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>

          {excelColumnsInfo && onUpdateStudents && (
            <button
              type="button"
              onClick={() =>
                setHeaderEditorMappings(
                  excelColumnsInfo.order.map((col) => ({
                    originalHeader: col,
                    displayHeader: col,
                    role: excelColumnsInfo.roles[col] || 'student',
                  }))
                )
              }
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              title="Edit Excel Data Headers & PDF Sections"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>PDF Data Headers ({excelColumnsInfo.order.length})</span>
            </button>
          )}

          {pdfTemplates.length > 1 && (
            <button
              type="button"
              onClick={handleDeletePdfTemplate}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 inline-flex items-center gap-1 whitespace-nowrap shrink-0"
              title="Delete active PDF template"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {actionStatus && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            actionStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          {actionStatus.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{actionStatus.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Colorful PDF Customizer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* 1. School Logo & Color Theme Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-600" />
                Colorful PDF Theme & Logo Customizer
              </h3>
              <button
                type="button"
                onClick={() => onUpdatePdfConfig(DEFAULT_PDF_CONFIG)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Default
              </button>
            </div>

            {/* Logo Uploader */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {pdfConfig.logoDataUrl ? (
                    <img
                      src={pdfConfig.logoDataUrl}
                      alt="School Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    School Logo (PNG / JPG)
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {pdfConfig.logoDataUrl ? 'Custom logo active in PDF header' : 'Using default Kidzee Crest'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{pdfConfig.logoDataUrl ? 'Change' : 'Add Logo'}</span>
                </button>
                {pdfConfig.logoDataUrl && (
                  <button
                    type="button"
                    onClick={() => onUpdatePdfConfig({ ...pdfConfig, logoDataUrl: undefined })}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Remove uploaded logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Colorful Preset Palettes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Select Colorful Design Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PDF_THEME_PRESETS.map((preset) => {
                  const isActive = pdfConfig.themeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyThemePreset(preset.id)}
                      className={`p-2 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                        isActive
                          ? 'border-slate-900 bg-slate-50 font-bold ring-1 ring-slate-900'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="flex items-center shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-l-full"
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <span
                          className="w-3.5 h-3.5 rounded-r-full"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </span>
                      <span className="truncate">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Color Pickers + Header Style */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50">
                  <input
                    type="color"
                    value={pdfConfig.primaryColor}
                    onChange={(e) =>
                      onUpdatePdfConfig({ ...pdfConfig, primaryColor: e.target.value })
                    }
                    className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-600">
                    {pdfConfig.primaryColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50">
                  <input
                    type="color"
                    value={pdfConfig.accentColor}
                    onChange={(e) =>
                      onUpdatePdfConfig({ ...pdfConfig, accentColor: e.target.value })
                    }
                    className="w-7 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-[10px] font-mono text-slate-600">
                    {pdfConfig.accentColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Header Style
                </label>
                <select
                  value={pdfConfig.headerStyle}
                  onChange={(e) =>
                    onUpdatePdfConfig({
                      ...pdfConfig,
                      headerStyle: e.target.value as PdfCustomizationConfig['headerStyle'],
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
                >
                  <option value="royal-banner">Royal Banner</option>
                  <option value="ribbon-split">Ribbon Split</option>
                  <option value="bordered-crest">Bordered Crest</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. School Text, Badge, UPI & Toggles */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Notice Content & PDF Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">School Title</label>
                <input
                  type="text"
                  value={pdfConfig.schoolName}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, schoolName: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Badge Headline</label>
                <input
                  type="text"
                  value={pdfConfig.badgeTitle}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, badgeTitle: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={pdfConfig.schoolAddress}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, schoolAddress: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Helpline Phone</label>
                <input
                  type="text"
                  value={pdfConfig.schoolPhone}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, schoolPhone: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">UPI ID</label>
                <input
                  type="text"
                  value={pdfConfig.upiId}
                  onChange={(e) => onUpdatePdfConfig({ ...pdfConfig, upiId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Signatory Title</label>
                <input
                  type="text"
                  value={pdfConfig.signatoryTitle}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, signatoryTitle: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Footer Note</label>
              <textarea
                rows={2}
                value={pdfConfig.customFooterNote}
                onChange={(e) =>
                  onUpdatePdfConfig({ ...pdfConfig, customFooterNote: e.target.value })
                }
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Feature Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfConfig.showWatermark}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, showWatermark: e.target.checked })
                  }
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-700">Diagonal Watermark</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfConfig.showMonthlyBreakdown}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, showMonthlyBreakdown: e.target.checked })
                  }
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-700">Month-by-Month Dues Table</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfConfig.showPaymentBox}
                  onChange={(e) =>
                    onUpdatePdfConfig({ ...pdfConfig, showPaymentBox: e.target.checked })
                  }
                  className="rounded text-emerald-600"
                />
                <span className="font-semibold text-slate-700">UPI & Payment Box</span>
              </label>

              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-semibold text-emerald-950 text-[11px]">
                  PDF-Only Mode Active (No URL Link Sent)
                </span>
              </div>
            </div>
          </div>

          {/* Month-by-Month Ledger Inspection Card */}
          {currentStudent && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Month-by-Month Dues Included in PDF ({currentStudent.studentName})
                </span>
                <span className="text-[11px] font-mono font-bold text-rose-700 tabular-nums">
                  {formatCurrency(currentStudent.duesOwed)}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 text-center">
                {currentMonthlyEntries.map((m) => (
                  <div
                    key={m.key}
                    className={`p-1.5 rounded-lg border text-[10px] ${
                      m.amount > 0
                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                        : 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <div className="font-bold truncate">{m.shortLabel}</div>
                    <div className="font-mono font-semibold tabular-nums mt-0.5">
                      {m.amount > 0 ? `₹${m.amount}` : 'Paid'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live PDF Preview + Automatic WhatsApp PDF Messaging (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Student Selector & Instant Actions */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  Live Pending Dues PDF Preview & WhatsApp Dispatch
                </h3>
                <p className="text-[11px] text-slate-500">
                  Preview updates instantly with student dues, uploaded logo, and color palette
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {(['dues', 'overdue', 'transport', 'all'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCohortFilter(mode)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      cohortFilter === mode
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mode === 'dues'
                      ? 'Pending Dues'
                      : mode === 'overdue'
                      ? 'Overdue'
                      : mode === 'transport'
                      ? 'Transport'
                      : 'All'}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={currentStudent?.id || ''}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800"
            >
              {targetStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentName} ({s.gradeLevel} • Father: {s.fatherName || s.parentName}) — Dues:{' '}
                  {formatCurrency(s.duesOwed)}
                </option>
              ))}
            </select>

            {/* Live PDF Iframe */}
            {currentStudent && pdfBlobUrl ? (
              <div className="rounded-xl border border-slate-300 overflow-hidden bg-slate-800">
                <iframe
                  title="Pending Dues PDF Preview"
                  src={pdfBlobUrl}
                  className="w-full h-[460px] bg-white"
                />
              </div>
            ) : (
              <div className="h-[240px] rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500">
                No student selected or no pending dues records match this filter.
              </div>
            )}

            {/* Single-Student PDF + WhatsApp Action Bar */}
            {currentStudent && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const file = downloadPendingDuesPdf(currentStudent, pdfConfig);
                      notify('success', `Downloaded ${file}`);
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download PDF</span>
                  </button>

                  {targetStudents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const file = downloadCombinedPendingDuesPdf(targetStudents, pdfConfig);
                        notify(
                          'success',
                          `Generated combined PDF (${targetStudents.length} students) from database: ${file}`
                        );
                      }}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Download All PDFs ({targetStudents.length})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleNativeSharePdf}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Share PDF File</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSendSinglePdfWhatsApp}
                  disabled={isSendingSingle}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4 fill-current" />
                  <span>
                    {isSendingSingle
                      ? 'Preparing PDF...'
                      : `Send Dues PDF via WhatsApp (${currentStudent.studentName})`}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Automatic Batch Pending Dues PDF WhatsApp Messaging Panel */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-600 text-white">
                  <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Automatic "Pending Dues" PDF WhatsApp Messaging
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Automatically generates colorful PDF notices & dispatches WhatsApp messages across {targetStudents.length} parents
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900">
                {sentBatchIds.size} / {targetStudents.length} Dispatched
              </span>
            </div>

            {/* Timing & Auto-Close Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <CustomDurationSelector
                label="Delay Between PDF WhatsApp Sends"
                durationMs={intervalSec * 1000}
                onChangeDurationMs={(ms: number) => {
                  const sec = Math.max(1, Math.round(ms / 1000));
                  setIntervalSec(sec);
                  setCountdown(sec);
                }}
                disabled={isBatchRunning}
                totalItems={targetStudents.length}
              />

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={downloadDuringBatch}
                    onChange={(e) => setDownloadDuringBatch(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Also save each student PDF to Downloads folder</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={autoCloseTab}
                    onChange={(e) => setAutoCloseTab(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Auto-close WhatsApp tab after {autoCloseDelaySec}s</span>
                </label>

                {autoCloseTab && (
                  <div className="flex items-center gap-2 pl-5">
                    <span className="text-[11px] text-slate-500">Close delay:</span>
                    <input
                      type="number"
                      min={4}
                      max={60}
                      value={autoCloseDelaySec}
                      onChange={(e) =>
                        setAutoCloseDelaySec(Math.max(4, Number(e.target.value) || 8))
                      }
                      className="w-16 px-2 py-0.5 text-xs font-mono rounded border border-slate-300 bg-white"
                    />
                    <span className="text-[11px] text-slate-500">sec</span>
                  </div>
                )}
              </div>
            </div>

            {/* Batch Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                {isBatchRunning ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                    Sending #{batchIndex + 1}/{targetStudents.length}:{' '}
                    {targetStudents[batchIndex]?.studentName} (Next in {countdown}s)
                  </span>
                ) : (
                  <span>
                    Ready to send customized Pending Dues PDF notices to{' '}
                    <strong>{targetStudents.length}</strong> parents.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isBatchRunning ? (
                  <button
                    type="button"
                    disabled={targetStudents.length === 0}
                    onClick={() => {
                      if (batchIndex >= targetStudents.length) setBatchIndex(0);
                      setCountdown(1);
                      setIsBatchRunning(true);
                    }}
                    className="px-4 py-2 text-xs font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Auto PDF WhatsApp Send</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsBatchRunning(false)}
                    className="px-4 py-2 text-xs font-extrabold rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 inline-flex items-center gap-1.5"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause Auto Sender</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsBatchRunning(false);
                    setBatchIndex(0);
                    setSentBatchIds(new Set());
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Live Formatted WhatsApp Caption Preview (Strictly PDF File + 3 Lines Only) */}
            {currentStudent && (
              <div className="rounded-xl p-3.5 bg-[#0b141a] text-[#e9edef] text-xs leading-relaxed whitespace-pre-wrap border border-slate-800">
                <div className="text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>WhatsApp Message Accompanying PDF File (Strict 3-Line Mode)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    No PDF link or extra text sent
                  </span>
                </div>
                <FormattedMessageText text={sampleCaption} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Excel Database Data Headers for Pending Dues PDFs */}
      {headerEditorMappings && onUpdateStudents && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customize Excel Data Headers for Pending Dues PDF
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Change only the Data Headers or PDF Section mapping — colors, border, logo &amp; design stay identical.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHeaderEditorMappings(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {headerEditorMappings.map((m, idx) => (
                <div
                  key={m.originalHeader}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-slate-500 truncate">
                      Current Header: <span className="font-mono">{m.originalHeader}</span>
                    </div>
                    <input
                      type="text"
                      value={m.displayHeader}
                      onChange={(e) => {
                        const next = [...headerEditorMappings];
                        next[idx] = { ...m, displayHeader: e.target.value };
                        setHeaderEditorMappings(next);
                      }}
                      className="mt-0.5 w-full px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                  <select
                    value={m.role}
                    onChange={(e) => {
                      const next = [...headerEditorMappings];
                      next[idx] = { ...m, role: e.target.value as ExcelColumnRole };
                      setHeaderEditorMappings(next);
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

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setHeaderEditorMappings(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateStudents(applyExcelColumnMappings(students, headerEditorMappings));
                  setHeaderEditorMappings(null);
                  notify('success', 'Updated PDF Data Headers across all student records.');
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                Apply Headers to All PDFs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
