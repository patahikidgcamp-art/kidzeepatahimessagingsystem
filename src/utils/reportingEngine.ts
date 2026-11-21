import * as XLSX from 'xlsx';
import { StudentRecord, DispatchLog, ExcelColumnRole } from '../types';

export interface PerformanceReportSummary {
  totalStudents: number;
  totalDuesOwed: number; // ₹ Total
  totalTuitionDues: number;
  totalTransportDues: number;
  totalLateFee: number;
  studentsWithDuesCount: number;
  totalOverdueDues: number;
  overdueStudentsCount: number;
  averageGpa: number;
  averageAttendance: number;
  honorRollCount: number;
  warningCount: number;
  invalidMobileCount: number;
  duesByStatus: {
    paid: { count: number; amount: number };
    pending: { count: number; amount: number };
    overdue: { count: number; amount: number };
  };
  classWiseSummary: Record<string, { count: number; dues: number }>;
  villageWiseSummary: Record<string, { count: number; dues: number }>;
}

/**
 * Compute aggregate statistics for the entire student cohort
 */
export function calculateReportSummary(students: StudentRecord[]): PerformanceReportSummary {
  if (students.length === 0) {
    return {
      totalStudents: 0,
      totalDuesOwed: 0,
      totalTuitionDues: 0,
      totalTransportDues: 0,
      totalLateFee: 0,
      studentsWithDuesCount: 0,
      totalOverdueDues: 0,
      overdueStudentsCount: 0,
      averageGpa: 0,
      averageAttendance: 0,
      honorRollCount: 0,
      warningCount: 0,
      invalidMobileCount: 0,
      duesByStatus: {
        paid: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        overdue: { count: 0, amount: 0 },
      },
      classWiseSummary: {},
      villageWiseSummary: {},
    };
  }

  let totalDues = 0;
  let totalTuition = 0;
  let totalTransport = 0;
  let totalLateFee = 0;
  let studentsWithDues = 0;
  let totalOverdue = 0;
  let overdueCount = 0;
  let sumGpa = 0;
  let sumAttendance = 0;
  let honorRoll = 0;
  let warnings = 0;
  let invalidMobiles = 0;

  let paidCount = 0;
  let paidAmount = 0;
  let pendingCount = 0;
  let pendingAmount = 0;

  const classWise: Record<string, { count: number; dues: number }> = {};
  const villageWise: Record<string, { count: number; dues: number }> = {};

  for (const s of students) {
    const due = s.duesOwed || 0;
    totalDues += due;
    totalTuition += s.tuitionDues || 0;
    totalTransport += s.transportDues || 0;
    totalLateFee += s.lateFee || 0;

    if (due > 0) studentsWithDues++;

    if (s.duesStatus === 'Overdue' && due > 0) {
      totalOverdue += due;
      overdueCount++;
    }

    if (s.duesStatus === 'Paid' || due === 0) {
      paidCount++;
      paidAmount += 0;
    } else if (s.duesStatus === 'Pending') {
      pendingCount++;
      pendingAmount += due;
    }

    sumGpa += s.gpa || 0;
    sumAttendance += s.attendanceRate || 0;

    if (s.gpa >= 3.6 || s.academicStanding === 'Exemplary') {
      honorRoll++;
    }
    if (s.gpa < 2.5 || s.academicStanding === 'Academic Warning' || s.attendanceRate < 80) {
      warnings++;
    }

    // Class wise grouping
    const cls = s.gradeLevel || 'Other';
    if (!classWise[cls]) classWise[cls] = { count: 0, dues: 0 };
    classWise[cls].count++;
    classWise[cls].dues += due;

    // Village grouping (extract simple village tag)
    let village = 'Other';
    if (s.address) {
      const lower = s.address.toLowerCase();
      if (lower.includes('marwan')) village = 'Marwan';
      else if (lower.includes('pakari') || lower.includes('pakohi')) village = 'Pakari Pakohi';
      else if (lower.includes('kudhani') || lower.includes('kharauna')) village = 'Kudhani / Kharauna';
      else if (lower.includes('patahi') || lower.includes('mahmadpur')) village = 'Patahi / Mahmadpur';
      else if (lower.includes('kodariya') || lower.includes('manshurpur')) village = 'Makdumpur Kodariya';
      else village = s.address.split(',')[0].trim();
    }
    if (!villageWise[village]) villageWise[village] = { count: 0, dues: 0 };
    villageWise[village].count++;
    villageWise[village].dues += due;

    // Phone validation
    const digits = (s.parentMobile || '').replace(/\D/g, '');
    if (digits.length < 9) {
      invalidMobiles++;
    }
  }

  return {
    totalStudents: students.length,
    totalDuesOwed: Math.round(totalDues),
    totalTuitionDues: Math.round(totalTuition),
    totalTransportDues: Math.round(totalTransport),
    totalLateFee: Math.round(totalLateFee),
    studentsWithDuesCount: studentsWithDues,
    totalOverdueDues: Math.round(totalOverdue),
    overdueStudentsCount: overdueCount,
    averageGpa: Math.round((sumGpa / students.length) * 100) / 100,
    averageAttendance: Math.round((sumAttendance / students.length) * 10) / 10,
    honorRollCount: honorRoll,
    warningCount: warnings,
    invalidMobileCount: invalidMobiles,
    duesByStatus: {
      paid: { count: paidCount, amount: paidAmount },
      pending: { count: pendingCount, amount: pendingAmount },
      overdue: { count: overdueCount, amount: totalOverdue },
    },
    classWiseSummary: classWise,
    villageWiseSummary: villageWise,
  };
}

/**
 * Export students & automated dues report into an Excel (.xlsx) file.
 * Preserves all dynamic Excel columns when the database was uploaded from a custom spreadsheet.
 */
export function exportStudentsToExcel(
  students: StudentRecord[],
  fileName = 'School_Management_System_Dues_Report.xlsx'
) {
  const customCols = students.find((s) => (s.excelColumnOrder?.length ?? 0) > 0)?.excelColumnOrder;

  const data = students.map((s, idx) => {
    if (customCols && customCols.length > 0 && s.excelRawColumns) {
      const row: Record<string, string | number> = {};
      for (const col of customCols) {
        row[col] = s.excelRawColumns[col] ?? '';
      }
      return row;
    }

    return {
      'S.No': idx + 1,
      'Class': s.gradeLevel,
      'Enrollment No': s.enrollmentNo || s.studentId,
      'Registration No': s.registrationNo || '',
      'Roll No': s.rollNo || '',
      'Name': s.studentName,
      'Father': s.fatherName || s.parentName,
      'Contact': s.parentMobile,
      'Address': s.address || '',
      'Tu. Dues (₹)': s.tuitionDues ?? 0,
      'Tran. Dues (₹)': s.transportDues ?? 0,
      'LF (₹)': s.lateFee ?? 0,
      'Total Dues (₹)': s.duesOwed,
      'Status': s.duesStatus,
      'Expected Payment Date': s.expectedPaymentDate || s.duesDueDate,
      'Months Due': s.dueMonths || '',
      'Last Payment Record': s.lastPaymentRecord || '',
      'GPA': s.gpa,
      'Attendance': `${s.attendanceRate}%`,
      'Teacher Remarks': s.teacherRemarks,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dues Register');

  // Summary worksheet
  const summary = calculateReportSummary(students);
  const summaryData = [
    { Metric: 'Total Students in Register', Value: summary.totalStudents },
    { Metric: 'Total Outstanding Dues (₹)', Value: `₹${summary.totalDuesOwed.toLocaleString('en-IN')}` },
    { Metric: 'Total Tuition Dues (₹)', Value: `₹${summary.totalTuitionDues.toLocaleString('en-IN')}` },
    { Metric: 'Total Transport Dues (₹)', Value: `₹${summary.totalTransportDues.toLocaleString('en-IN')}` },
    { Metric: 'Total Late Fee (₹)', Value: `₹${summary.totalLateFee.toLocaleString('en-IN')}` },
    { Metric: 'Students with Outstanding Dues', Value: summary.studentsWithDuesCount },
    { Metric: 'Total Overdue Dues (₹)', Value: `₹${summary.totalOverdueDues.toLocaleString('en-IN')}` },
    { Metric: 'Students with Overdue Status', Value: summary.overdueStudentsCount },
    { Metric: 'Average Attendance Rate', Value: `${summary.averageAttendance}%` },
    { Metric: 'Exemplary / Honors Students', Value: summary.honorRollCount },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Financial Summary');

  XLSX.writeFile(workbook, fileName);
}

/**
 * Export dispatch audit logs to Excel
 */
export function exportDispatchLogsToExcel(
  logs: DispatchLog[],
  fileName = 'Parent_Messaging_Audit_Log.xlsx'
) {
  const data = logs.map((l, idx) => ({
    '#': idx + 1,
    'Timestamp': l.timestamp,
    'Student Name': l.studentName,
    'Student ID / Roll': l.studentId,
    'Parent / Father Name': l.parentName,
    'Contact Number': l.parentMobile,
    'Channel': l.channel,
    'Status': l.status,
    'Dues at Dispatch (₹)': l.duesOwedAtDispatch,
    'Message Text': l.messageText,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Delivery Audit Logs');
  XLSX.writeFile(wb, fileName);
}

export function parseNumericCell(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  const str = String(val).trim();
  if (!str) return undefined;
  // Strip currency prefixes, commas, and surrounding whitespace
  const cleaned = str.replace(/rs\.?|inr|₹|,|\s+/gi, '');
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const num = Number(cleaned);
  return isNaN(num) ? undefined : num;
}

const MONTH_HEADER_REGEX =
  /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)(\s*(due|dues|fee|fees|pending))?$/i;

export function classifyExcelHeaderRole(header: string): ExcelColumnRole {
  const norm = header.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!norm) return 'ignore';

  if (
    /^(total\s*dues|total\s*pending|pending\s*dues|net\s*payable|net\s*balance|net\s*amount|balance\s*due|grand\s*total|total\s*balance|dues\s*owed|total\s*fee\s*due|net\s*dues|payable\s*amount|total\s*payable|total(\s*\(.*\))?)$/.test(
      norm
    ) ||
    ((norm.includes('total') || norm.includes('net')) &&
      (norm.includes('due') || norm.includes('pending') || norm.includes('balance') || norm.includes('payable') || norm.includes('amount')))
  ) {
    return 'total';
  }

  if (MONTH_HEADER_REGEX.test(norm)) {
    return 'monthly';
  }

  if (
    /(tu\.?\s*due|tuition|tran\.?\s*due|transport|bus\s*fee|van\s*fee|conveyance|late\s*fee|late\s*fine|fine|^lf\b|annual|exam|book|uniform|diary|lab\b|computer|smart\s*class|hostel|admission\s*fee|reg(istration)?\s*fee|activity|misc|other\s*fee|arrear|prev(ious)?\s*(due|bal)|old\s*due|discount|concession|waiver|paid|received|deposit|last\s*payment|\blpr\b|receipt|months?\s*due|due\s*month|^months$|\bepd\b|expected\s*payment|due\s*date|dues\s*status|fee\s*status|payment\s*status|fee\b|dues\b|balance\b|amount\b)/i.test(
      norm
    )
  ) {
    return 'fee';
  }

  return 'student';
}

export interface ExcelHeaderMapping {
  originalHeader: string;
  displayHeader: string;
  role: ExcelColumnRole;
}

export interface ParsedExcelResult {
  records: StudentRecord[];
  columnOrder: string[];
  columnRoles: Record<string, ExcelColumnRole>;
  headerRowIndex: number;
  sheetName: string;
}

/**
 * Parse ANY CSV or Excel file into full-column StudentRecord[] capturing ALL columns,
 * automatically detecting the header row, classifying Student Details vs Fee Details vs
 * Monthly Dues vs Total Dues, and preserving raw values for PDF & database generation.
 */
export function parseExcelFileDetailed(arrayBuffer: ArrayBuffer): ParsedExcelResult {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      records: [],
      columnOrder: [],
      columnRoles: {},
      headerRowIndex: 0,
      sheetName: '',
    };
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (matrix.length === 0) {
    return {
      records: [],
      columnOrder: [],
      columnRoles: {},
      headerRowIndex: 0,
      sheetName: firstSheetName,
    };
  }

  // Detect the actual header row cleanly (handles title banners in rows 1-2)
  const HEADER_KEYWORDS = [
    'name',
    'student',
    'father',
    'parent',
    'class',
    'grade',
    'std',
    'roll',
    'enr',
    'adm',
    'mobile',
    'contact',
    'phone',
    'address',
    'dues',
    'fee',
    'tuition',
    'transport',
    'total',
    'april',
    'may',
    's.no',
    'sr',
  ];

  let headerRowIndex = 0;
  let bestScore = -1;
  const maxScan = Math.min(matrix.length, 15);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r] || [];
    const nonEmpty = row.map((c) => String(c ?? '').trim()).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    let kwMatches = 0;
    for (const cell of nonEmpty) {
      const lower = cell.toLowerCase();
      if (HEADER_KEYWORDS.some((kw) => lower.includes(kw))) {
        kwMatches++;
      }
    }
    const score = kwMatches * 10 + nonEmpty.length;
    if (score > bestScore) {
      bestScore = score;
      headerRowIndex = r;
    }
  }

  const rawHeaderRow = matrix[headerRowIndex] || [];
  let lastNonEmptyCol = -1;
  rawHeaderRow.forEach((cell, cIdx) => {
    if (String(cell ?? '').trim() !== '') lastNonEmptyCol = cIdx;
  });
  // Also consider data rows in case a trailing column header was blank
  for (let r = headerRowIndex + 1; r < Math.min(matrix.length, headerRowIndex + 10); r++) {
    const row = matrix[r] || [];
    row.forEach((cell, cIdx) => {
      if (String(cell ?? '').trim() !== '' && cIdx > lastNonEmptyCol) {
        lastNonEmptyCol = cIdx;
      }
    });
  }

  if (lastNonEmptyCol < 0) {
    return {
      records: [],
      columnOrder: [],
      columnRoles: {},
      headerRowIndex,
      sheetName: firstSheetName,
    };
  }

  const usedHeaders = new Map<string, number>();
  const columnOrder: string[] = [];
  for (let c = 0; c <= lastNonEmptyCol; c++) {
    const base = String(rawHeaderRow[c] ?? '').trim() || `Column ${c + 1}`;
    const count = (usedHeaders.get(base) || 0) + 1;
    usedHeaders.set(base, count);
    const uniqueName = count === 1 ? base : `${base} (${count})`;
    columnOrder.push(uniqueName);
  }

  const columnRoles: Record<string, ExcelColumnRole> = {};
  for (const col of columnOrder) {
    columnRoles[col] = classifyExcelHeaderRole(col);
  }

  const findVal = (rowObj: Record<string, string>, exactAliases: string[], fuzzyPatterns: RegExp[] = []): string => {
    // 1. Exact case-insensitive match
    for (const alias of exactAliases) {
      for (const col of columnOrder) {
        if (col.trim().toLowerCase() === alias.toLowerCase()) {
          const val = rowObj[col];
          if (val !== undefined && val !== '') return val;
        }
      }
    }
    // 2. Fuzzy regex match
    for (const regex of fuzzyPatterns) {
      for (const col of columnOrder) {
        if (regex.test(col.trim())) {
          const val = rowObj[col];
          if (val !== undefined && val !== '') return val;
        }
      }
    }
    return '';
  };

  const records: StudentRecord[] = [];
  const dataRows = matrix.slice(headerRowIndex + 1);

  dataRows.forEach((rawRow, idx) => {
    const rowObj: Record<string, string> = {};
    let hasAnyValue = false;
    for (let c = 0; c < columnOrder.length; c++) {
      const valStr = String(rawRow?.[c] ?? '').trim();
      if (valStr !== '') hasAnyValue = true;
      rowObj[columnOrder[c]] = valStr;
    }

    if (!hasAnyValue) return;

    // Skip footer Grand Total / Summary rows at the bottom of school sheets
    const firstFewJoined = columnOrder
      .slice(0, 4)
      .map((col) => rowObj[col]?.toLowerCase() || '')
      .join(' ');
    if (/\b(grand\s*total|total\s*sum)\b/i.test(firstFewJoined)) {
      return;
    }

    const studentNameRaw = findVal(
      rowObj,
      ['Name', 'Student Name', 'student_name', 'Student', 'Pupil Name', 'Child Name'],
      [/student\s*name/i, /^name$/i]
    );
    const fatherNameRaw = findVal(
      rowObj,
      ['Father', 'Father Name', "Father's Name", 'Parent Name', 'Guardian', 'Guardian Name', 'parent_name'],
      [/father/i, /guardian/i, /parent\s*name/i]
    );

    // If both name & father are blank AND first cell looks like "Total", skip summary row
    if (!studentNameRaw && !fatherNameRaw && /^total$/i.test(rowObj[columnOrder[0]] || '')) {
      return;
    }

    const studentName = studentNameRaw || `Student ${records.length + 1}`;
    const fatherName = fatherNameRaw || 'Father / Guardian';

    const enrollmentNo =
      findVal(
        rowObj,
        ['Enrollment No', 'Enrollment', 'Enr No', 'Adm No', 'Admission No', 'ID', 'Student ID', 'Scholar No'],
        [/enrol/i, /adm(ission)?\s*no/i, /scholar/i]
      ) || `${100 + records.length}`;

    const rollNo =
      findVal(rowObj, ['Roll No', 'RollNumber', 'Roll', 'Roll Number'], [/^roll/i]) ||
      `${records.length + 1}`;
    const regNo = findVal(
      rowObj,
      ['Registration No', 'Reg No', 'Registration'],
      [/reg(istration)?\s*no/i]
    );

    const baseClass =
      findVal(rowObj, ['Class', 'Grade', 'Grade Level', 'Std', 'Standard', 'Class & Sec'], [/^class/i, /^std/i]) ||
      'Std-I';
    const sectionVal = findVal(rowObj, ['Section', 'Sec'], [/^section$/i]);
    const gradeLevel =
      sectionVal && !baseClass.toLowerCase().includes(sectionVal.toLowerCase())
        ? `${baseClass} ${sectionVal}`.trim()
        : baseClass;

    const contact =
      findVal(
        rowObj,
        ['Contact', 'Mobile', 'Mobile Number', 'Mobile No', 'Phone', 'Phone No', 'Contact No', 'WhatsApp', 'Whatsapp No'],
        [/mobile/i, /contact/i, /phone/i, /whatsapp/i]
      ) || '9801278254';

    const address =
      findVal(rowObj, ['Address', 'Village', 'Vill', 'Locality', 'Residential Address'], [/address/i, /village/i]) ||
      'Muzaffarpur';

    const parentEmail =
      findVal(rowObj, ['Email', 'Parent Email', 'ParentEmail', 'E-mail'], [/mail/i]) || undefined;

    const tuitionDues =
      parseNumericCell(
        findVal(rowObj, ['Tu. Dues', 'Tu. Dues (₹)', 'Tuition Dues', 'Tuition Fee', 'Tuition', 'Tu Dues'], [/tuition/i, /tu\.?\s*due/i])
      ) ?? 0;

    const transportDues =
      parseNumericCell(
        findVal(
          rowObj,
          ['Tran. Dues', 'Tran. Dues (₹)', 'Transport Dues', 'Transport Fee', 'Transport', 'Bus Fee', 'Van Fee', 'Conveyance'],
          [/transport/i, /tran\.?\s*due/i, /bus\s*fee/i, /van\s*fee/i]
        )
      ) ?? 0;

    const lateFee =
      parseNumericCell(
        findVal(rowObj, ['LF', 'LF (₹)', 'Late Fee', 'Late Fine', 'Fine'], [/late\s*f/i, /^lf\b/i])
      ) ?? 0;

    const april = parseNumericCell(findVal(rowObj, ['April', 'Apr', 'Apr Due', 'April Due', 'April Fee']));
    const may = parseNumericCell(findVal(rowObj, ['May', 'May Due', 'May Fee']));
    const june = parseNumericCell(findVal(rowObj, ['June', 'Jun', 'Jun Due', 'June Due', 'June Fee']));
    const july = parseNumericCell(findVal(rowObj, ['July', 'Jul', 'Jul Due', 'July Due', 'July Fee']));
    const august = parseNumericCell(findVal(rowObj, ['August', 'Aug', 'Aug Due', 'August Due', 'August Fee']));
    const september = parseNumericCell(findVal(rowObj, ['September', 'Sep', 'Sept', 'Sep Due', 'September Due', 'September Fee']));
    const october = parseNumericCell(findVal(rowObj, ['October', 'Oct', 'Oct Due', 'October Due', 'October Fee']));

    const hasMonthlyCols = [april, may, june, july, august, september, october].some(
      (v) => v !== undefined
    );

    // Find explicit total column (or any column classified as 'total')
    const totalColHeader = columnOrder.find((col) => columnRoles[col] === 'total');
    const explicitTotal = totalColHeader ? parseNumericCell(rowObj[totalColHeader]) : undefined;

    // Fallback: sum all numeric fee columns (or monthly columns) if no explicit Total column
    let computedFeeSum = 0;
    for (const col of columnOrder) {
      if (columnRoles[col] === 'fee') {
        const lower = col.toLowerCase();
        // Skip discount/paid columns from additive dues fallback
        if (/(discount|concession|waiver|paid|received|deposit|last\s*payment|lpr)/i.test(lower)) continue;
        const val = parseNumericCell(rowObj[col]);
        if (val !== undefined) computedFeeSum += val;
      }
    }
    let computedMonthlySum = 0;
    for (const col of columnOrder) {
      if (columnRoles[col] === 'monthly') {
        const val = parseNumericCell(rowObj[col]);
        if (val !== undefined) computedMonthlySum += val;
      }
    }

    const totalDues =
      explicitTotal !== undefined
        ? explicitTotal
        : computedFeeSum > 0
        ? computedFeeSum
        : computedMonthlySum > 0
        ? computedMonthlySum
        : tuitionDues + transportDues + lateFee;

    const monthsDue =
      findVal(rowObj, ['Months', 'Months Due', 'Due Months', 'Pending Months'], [/months?\s*due/i]) ||
      '4,5,6,7,8,9,10';
    const epdRaw =
      findVal(rowObj, ['EPD', 'Expected Payment Date', 'Due Date', 'Last Date'], [/expected\s*pay/i, /due\s*date/i]) ||
      '19/09/2026';
    const lastPaymentRecord =
      findVal(rowObj, ['Last Payment Record', 'Last Payment', 'Last Receipt', 'LPR', 'Last Paid'], [/last\s*pay/i]) ||
      undefined;
    const rawStatus = findVal(rowObj, ['Status', 'Dues Status', 'Fee Status', 'Payment Status'], [/status$/i]);

    const dateMatch = epdRaw.match(/(\d{2}\/\d{2}\/\d{4})/);
    const expectedPaymentDate = dateMatch ? dateMatch[1] : epdRaw;

    const resolvedStatus: 'Paid' | 'Pending' | 'Overdue' =
      totalDues <= 0
        ? 'Paid'
        : rawStatus.toLowerCase().includes('pending')
        ? 'Pending'
        : rawStatus.toLowerCase().includes('paid')
        ? 'Paid'
        : 'Overdue';

    const gpaNum = parseNumericCell(findVal(rowObj, ['GPA', 'CGPA']));
    const attendanceNum = parseNumericCell(findVal(rowObj, ['Attendance', 'Attendance %', 'Att %']));
    const percentageNum = parseNumericCell(findVal(rowObj, ['Percentage', 'Overall %', 'Marks %']));
    const topSubject = findVal(rowObj, ['Top Subject', 'Best Subject']) || 'General Studies';
    const areaToImprove = findVal(rowObj, ['Area to Improve', 'Weak Subject']) || 'Mathematics';
    const teacherRemarks =
      findVal(rowObj, ['Teacher Remarks', 'Remarks', 'Note']) || 'Regular in attendance.';

    records.push({
      id: `stu-csv-${Date.now()}-${idx}`,
      studentId: enrollmentNo,
      enrollmentNo,
      registrationNo: regNo,
      rollNo,
      studentName,
      gradeLevel,
      parentName: fatherName,
      fatherName,
      parentRelationship: 'Father',
      parentMobile: contact,
      parentEmail,
      address,
      tuitionDues,
      transportDues,
      lateFee,
      duesOwed: totalDues,
      dueMonths: monthsDue,
      lastPaymentRecord,
      ...(hasMonthlyCols
        ? {
            monthlyFeeBreakdown: {
              april: april ?? 0,
              may: may ?? 0,
              june: june ?? 0,
              july: july ?? 0,
              august: august ?? 0,
              september: september ?? 0,
              october: october ?? 0,
            },
          }
        : {}),
      expectedPaymentDate,
      duesDueDate: '2026-10-15',
      duesStatus: resolvedStatus,
      gpa: gpaNum ?? 3.5,
      attendanceRate: attendanceNum ?? 92,
      overallPercentage: percentageNum ?? 85,
      topSubject,
      areaToImprove,
      academicStanding: 'Good Standing',
      subjectGrades: [],
      teacherRemarks,
      paymentLink: `https://pay.schoolportal.in/due/${enrollmentNo}`,
      excelColumnOrder: [...columnOrder],
      excelRawColumns: rowObj,
      excelColumnRoles: { ...columnRoles },
    });
  });

  return {
    records,
    columnOrder,
    columnRoles,
    headerRowIndex,
    sheetName: firstSheetName,
  };
}

/**
 * Parse CSV or Excel file matching any school spreadsheet structure
 */
export function parseExcelFile(arrayBuffer: ArrayBuffer): StudentRecord[] {
  return parseExcelFileDetailed(arrayBuffer).records;
}

/**
 * Apply customized data header labels & column roles across all StudentRecord items
 * without altering any underlying student/fee values or PDF visual design.
 */
export function applyExcelColumnMappings(
  records: StudentRecord[],
  mappings: ExcelHeaderMapping[]
): StudentRecord[] {
  const newOrder = mappings.map((m) => m.displayHeader.trim() || m.originalHeader);
  const newRoles: Record<string, ExcelColumnRole> = {};
  mappings.forEach((m, idx) => {
    newRoles[newOrder[idx]] = m.role;
  });

  return records.map((s) => {
    const prevRaw = s.excelRawColumns || {};
    const nextRaw: Record<string, string> = {};
    mappings.forEach((m, idx) => {
      const targetHeader = newOrder[idx];
      nextRaw[targetHeader] = prevRaw[m.originalHeader] ?? '';
    });

    // Recompute duesOwed if total header changed or total role moved
    const totalHeader = newOrder.find((h) => newRoles[h] === 'total');
    let nextDuesOwed = s.duesOwed;
    if (totalHeader) {
      const parsedTotal = parseNumericCell(nextRaw[totalHeader]);
      if (parsedTotal !== undefined) nextDuesOwed = parsedTotal;
    }

    return {
      ...s,
      duesOwed: nextDuesOwed,
      duesStatus: nextDuesOwed <= 0 ? 'Paid' : s.duesStatus === 'Paid' ? 'Overdue' : s.duesStatus,
      excelColumnOrder: newOrder,
      excelRawColumns: nextRaw,
      excelColumnRoles: newRoles,
    };
  });
}
