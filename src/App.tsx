import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StudentRecord,
  MessageTemplate,
  ScheduledJob,
  DispatchLog,
  PdfTemplateItem,
  UserPermissionKey,
} from './types';
import {
  OFFICIAL_SCHOOL_DATABASE,
  INITIAL_TEMPLATES,
  INITIAL_SCHEDULED_JOBS,
  INITIAL_DISPATCH_LOGS,
} from './utils/sampleData';
import { Navbar, NavTab } from './components/Navbar';
import { StudentDataTable } from './components/StudentDataTable';
import { TemplateCustomizer } from './components/TemplateCustomizer';
import { SchedulerView } from './components/SchedulerView';
import { ReportingDashboard } from './components/ReportingDashboard';
import { IndividualOverrideModal } from './components/IndividualOverrideModal';
import { WhatsAppWebHub } from './components/WhatsAppWebHub';
import { WhatsAppServerGateway } from './components/WhatsAppServerGateway';
import { DispatchProgressModal } from './components/DispatchProgressModal';
import { QuickBatchModal } from './components/QuickBatchModal';
import { KidzeeDirectMessageModal } from './components/KidzeeDirectMessageModal';
import { InstallationModal } from './components/InstallationModal';
import { PendingDuesPdfStudio } from './components/PendingDuesPdfStudio';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { UserProfileModal } from './components/UserProfileModal';
import { UserManagementModal } from './components/UserManagementModal';
import { DEFAULT_PDF_TEMPLATES } from './utils/pdfDuesGenerator';
import {
  AdminUserInfo,
  authFetch,
  clearAuthSession,
  getAuthToken,
  getStoredAdminUser,
  hasUserPermission,
  updateStoredUser,
} from './utils/authClient';
import { calculateReportSummary } from './utils/reportingEngine';
import { renderPersonalizedMessage, formatCurrency } from './utils/templateEngine';
import { CheckCircle2, X, ShieldCheck, Clock, Lock } from 'lucide-react';

const STORAGE_KEYS = {
  STUDENTS: 'edunotify_students_v2',
  TEMPLATES: 'edunotify_templates_v2',
  JOBS: 'edunotify_jobs_v2',
  LOGS: 'edunotify_logs_v2',
  PDF_CONFIG: 'edunotify_pdf_config_v1',
  PDF_TEMPLATES: 'edunotify_pdf_templates_v1',
  ACTIVE_PDF_TPL_ID: 'edunotify_active_pdf_tpl_v1',
};

const TAB_PERMISSIONS: Array<{ tab: NavTab; perm: UserPermissionKey }> = [
  { tab: 'students', perm: 'viewStudents' },
  { tab: 'whatsapp', perm: 'sendWhatsapp' },
  { tab: 'whatsapp-server', perm: 'sendWhatsapp' },
  { tab: 'pdf-studio', perm: 'managePdf' },
  { tab: 'templates', perm: 'manageTemplates' },
  { tab: 'scheduler', perm: 'manageScheduler' },
  { tab: 'reports', perm: 'viewReports' },
];

export default function App() {
  // Admin Authentication State
  const [adminUser, setAdminUser] = useState<AdminUserInfo | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<NavTab>('students');
  const [secondsUntilAutoLogout, setSecondsUntilAutoLogout] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isHydratingRef = useRef<boolean>(true);

  const handleLogout = useCallback(async (reasonNotice?: string) => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    clearAuthSession();
    setAdminUser(null);
    setSecondsUntilAutoLogout(null);
    setAuthNotice(typeof reasonNotice === 'string' ? reasonNotice : null);
  }, []);

  // Verify Admin Session on initial load & subscribe to 401 lock events
  useEffect(() => {
    let active = true;
    const verifySession = async () => {
      try {
        const storedUser = getStoredAdminUser();
        const token = getAuthToken();
        if (!token && !storedUser) {
          const res = await authFetch('/api/auth/me');
          if (res.ok) {
            const data = await res.json();
            if (active && data.authenticated && data.user) {
              setAdminUser(data.user);
              updateStoredUser(data.user);
            }
          }
          if (active) setIsCheckingAuth(false);
          return;
        }

        const res = await authFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (active && data.authenticated && data.user) {
            setAdminUser(data.user);
            updateStoredUser(data.user);
          } else if (active) {
            clearAuthSession();
            setAdminUser(null);
          }
        } else if (active) {
          clearAuthSession();
          setAdminUser(null);
        }
      } catch {
        if (active) setAdminUser(null);
      } finally {
        if (active) setIsCheckingAuth(false);
      }
    };

    verifySession();

    const handleUnauthorized = () => {
      setAdminUser(null);
      setAuthNotice('Your session expired or was unauthorized. Please sign in again.');
    };

    window.addEventListener('kidzee:unauthorized', handleUnauthorized);
    return () => {
      active = false;
      window.removeEventListener('kidzee:unauthorized', handleUnauthorized);
    };
  }, []);

  // Customizable Automatic Inactivity Logout Monitor
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!adminUser) {
      setSecondsUntilAutoLogout(null);
      return;
    }

    const timeoutMins = Number(adminUser.inactivityTimeoutMinutes || 0);
    if (timeoutMins <= 0) {
      setSecondsUntilAutoLogout(null);
      return;
    }

    lastActivityRef.current = Date.now();
    const timeoutMs = timeoutMins * 60 * 1000;
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
    ];

    events.forEach((evt) => window.addEventListener(evt, resetActivityTimer, { passive: true }));

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      setSecondsUntilAutoLogout(remaining);

      if (remaining <= 0) {
        window.clearInterval(timer);
        handleLogout(
          `Automatically logged out after ${timeoutMins} minute${timeoutMins === 1 ? '' : 's'} of inactivity.`
        );
      }
    }, 1000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetActivityTimer));
      window.clearInterval(timer);
    };
  }, [adminUser, adminUser?.inactivityTimeoutMinutes, resetActivityTimer, handleLogout]);

  // Enforce RBAC tab selection when logged-in user's permissions change
  useEffect(() => {
    if (!adminUser) return;
    const currentDef = TAB_PERMISSIONS.find((t) => t.tab === currentTab);
    if (!currentDef || !hasUserPermission(adminUser, currentDef.perm)) {
      const firstAllowed = TAB_PERMISSIONS.find((t) => hasUserPermission(adminUser, t.perm));
      if (firstAllowed) {
        setCurrentTab(firstAllowed.tab);
      }
    }
  }, [adminUser, currentTab]);

  // Synchronous hydration from localStorage with fallback to default database
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load students from localStorage:', e);
    }
    return OFFICIAL_SCHOOL_DATABASE;
  });

  const [templates, setTemplates] = useState<MessageTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load templates from localStorage:', e);
    }
    return INITIAL_TEMPLATES;
  });

  const [pdfTemplates, setPdfTemplates] = useState<PdfTemplateItem[]>(() => {
    try {
      const savedMulti = localStorage.getItem(STORAGE_KEYS.PDF_TEMPLATES);
      if (savedMulti) {
        const parsed = JSON.parse(savedMulti);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate single pdf config from prior version if present
      const savedLegacy = localStorage.getItem(STORAGE_KEYS.PDF_CONFIG);
      if (savedLegacy) {
        const parsedLegacy = JSON.parse(savedLegacy);
        if (parsedLegacy && typeof parsedLegacy === 'object') {
          return [
            {
              ...DEFAULT_PDF_TEMPLATES[0],
              ...parsedLegacy,
              includeSignedPdfLinkInWhatsapp: false,
            },
            ...DEFAULT_PDF_TEMPLATES.slice(1),
          ];
        }
      }
    } catch {}
    return DEFAULT_PDF_TEMPLATES;
  });

  const [activePdfTemplateId, setActivePdfTemplateId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PDF_TPL_ID);
      if (savedId) return savedId;
    } catch {}
    return DEFAULT_PDF_TEMPLATES[0].id;
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed[0]?.id) return parsed[0].id;
      }
    } catch {}
    return INITIAL_TEMPLATES[0].id;
  });

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed[0]?.id) return parsed[0].id;
      }
    } catch {}
    return OFFICIAL_SCHOOL_DATABASE[0].id;
  });

  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load jobs from localStorage:', e);
    }
    return INITIAL_SCHEDULED_JOBS;
  });

  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to load logs from localStorage:', e);
    }
    return INITIAL_DISPATCH_LOGS;
  });

  useEffect(() => {
    isHydratingRef.current = false;
  }, []);

  // Automatically save students on every change (localStorage + authenticated server disk when permitted)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      if (!isHydratingRef.current && adminUser && hasUserPermission(adminUser, 'editStudents')) {
        authFetch('/api/records/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ students }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to auto-save students:', e);
    }
  }, [students, adminUser]);

  // Automatically save templates on every change (localStorage + authenticated server disk when permitted)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      if (!isHydratingRef.current && adminUser && hasUserPermission(adminUser, 'manageTemplates')) {
        authFetch('/api/records/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templates }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to auto-save templates:', e);
    }
  }, [templates, adminUser]);

  // Automatically save multiple PDF templates (localStorage + authenticated server disk when permitted)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PDF_TEMPLATES, JSON.stringify(pdfTemplates));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PDF_TPL_ID, activePdfTemplateId);
      if (!isHydratingRef.current && adminUser && hasUserPermission(adminUser, 'managePdf')) {
        authFetch('/api/records/pdf-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfTemplates }),
        }).catch(() => {});
      }
    } catch (e) {
      console.error('Failed to auto-save PDF templates:', e);
    }
  }, [pdfTemplates, activePdfTemplateId, adminUser]);

  // Automatically save scheduled jobs on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(scheduledJobs));
    } catch (e) {
      console.error('Failed to auto-save jobs:', e);
    }
  }, [scheduledJobs]);

  // Automatically save dispatch logs on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(dispatchLogs));
    } catch (e) {
      console.error('Failed to auto-save logs:', e);
    }
  }, [dispatchLogs]);

  // Initial sync from server once authenticated if localStorage was empty
  useEffect(() => {
    if (!adminUser) return;
    const syncFromServerIfEmpty = async () => {
      try {
        if (!localStorage.getItem(STORAGE_KEYS.STUDENTS) && hasUserPermission(adminUser, 'viewStudents')) {
          const res = await authFetch('/api/records/students');
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              setStudents(data.data);
            }
          }
        }
        if (!localStorage.getItem(STORAGE_KEYS.PDF_TEMPLATES)) {
          const res = await authFetch('/api/records/pdf-templates');
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data) && data.data.length > 0) {
              setPdfTemplates(data.data);
            }
          }
        }
      } catch {}
    };
    syncFromServerIfEmpty();
  }, [adminUser]);

  // Modals state
  const [overrideStudent, setOverrideStudent] = useState<StudentRecord | null>(null);
  const [isQuickBatchModalOpen, setIsQuickBatchModalOpen] = useState(false);
  const [isDirectMessageModalOpen, setIsDirectMessageModalOpen] = useState(false);
  const [isInstallationModalOpen, setIsInstallationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [autoOpenOneClickWA, setAutoOpenOneClickWA] = useState(false);
  const [dispatchConfig, setDispatchConfig] = useState<{
    isOpen: boolean;
    targetStudents: StudentRecord[];
    template: MessageTemplate;
    jobTitle: string;
    delayMs?: number;
  } | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Summaries
  const reportSummary = calculateReportSummary(students);
  const activeAutomations = scheduledJobs.filter((j) => j.status === 'Active').length;
  const activeTemplate = templates.find((t) => t.id === activeTemplateId) || templates[0];

  // Handler for individual student message override
  const handleSaveStudentOverride = (studentId: string, customMessage: string | undefined) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            customMessageOverride: customMessage,
          };
        }
        return s;
      })
    );
    showToast(
      customMessage
        ? 'Custom individual message saved for student!'
        : 'Reverted to standard automated template.'
    );
  };

  // Quick single message send
  const handleQuickSend = (student: StudentRecord, customText?: string) => {
    const rendered =
      customText ||
      renderPersonalizedMessage(activeTemplate.body, student, {
        design: activeTemplate.design,
        allStudents: students,
      });
    const newLog: DispatchLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      studentId: student.studentId,
      studentName: student.studentName,
      parentName: student.parentName,
      parentMobile: student.parentMobile,
      channel: activeTemplate.channel,
      messageText: rendered,
      duesOwedAtDispatch: student.duesOwed,
      gpaAtDispatch: student.gpa,
      attendanceAtDispatch: student.attendanceRate,
      status: 'Delivered',
    };

    setDispatchLogs((prev) => [newLog, ...prev]);

    // Update last notified date
    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? { ...s, lastNotifiedDate: new Date().toISOString().split('T')[0] }
          : s
      )
    );

    showToast(
      `Dispatched message to ${student.parentName} (${student.parentMobile}) with dues ${formatCurrency(
        student.duesOwed
      )}`
    );
  };

  // Trigger dues notice specifically from reporting dashboard
  const handleTriggerDuesNotice = (student: StudentRecord) => {
    const duesTemplate =
      templates.find((t) => t.category === 'Dues & Fees') || activeTemplate;
    setDispatchConfig({
      isOpen: true,
      targetStudents: [student],
      template: duesTemplate,
      jobTitle: `Immediate Dues Notice: ${student.studentName}`,
    });
  };

  // Run scheduled job now
  const handleRunJobNow = (job: ScheduledJob) => {
    let target = students;
    if (job.targetCohort === 'Students with Dues Owed') {
      target = students.filter((s) => s.duesOwed > 0);
    } else if (job.targetCohort === 'Low Attendance (<85%)') {
      target = students.filter((s) => s.attendanceRate < 85);
    } else if (job.targetCohort === 'Academic Warning') {
      target = students.filter((s) => s.gpa < 2.5 || s.academicStanding === 'Academic Warning');
    }

    const tpl = templates.find((t) => t.id === job.templateId) || activeTemplate;
    setDispatchConfig({
      isOpen: true,
      targetStudents: target,
      template: tpl,
      jobTitle: `Scheduled Execution: ${job.name}`,
    });

    // Update job's lastRun timestamp
    setScheduledJobs((prev) =>
      prev.map((j) =>
        j.id === job.id
          ? {
              ...j,
              lastRun: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            }
          : j
      )
    );
  };

  // Launch batch from modal
  const handleStartBatchDispatch = (
    targets: StudentRecord[],
    tpl: MessageTemplate,
    jobTitle: string,
    delayMs?: number
  ) => {
    setDispatchConfig({
      isOpen: true,
      targetStudents: targets,
      template: tpl,
      jobTitle,
      delayMs: delayMs || 3000,
    });
  };

  // Batch completion callback
  const handleDispatchComplete = (newLogs: DispatchLog[]) => {
    setDispatchLogs((prev) => [...newLogs, ...prev]);
    showToast(`Batch completed! ${newLogs.length} parent notifications logged.`);
  };

  // Template modifications
  const handleUpdateTemplate = (updated: MessageTemplate) => {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleCreateTemplate = (created: MessageTemplate) => {
    setTemplates((prev) => [created, ...prev]);
    setActiveTemplateId(created.id);
    showToast(`Created new template: ${created.name}`);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (activeTemplateId === id && templates.length > 1) {
      setActiveTemplateId(templates.find((t) => t.id !== id)!.id);
    }
    showToast('Template deleted');
  };

  // Security Gate: Block all application data & routes until User authenticates
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 flex items-center gap-3 text-xs font-semibold text-slate-700">
          <ShieldCheck className="w-5 h-5 text-emerald-600 animate-pulse" />
          <span>Verifying Kidzee School security session...</span>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return (
      <AdminLoginScreen
        onAuthenticated={(user) => {
          setAdminUser(user);
          setAuthNotice(null);
          lastActivityRef.current = Date.now();
        }}
        sessionNotice={authNotice}
      />
    );
  }

  const hasAnyTabPermission = TAB_PERMISSIONS.some((t) => hasUserPermission(adminUser, t.perm));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Top Navbar & Metric Banner */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        totalStudents={students.length}
        totalDuesOwed={reportSummary.totalDuesOwed}
        overdueDuesOwed={reportSummary.totalOverdueDues}
        activeAutomationsCount={activeAutomations}
        onOpenQuickBatchModal={() => setIsQuickBatchModalOpen(true)}
        onOpenDirectMessageModal={() => setIsDirectMessageModalOpen(true)}
        onOpenInstallationModal={() => setIsInstallationModalOpen(true)}
        adminUser={adminUser}
        adminUsername={adminUser.username}
        secondsUntilAutoLogout={secondsUntilAutoLogout}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenUserManagementModal={() => setIsUserManagementModalOpen(true)}
        onLogout={() => handleLogout()}
      />

      {/* Inactivity Auto-Logout Countdown Warning Banner (Final 30 Seconds) */}
      {typeof secondsUntilAutoLogout === 'number' &&
        secondsUntilAutoLogout > 0 &&
        secondsUntilAutoLogout <= 30 && (
          <div className="bg-amber-600 text-white text-xs px-4 py-2.5 flex items-center justify-center gap-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="tabular-nums">
                Inactive session notice: Automatically locking portal in {secondsUntilAutoLogout}s.
              </span>
            </div>
            <button
              type="button"
              onClick={resetActivityTimer}
              className="px-3 py-1 rounded-lg bg-white text-amber-950 font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
            >
              Stay Signed In
            </button>
          </div>
        )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!hasAnyTabPermission && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto mt-8 space-y-2">
            <Lock className="w-8 h-8 text-slate-400 mx-auto" />
            <h2 className="text-base font-bold text-slate-900">No Workspace Modules Assigned</h2>
            <p className="text-xs text-slate-500">
              Your account currently has no active workspace permissions. Please contact your Administrator to assign module rights.
            </p>
          </div>
        )}

        {currentTab === 'students' && hasUserPermission(adminUser, 'viewStudents') && (
          <StudentDataTable
            students={students}
            onUpdateStudents={setStudents}
            onSelectStudentForPreview={(student) => {
              setSelectedStudentId(student.id);
              if (hasUserPermission(adminUser, 'manageTemplates')) {
                setCurrentTab('templates');
              }
            }}
            onOpenIndividualOverride={(student) => setOverrideStudent(student)}
            onQuickSend={(student) => handleQuickSend(student)}
            onOpenWhatsAppSender={() => {
              if (hasUserPermission(adminUser, 'sendWhatsapp')) {
                setCurrentTab('whatsapp');
                setAutoOpenOneClickWA(true);
              }
            }}
            onOpenDirectMessageModal={() => setIsDirectMessageModalOpen(true)}
          />
        )}

        {currentTab === 'whatsapp' && hasUserPermission(adminUser, 'sendWhatsapp') && (
          <WhatsAppWebHub
            students={students}
            templates={templates}
            initialOpenOneClickModal={autoOpenOneClickWA}
            onCloseOneClickModal={() => setAutoOpenOneClickWA(false)}
            onLogDispatch={(log) => {
              setDispatchLogs((prev) => [log, ...prev]);
              setStudents((prev) =>
                prev.map((s) =>
                  s.enrollmentNo === log.studentId || s.studentId === log.studentId
                    ? { ...s, lastNotifiedDate: new Date().toISOString().split('T')[0] }
                    : s
                )
              );
              showToast(`Logged WhatsApp Web dispatch for ${log.parentName}`);
            }}
            onSelectStudentForPreview={(student) => {
              setSelectedStudentId(student.id);
              if (hasUserPermission(adminUser, 'manageTemplates')) {
                setCurrentTab('templates');
              }
            }}
            onNavigateToLoginServer={() => setCurrentTab('whatsapp-server')}
            onOpenDirectMessageModal={() => setIsDirectMessageModalOpen(true)}
            onOpenInstallationModal={() => setIsInstallationModalOpen(true)}
            onOpenPdfStudio={(student) => {
              if (student) setSelectedStudentId(student.id);
              if (hasUserPermission(adminUser, 'managePdf')) {
                setCurrentTab('pdf-studio');
              }
            }}
          />
        )}

        {currentTab === 'whatsapp-server' && hasUserPermission(adminUser, 'sendWhatsapp') && (
          <WhatsAppServerGateway
            students={students}
            templates={templates}
            onOpenDirectWebHub={() => setCurrentTab('whatsapp')}
            onOpenDirectMessageModal={() => setIsDirectMessageModalOpen(true)}
            onOpenInstallationModal={() => setIsInstallationModalOpen(true)}
          />
        )}

        {currentTab === 'pdf-studio' && hasUserPermission(adminUser, 'managePdf') && (
          <PendingDuesPdfStudio
            students={students}
            onUpdateStudents={setStudents}
            pdfTemplates={pdfTemplates}
            activePdfTemplateId={activePdfTemplateId}
            onSelectPdfTemplate={setActivePdfTemplateId}
            onUpdatePdfTemplates={setPdfTemplates}
            initialStudentId={selectedStudentId}
            onLogDispatch={(log) => {
              setDispatchLogs((prev) => [log, ...prev]);
              setStudents((prev) =>
                prev.map((s) =>
                  s.enrollmentNo === log.studentId || s.studentId === log.studentId
                    ? { ...s, lastNotifiedDate: new Date().toISOString().split('T')[0] }
                    : s
                )
              );
              showToast(`Pending Dues PDF notice dispatched for ${log.studentName}`);
            }}
          />
        )}

        {currentTab === 'templates' && hasUserPermission(adminUser, 'manageTemplates') && (
          <TemplateCustomizer
            templates={templates}
            activeTemplateId={activeTemplateId}
            onSelectTemplate={setActiveTemplateId}
            onUpdateTemplate={handleUpdateTemplate}
            onCreateTemplate={handleCreateTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            students={students}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
            onOpenIndividualOverride={(student) => setOverrideStudent(student)}
            onQuickSend={(student, text) => handleQuickSend(student, text)}
          />
        )}

        {currentTab === 'scheduler' && hasUserPermission(adminUser, 'manageScheduler') && (
          <SchedulerView
            scheduledJobs={scheduledJobs}
            templates={templates}
            students={students}
            onUpdateJobs={setScheduledJobs}
            onRunJobNow={handleRunJobNow}
          />
        )}

        {currentTab === 'reports' && hasUserPermission(adminUser, 'viewReports') && (
          <ReportingDashboard
            students={students}
            dispatchLogs={dispatchLogs}
            onTriggerDuesNotice={handleTriggerDuesNotice}
          />
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Individual Custom Override Modal */}
      {overrideStudent && (
        <IndividualOverrideModal
          student={overrideStudent}
          template={activeTemplate}
          isOpen={Boolean(overrideStudent)}
          onClose={() => setOverrideStudent(null)}
          onSaveOverride={handleSaveStudentOverride}
        />
      )}

      {/* Quick Batch Dispatch Modal */}
      <QuickBatchModal
        isOpen={isQuickBatchModalOpen}
        onClose={() => setIsQuickBatchModalOpen(false)}
        students={students}
        templates={templates}
        onStartDispatch={handleStartBatchDispatch}
      />

      {/* Live Dispatch Progress Runner */}
      {dispatchConfig && (
        <DispatchProgressModal
          isOpen={dispatchConfig.isOpen}
          onClose={() => setDispatchConfig(null)}
          targetStudents={dispatchConfig.targetStudents}
          template={dispatchConfig.template}
          jobTitle={dispatchConfig.jobTitle}
          initialDelayMs={dispatchConfig.delayMs || 3000}
          onDispatchComplete={handleDispatchComplete}
        />
      )}

      {/* Kidzee School Direct Number Text & WhatsApp Dispatcher Modal */}
      <KidzeeDirectMessageModal
        isOpen={isDirectMessageModalOpen}
        onClose={() => setIsDirectMessageModalOpen(false)}
        onLogDispatch={(log) => {
          setDispatchLogs((prev) => [log, ...prev]);
          showToast(`Direct message logged for ${log.parentMobile}`);
        }}
      />

      {/* 1-Click Installation & Download Center Modal */}
      <InstallationModal
        isOpen={isInstallationModalOpen}
        onClose={() => setIsInstallationModalOpen(false)}
      />

      {/* User Profile & Custom Inactivity Auto-Logout Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={adminUser}
        secondsUntilAutoLogout={secondsUntilAutoLogout}
        onUserUpdated={(updatedUser) => {
          setAdminUser(updatedUser);
          lastActivityRef.current = Date.now();
          showToast('User profile & inactivity logout timer updated.');
        }}
      />

      {/* Admin User Creation & Granular Rights Management Modal */}
      {hasUserPermission(adminUser, 'manageUsers') && (
        <UserManagementModal
          isOpen={isUserManagementModalOpen}
          onClose={() => setIsUserManagementModalOpen(false)}
          currentUserId={adminUser.id}
        />
      )}
    </div>
  );
}
