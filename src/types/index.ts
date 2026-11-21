export interface SubjectGrade {
  subject: string;
  score: number; // 0-100
  letterGrade: string;
  teacherRemarks?: string;
}

export type ExcelColumnRole = 'student' | 'fee' | 'monthly' | 'total' | 'ignore';

export interface StudentRecord {
  id: string;
  studentId: string; // or Enrollment No
  studentName: string;
  gradeLevel: string; // e.g. "Montessoris 2 A", "Std-I B", "Std-V A"
  rollNo?: string;
  enrollmentNo?: string;
  registrationNo?: string;
  
  // Parent details
  parentName: string; // Father's or Guardian's name
  fatherName?: string;
  parentRelationship: string; // "Father", "Mother", "Guardian"
  parentMobile: string; // Contact phone(s), e.g. "9801278254" or "8873051708 6200770876"
  parentEmail?: string;
  address?: string; // Village, P.O, P.S., District
  
  // Performance metrics
  gpa: number; // 0.0 - 4.0 (or converted from marks)
  attendanceRate: number; // 0 - 100 percentage
  overallPercentage: number; // 0 - 100
  topSubject: string;
  areaToImprove: string;
  academicStanding: 'Exemplary' | 'Good Standing' | 'Needs Improvement' | 'Academic Warning';
  subjectGrades: SubjectGrade[];
  teacherRemarks: string;
  
  // Financial Dues owed (Indian School Management System Schema)
  duesOwed: number; // Total Dues in Rs. (₹)
  tuitionDues?: number; // Tu. Dues (₹)
  transportDues?: number; // Tran. Dues (₹)
  lateFee?: number; // LF (₹)
  monthlyFeeBreakdown?: {
    april?: number;
    may?: number;
    june?: number;
    july?: number;
    august?: number;
    september?: number;
    october?: number;
  };
  lastPaymentRecord?: string; // e.g. "Date: 03/10/2026 Amount: 300(Fund Transfer)"
  dueMonths?: string; // e.g. "4,5,6,7,8,9,10"
  duesDueDate: string; // YYYY-MM-DD or Expected Payment Date
  expectedPaymentDate?: string;
  duesStatus: 'Paid' | 'Pending' | 'Overdue';
  paymentLink?: string;

  // Dynamic Full Excel / CSV Database Columns (captures every column from uploaded spreadsheet)
  excelColumnOrder?: string[];
  excelRawColumns?: Record<string, string>;
  excelColumnRoles?: Record<string, ExcelColumnRole>;

  // Custom individual message override
  customMessageOverride?: string;
  lastNotifiedDate?: string;
}

export type TemplateThemeId =
  | 'emerald-crest'
  | 'royal-gold'
  | 'urgent-crimson'
  | 'indigo-academic'
  | 'minimal-clean';

export type TemplateBorderStyle =
  | 'none'
  | 'full-box'
  | 'classic-line'
  | 'double-ornate'
  | 'star-banner'
  | 'dues-alert-box';

export interface TemplateDesignConfig {
  theme: TemplateThemeId;
  borderStyle: TemplateBorderStyle;
  fullBorderBox?: boolean;
  headerBadge?: string;
  footerSignature?: string;
  accentColor?: string;
  includeRichFormatting?: boolean;
}

export interface MessageTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Performance' | 'Dues & Fees' | 'Attendance' | 'General Progress' | 'Urgent Alert';
  channel: 'SMS' | 'WhatsApp';
  language?: 'English' | 'Hindi' | 'Bilingual';
  body: string;
  design?: TemplateDesignConfig;
  enabledConditionals: {
    includeDuesSection: boolean;
    includeAttendanceWarning: boolean;
    includeTopSubjectPraise: boolean;
    includePaymentLink: boolean;
  };
}

export type PdfThemePresetId =
  | 'emerald-gold'
  | 'royal-sapphire'
  | 'crimson-urgent'
  | 'teal-coral'
  | 'maroon-heritage';

export interface PdfCustomizationConfig {
  schoolName: string;
  schoolTagline: string;
  schoolAddress: string;
  schoolPhone: string;
  signatoryTitle: string;
  badgeTitle: string;
  themeId: PdfThemePresetId;
  primaryColor: string;
  accentColor: string;
  surfaceTint: string;
  headerStyle: 'royal-banner' | 'ribbon-split' | 'bordered-crest';
  logoDataUrl?: string;
  showWatermark: boolean;
  watermarkText: string;
  showMonthlyBreakdown: boolean;
  showPaymentBox: boolean;
  upiId: string;
  customFooterNote: string;
  includeSignedPdfLinkInWhatsapp: boolean;
}

export interface PdfTemplateItem extends PdfCustomizationConfig {
  id: string;
  name: string;
  description?: string;
}

export type UserPermissionKey =
  | 'viewStudents'
  | 'editStudents'
  | 'sendWhatsapp'
  | 'managePdf'
  | 'manageTemplates'
  | 'manageScheduler'
  | 'viewReports'
  | 'downloadInstallers'
  | 'manageUsers';

export type UserPermissions = Record<UserPermissionKey, boolean>;

export interface AppUserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  role: 'admin' | 'staff' | 'operator';
  isPrimaryAdmin?: boolean;
  isActive: boolean;
  inactivityTimeoutMinutes: number;
  permissions: UserPermissions;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ScheduledJob {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  targetCohort: 'All Students' | 'Students with Dues Owed' | 'Transport Dues Only' | 'Low Attendance (<85%)' | 'Academic Warning' | 'Montessoris' | 'Primary (Std I-V)' | 'Middle (Std VI-VIII)';
  triggerType: 'Immediate' | 'Scheduled Once' | 'Recurring Weekly' | 'Recurring Monthly' | 'Performance Threshold';
  scheduledDate?: string;
  scheduledTime?: string;
  recurrenceDay?: string; // e.g., "1st of month"
  conditionThreshold?: string;
  channel: 'SMS' | 'WhatsApp';
  status: 'Active' | 'Paused' | 'Completed' | 'Pending';
  lastRun?: string;
  nextRun?: string;
  totalRecipients: number;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentMobile: string;
  channel: 'SMS' | 'WhatsApp';
  messageText: string;
  duesOwedAtDispatch: number;
  gpaAtDispatch: number;
  attendanceAtDispatch: number;
  status: 'Delivered' | 'Sent' | 'Read' | 'Failed';
  failureReason?: string;
  jobId?: string;
}
