import { StudentRecord, TemplateDesignConfig } from '../types';

export interface FormatOptions {
  schoolName?: string;
  currencySymbol?: string;
  design?: TemplateDesignConfig;
  allStudents?: StudentRecord[];
}

export interface MonthlyDueEntry {
  key: 'april' | 'may' | 'june' | 'july' | 'august' | 'september' | 'october';
  shortLabel: string;
  fullLabel: string;
  monthNumber: number;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

const MONTH_DEFS: Array<{
  key: MonthlyDueEntry['key'];
  shortLabel: string;
  fullLabel: string;
  monthNumber: number;
}> = [
  { key: 'april', shortLabel: 'Apr', fullLabel: 'April', monthNumber: 4 },
  { key: 'may', shortLabel: 'May', fullLabel: 'May', monthNumber: 5 },
  { key: 'june', shortLabel: 'Jun', fullLabel: 'June', monthNumber: 6 },
  { key: 'july', shortLabel: 'Jul', fullLabel: 'July', monthNumber: 7 },
  { key: 'august', shortLabel: 'Aug', fullLabel: 'August', monthNumber: 8 },
  { key: 'september', shortLabel: 'Sep', fullLabel: 'September', monthNumber: 9 },
  { key: 'october', shortLabel: 'Oct', fullLabel: 'October', monthNumber: 10 },
];

/**
 * Returns deterministic month-by-month dues entries (April - October).
 * Uses `student.monthlyFeeBreakdown` when available, or gracefully derives
 * per-month values from `dueMonths` and `duesOwed` for imported/newly-created records.
 */
export function getStudentMonthlyBreakdown(student: StudentRecord): MonthlyDueEntry[] {
  const b = student.monthlyFeeBreakdown;
  const hasExplicit =
    b &&
    MONTH_DEFS.some((m) => (b[m.key] ?? 0) > 0);

  if (hasExplicit && b) {
    return MONTH_DEFS.map((m) => {
      const amount = Math.max(0, Math.round(b[m.key] ?? 0));
      return {
        ...m,
        amount,
        status: amount === 0 ? 'Paid' : student.duesStatus === 'Overdue' ? 'Overdue' : 'Pending',
      };
    });
  }

  const totalDue = Math.max(0, Math.round(student.duesOwed || 0));
  if (totalDue === 0) {
    return MONTH_DEFS.map((m) => ({
      ...m,
      amount: 0,
      status: 'Paid',
    }));
  }

  // Parse active due month numbers from dueMonths (e.g., "4,5,6,7,8,9,10")
  const parsedNums = (student.dueMonths || '')
    .split(/[^0-9]+/)
    .map((x) => parseInt(x, 10))
    .filter((n) => !isNaN(n) && n >= 4 && n <= 10);

  const activeNumbers = parsedNums.length > 0 ? Array.from(new Set(parsedNums)) : [4, 5, 6, 7, 8, 9, 10];
  const perMonth = Math.floor(totalDue / activeNumbers.length);
  let remainder = totalDue - perMonth * activeNumbers.length;

  return MONTH_DEFS.map((m) => {
    if (!activeNumbers.includes(m.monthNumber)) {
      return { ...m, amount: 0, status: 'Paid' };
    }
    const extra = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder--;
    const amount = perMonth + extra;
    return {
      ...m,
      amount,
      status: amount === 0 ? 'Paid' : student.duesStatus === 'Overdue' ? 'Overdue' : 'Pending',
    };
  });
}

export interface PdfMonthlyDisplayEntry {
  key: string;
  shortLabel: string;
  fullLabel: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
}

/**
 * Returns monthly breakdown entries for Pending Dues PDF & inspection strip:
 * Uses uploaded Excel monthly columns directly when present, otherwise defaults
 * to the standard April - October schedule.
 */
export function getPdfMonthlyBreakdownEntries(student: StudentRecord): PdfMonthlyDisplayEntry[] {
  const order = student.excelColumnOrder;
  const raw = student.excelRawColumns;
  const roles = student.excelColumnRoles;

  if (order && raw && roles) {
    const monthlyCols = order.filter((col) => roles[col] === 'monthly');
    if (monthlyCols.length > 0) {
      return monthlyCols.map((col, idx) => {
        const cleaned = String(raw[col] ?? '').replace(/rs\.?|inr|₹|,|\s+/gi, '');
        const parsed = cleaned && /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : 0;
        const amount = Math.max(0, Math.round(isNaN(parsed) ? 0 : parsed));
        const cleanLabel = col.replace(/\s*\(.*?\)\s*/g, '').trim() || col;
        return {
          key: `excel-month-${idx}-${col}`,
          shortLabel: cleanLabel.slice(0, 3),
          fullLabel: cleanLabel,
          amount,
          status: amount === 0 ? 'Paid' : student.duesStatus === 'Overdue' ? 'Overdue' : 'Pending',
        };
      });
    }
  }

  return getStudentMonthlyBreakdown(student).map((m) => ({
    key: m.key,
    shortLabel: m.shortLabel,
    fullLabel: m.fullLabel,
    amount: m.amount,
    status: m.status,
  }));
}

/**
 * Convert __underline__ or <u>underline</u> spans into Unicode combining underline
 * so recipients inside WhatsApp see underlined text alongside *bold* and _italic_.
 */
export function applyUnicodeUnderline(input: string): string {
  return Array.from(input)
    .map((ch) => (ch === '\n' || ch === '\r' || ch === '\t' ? ch : `${ch}\u0332`))
    .join('');
}

/**
 * Prepare rich-formatted template text (*bold*, _italic_, __underline__, <u>underline</u>, ~strike~)
 * for WhatsApp transmission.
 */
export function formatTextForWhatsApp(text: string): string {
  if (!text) return '';
  let formatted = text;
  // Convert <u>...</u> tags first
  formatted = formatted.replace(/<u>([\s\S]*?)<\/u>/gi, (_m, inner: string) =>
    applyUnicodeUnderline(inner)
  );
  // Convert __...__ markdown underline
  formatted = formatted.replace(/__(?!\s)([^\n_][\s\S]*?[^\s_]|[^\n_\s])__/g, (_m, inner: string) =>
    applyUnicodeUnderline(inner)
  );
  return formatted;
}

/**
 * Apply designer header banner, all-over message box border, and footer signature around a message body.
 */
export function applyTemplateDesign(body: string, design?: TemplateDesignConfig): string {
  if (
    !design ||
    (design.borderStyle === 'none' &&
      !design.fullBorderBox &&
      !design.headerBadge &&
      !design.footerSignature)
  ) {
    return body;
  }

  const headerBadge = design.headerBadge?.trim();
  const footerSig = design.footerSignature?.trim();
  const useAllOverBox = Boolean(design.fullBorderBox || design.borderStyle === 'full-box');

  if (useAllOverBox) {
    const isDouble = design.borderStyle === 'double-ornate';
    const topBar = isDouble
      ? '╔══════════════════════════════╗'
      : '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓';
    const midBar = isDouble
      ? '╠══════════════════════════════╣'
      : '┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫';
    const botBar = isDouble
      ? '╚══════════════════════════════╝'
      : '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛';
    const side = isDouble ? '║ ' : '┃ ';

    const out: string[] = [topBar];
    if (headerBadge) {
      out.push(`${side}*${headerBadge}*`);
      out.push(midBar);
    }

    const bodyLines = body.trim().split('\n');
    for (const line of bodyLines) {
      out.push(line.trim() === '' ? side.trimEnd() : `${side}${line}`);
    }

    if (footerSig) {
      out.push(midBar);
      out.push(`${side}_${footerSig}_`);
    }
    out.push(botBar);
    return out.join('\n');
  }

  const lines: string[] = [];

  if (design.borderStyle === 'star-banner') {
    lines.push('✦ ━━━━━━━━━━━━━━ ✦');
    if (headerBadge) lines.push(`*${headerBadge}*`);
    lines.push('✦ ━━━━━━━━━━━━━━ ✦');
  } else if (design.borderStyle === 'double-ornate') {
    lines.push('╔══════════════════╗');
    if (headerBadge) lines.push(`  *${headerBadge}*`);
    lines.push('╚══════════════════╝');
  } else if (design.borderStyle === 'dues-alert-box') {
    lines.push('┏━━━━━━━━━━━━━━━━━━┓');
    lines.push(`  *${headerBadge || '***** PENDING DUES *****'}*`);
    lines.push('┗━━━━━━━━━━━━━━━━━━┛');
  } else if (design.borderStyle === 'classic-line') {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    if (headerBadge) lines.push(`*${headerBadge}*`);
    lines.push('━━━━━━━━━━━━━━━━━━━━');
  } else if (headerBadge) {
    lines.push(`*${headerBadge}*`);
  }

  lines.push(body.trim());

  if (footerSig) {
    if (design.borderStyle === 'classic-line' || design.borderStyle === 'double-ornate') {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
    } else if (design.borderStyle === 'star-banner') {
      lines.push('✦ ━━━━━━━━━━━━━━ ✦');
    } else if (design.borderStyle === 'dues-alert-box') {
      lines.push('━━━━━━━━━━━━━━━━━━━━');
    }
    lines.push(`_${footerSig}_`);
  }

  return lines.join('\n');
}

/**
 * Format currency with Indian Rupee (₹) styling by default
 */
export function formatCurrency(amount: number | undefined, symbol = 'Rs. '): string {
  if (amount === undefined || isNaN(amount)) return `${symbol}0`;
  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Clean and format Indian and international mobile phone numbers
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  // Handle multiple space-separated numbers
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(/\s+/);
    return parts.map((p) => formatSinglePhone(p)).join(' / ');
  }
  return formatSinglePhone(trimmed);
}

function formatSinglePhone(p: string): string {
  const digits = p.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return p;
}

/**
 * Validate phone number format
 */
export function isValidMobileNumber(phone: string): boolean {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 9;
}

/**
 * Clean phone number into international dialing digits for WhatsApp (e.g. 919801278254)
 */
export function getWhatsAppPhoneDigits(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const multiMatches = trimmed.match(/\b\d{10}\b/g);
  if (multiMatches && multiMatches.length > 0) {
    return `91${multiMatches[0]}`;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Generate direct WhatsApp Web link (opens web.whatsapp.com directly)
 */
export function generateWhatsAppWebUrl(phone: string, message: string): string {
  const phoneDigits = getWhatsAppPhoneDigits(phone);
  const encodedText = encodeURIComponent(formatTextForWhatsApp(message));
  return `https://web.whatsapp.com/send?phone=${phoneDigits}&text=${encodedText}`;
}

/**
 * Universal wa.me link (redirects to WhatsApp Web on desktop or WhatsApp App on phone)
 */
export function generateWaMeUrl(phone: string, message: string): string {
  const phoneDigits = getWhatsAppPhoneDigits(phone);
  const encodedText = encodeURIComponent(formatTextForWhatsApp(message));
  return `https://wa.me/${phoneDigits}?text=${encodedText}`;
}

/**
 * Replace placeholders and evaluate conditional sections
 */
export function renderPersonalizedMessage(
  templateText: string,
  student: StudentRecord,
  options: FormatOptions = {}
): string {
  // If individual student has a bespoke custom override, respect it directly
  if (student.customMessageOverride && student.customMessageOverride.trim().length > 0) {
    return options.design
      ? applyTemplateDesign(student.customMessageOverride, options.design)
      : student.customMessageOverride;
  }

  const schoolName = options.schoolName || 'Kidzee School';
  const currencySymbol = options.currencySymbol || 'Rs. ';
  const formattedDues = formatCurrency(student.duesOwed, currencySymbol);
  const formattedTuition = formatCurrency(student.tuitionDues ?? 0, currencySymbol);
  const formattedTransport = formatCurrency(student.transportDues ?? 0, currencySymbol);
  const formattedLateFee = formatCurrency(student.lateFee ?? 0, currencySymbol);
  const formattedPhone = formatPhoneNumber(student.parentMobile);

  const monthlyEntries = getStudentMonthlyBreakdown(student);
  const monthMap = Object.fromEntries(monthlyEntries.map((m) => [m.key, m.amount])) as Record<
    MonthlyDueEntry['key'],
    number
  >;
  const monthlyDuesSummary = monthlyEntries
    .filter((m) => m.amount > 0)
    .map((m) => `${m.shortLabel}: ${formatCurrency(m.amount, currencySymbol)}`)
    .join(', ') || 'No monthly pending dues';

  // Class-level cohort tokens computed from allStudents when supplied
  const classCohort = options.allStudents
    ? options.allStudents.filter((s) => s.gradeLevel === student.gradeLevel)
    : [student];
  const classTotalStudents = String(classCohort.length);
  const classTotalDues = formatCurrency(
    classCohort.reduce((acc, s) => acc + (s.duesOwed || 0), 0),
    currencySymbol
  );

  let content = templateText;

  // Process conditional blocks:
  // 1. {{#if dues}} ... {{/if}}
  content = content.replace(
    /\{\{#if dues\}\}([\s\S]*?)\{\{\/if\}\}/gi,
    student.duesOwed > 0 ? '$1' : ''
  );

  // 2. {{#if overdue}} ... {{/if}}
  content = content.replace(
    /\{\{#if overdue\}\}([\s\S]*?)\{\{\/if\}\}/gi,
    student.duesStatus === 'Overdue' && student.duesOwed > 0 ? '$1' : ''
  );

  // 3. {{#if transport}} ... {{/if}}
  content = content.replace(
    /\{\{#if transport\}\}([\s\S]*?)\{\{\/if\}\}/gi,
    (student.transportDues ?? 0) > 0 ? '$1' : ''
  );

  // 4. {{#if low_attendance}} ... {{/if}}
  content = content.replace(
    /\{\{#if low_attendance\}\}([\s\S]*?)\{\{\/if\}\}/gi,
    student.attendanceRate < 85 ? '$1' : ''
  );

  // 5. {{#if honors}} ... {{/if}}
  content = content.replace(
    /\{\{#if honors\}\}([\s\S]*?)\{\{\/if\}\}/gi,
    student.gpa >= 3.6 || student.academicStanding === 'Exemplary' ? '$1' : ''
  );

  // 6. {{#if warning}} ... {{/if}}
  content = content.replace(
    /\{\{#if warning\}\}([\s\S]*?)\{\{\/if\}\}/gi,
    student.gpa < 2.5 || student.academicStanding === 'Academic Warning' ? '$1' : ''
  );

  // Replace variable tokens (full Excel Sheet & Class metrics)
  const replacements: Record<string, string> = {
    '{StudentName}': student.studentName,
    '{ParentName}': student.parentName,
    '{FatherName}': student.fatherName || student.parentName,
    '{Relationship}': student.parentRelationship || 'Father',
    '{RollNo}': student.rollNo || '1',
    '{EnrollmentNo}': student.enrollmentNo || student.studentId,
    '{RegistrationNo}': student.registrationNo || '—',
    '{Grade}': student.gradeLevel,
    '{Class}': student.gradeLevel,
    '{Address}': student.address || 'Muzaffarpur',
    '{MobileNumber}': formattedPhone,
    '{Contact}': formattedPhone,
    '{ParentEmail}': student.parentEmail || '—',
    '{GPA}': student.gpa.toFixed(2),
    '{OverallPercentage}': `${student.overallPercentage}%`,
    '{Attendance}': `${student.attendanceRate}%`,
    '{TopSubject}': student.topSubject || 'Mathematics',
    '{AreaToImprove}': student.areaToImprove || 'Hindi / Science',
    '{AcademicStanding}': student.academicStanding,
    '{TeacherRemarks}': student.teacherRemarks || 'Active participation in school.',
    '{DuesOwed}': formattedDues,
    '{TotalDues}': formattedDues,
    '{TuitionDues}': formattedTuition,
    '{TransportDues}': formattedTransport,
    '{LateFee}': formattedLateFee,
    '{DueMonths}': student.dueMonths || 'Apr - Oct',
    '{DuesStatus}': student.duesStatus,
    '{LastPayment}': student.lastPaymentRecord || 'None recorded',
    '{DueDate}': student.expectedPaymentDate || student.duesDueDate,
    '{ExpectedPaymentDate}': student.expectedPaymentDate || student.duesDueDate,
    '{LastNotifiedDate}': student.lastNotifiedDate || 'Not yet notified',
    '{AprilDue}': formatCurrency(monthMap.april, currencySymbol),
    '{MayDue}': formatCurrency(monthMap.may, currencySymbol),
    '{JuneDue}': formatCurrency(monthMap.june, currencySymbol),
    '{JulyDue}': formatCurrency(monthMap.july, currencySymbol),
    '{AugustDue}': formatCurrency(monthMap.august, currencySymbol),
    '{SeptemberDue}': formatCurrency(monthMap.september, currencySymbol),
    '{OctoberDue}': formatCurrency(monthMap.october, currencySymbol),
    '{MonthlyDuesSummary}': monthlyDuesSummary,
    '{ClassTotalStudents}': classTotalStudents,
    '{ClassTotalDues}': classTotalDues,
    '{PaymentLink}':
      student.paymentLink ||
      `https://pay.schoolportal.in/due/${student.enrollmentNo || student.studentId}`,
    '{SchoolName}': schoolName,
  };

  for (const [key, val] of Object.entries(replacements)) {
    const regex = new RegExp(key.replace(/\{/g, '\\{').replace(/\}/g, '\\}'), 'g');
    content = content.replace(regex, val);
  }

  // Replace any dynamic uploaded Excel/CSV column tokens ({ColHeader} or {Excel:ColHeader})
  if (student.excelRawColumns) {
    for (const [colHeader, colVal] of Object.entries(student.excelRawColumns)) {
      const escaped = colHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`\\{(?:Excel:)?${escaped}\\}`, 'gi');
      content = content.replace(tokenRegex, colVal || '—');
    }
  }

  // Clean up any extra empty consecutive blank lines and redundant spaces
  content = content.replace(/[ \t]{2,}/g, ' ');
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  if (options.design) {
    content = applyTemplateDesign(content, options.design);
  }

  return content;
}

export interface TemplateVariableDef {
  token: string;
  label: string;
  desc: string;
  category: 'Student & Class' | 'Excel Dues & Monthly' | 'Academic & Remarks';
}

export const TEMPLATE_VARIABLES: TemplateVariableDef[] = [
  // Student & Class Excel Columns
  { token: '{StudentName}', label: 'Student Name', desc: 'Full name of student (Excel Name)', category: 'Student & Class' },
  { token: '{FatherName}', label: 'Father Name', desc: 'Father name from Excel sheet', category: 'Student & Class' },
  { token: '{ParentName}', label: 'Parent / Guardian', desc: 'Guardian name', category: 'Student & Class' },
  { token: '{Relationship}', label: 'Relationship', desc: 'Father / Mother / Guardian', category: 'Student & Class' },
  { token: '{Class}', label: 'Class', desc: 'Excel Class (e.g. Std-I B, Montessoris 2 A)', category: 'Student & Class' },
  { token: '{Grade}', label: 'Grade Level', desc: 'Alias for Class', category: 'Student & Class' },
  { token: '{RollNo}', label: 'Roll No', desc: 'Class roll number', category: 'Student & Class' },
  { token: '{EnrollmentNo}', label: 'Enrollment No', desc: 'School enrollment ID', category: 'Student & Class' },
  { token: '{RegistrationNo}', label: 'Registration No', desc: 'Official registration number', category: 'Student & Class' },
  { token: '{Contact}', label: 'Contact Mobile', desc: 'Parent contact number', category: 'Student & Class' },
  { token: '{MobileNumber}', label: 'Mobile Number', desc: 'Formatted +91 mobile number', category: 'Student & Class' },
  { token: '{ParentEmail}', label: 'Parent Email', desc: 'Guardian email address', category: 'Student & Class' },
  { token: '{Address}', label: 'Village / Address', desc: 'Excel Address / Village column', category: 'Student & Class' },
  { token: '{ClassTotalStudents}', label: 'Class Strength', desc: 'Total students in same class', category: 'Student & Class' },
  { token: '{ClassTotalDues}', label: 'Class Total Dues', desc: 'Aggregate dues of student class', category: 'Student & Class' },
  { token: '{SchoolName}', label: 'School Name', desc: 'Kidzee School branding', category: 'Student & Class' },

  // Excel Dues & Monthly Fee Columns
  { token: '{TotalDues}', label: 'Total Dues (₹)', desc: 'Excel Total Dues payable', category: 'Excel Dues & Monthly' },
  { token: '{TuitionDues}', label: 'Tuition Dues', desc: 'Excel Tu. Dues component', category: 'Excel Dues & Monthly' },
  { token: '{TransportDues}', label: 'Transport Dues', desc: 'Excel Tran. Dues (Van/Bus)', category: 'Excel Dues & Monthly' },
  { token: '{LateFee}', label: 'Late Fee (LF)', desc: 'Excel LF fine column', category: 'Excel Dues & Monthly' },
  { token: '{DuesStatus}', label: 'Dues Status', desc: 'Overdue / Pending / Paid', category: 'Excel Dues & Monthly' },
  { token: '{DueMonths}', label: 'Due Months', desc: 'Pending month numbers (e.g. 4,5,6...)', category: 'Excel Dues & Monthly' },
  { token: '{ExpectedPaymentDate}', label: 'EPD Date', desc: 'Excel Expected Payment Date', category: 'Excel Dues & Monthly' },
  { token: '{DueDate}', label: 'Due Date', desc: 'Payment deadline', category: 'Excel Dues & Monthly' },
  { token: '{LastPayment}', label: 'Last Payment', desc: 'Excel Last Payment Record', category: 'Excel Dues & Monthly' },
  { token: '{LastNotifiedDate}', label: 'Last Notified', desc: 'Last notice sent date', category: 'Excel Dues & Monthly' },
  { token: '{MonthlyDuesSummary}', label: 'Monthly Summary', desc: 'All pending months with amounts', category: 'Excel Dues & Monthly' },
  { token: '{AprilDue}', label: 'April Due', desc: 'April month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{MayDue}', label: 'May Due', desc: 'May month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{JuneDue}', label: 'June Due', desc: 'June month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{JulyDue}', label: 'July Due', desc: 'July month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{AugustDue}', label: 'August Due', desc: 'August month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{SeptemberDue}', label: 'September Due', desc: 'September month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{OctoberDue}', label: 'October Due', desc: 'October month pending fee', category: 'Excel Dues & Monthly' },
  { token: '{PaymentLink}', label: 'Payment Link', desc: 'Online fee portal URL', category: 'Excel Dues & Monthly' },

  // Academic & Remarks Columns
  { token: '{GPA}', label: 'GPA Score', desc: 'Cumulative GPA score', category: 'Academic & Remarks' },
  { token: '{OverallPercentage}', label: 'Percentage %', desc: 'Overall exam percentage', category: 'Academic & Remarks' },
  { token: '{Attendance}', label: 'Attendance %', desc: 'Attendance rate percentage', category: 'Academic & Remarks' },
  { token: '{AcademicStanding}', label: 'Standing', desc: 'Exemplary / Good Standing / Warning', category: 'Academic & Remarks' },
  { token: '{TopSubject}', label: 'Top Subject', desc: 'Best performing subject', category: 'Academic & Remarks' },
  { token: '{AreaToImprove}', label: 'Area to Improve', desc: 'Focus subject for improvement', category: 'Academic & Remarks' },
  { token: '{TeacherRemarks}', label: 'Teacher Remarks', desc: 'Principal / teacher note', category: 'Academic & Remarks' },
];
