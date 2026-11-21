import { jsPDF } from 'jspdf';
import {
  PdfCustomizationConfig,
  PdfTemplateItem,
  PdfThemePresetId,
  StudentRecord,
} from '../types';
import {
  formatCurrency,
  formatPhoneNumber,
  getPdfMonthlyBreakdownEntries,
} from './templateEngine';
import { authFetch } from './authClient';

export interface PdfThemePreset {
  id: PdfThemePresetId;
  name: string;
  primaryColor: string;
  accentColor: string;
  surfaceTint: string;
}

export const PDF_THEME_PRESETS: PdfThemePreset[] = [
  {
    id: 'emerald-gold',
    name: 'Emerald & Royal Gold',
    primaryColor: '#047857',
    accentColor: '#d97706',
    surfaceTint: '#ecfdf5',
  },
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire & Amber',
    primaryColor: '#1d4ed8',
    accentColor: '#f59e0b',
    surfaceTint: '#eff6ff',
  },
  {
    id: 'crimson-urgent',
    name: 'Crimson Urgent Alert',
    primaryColor: '#be123c',
    accentColor: '#ea580c',
    surfaceTint: '#fff1f2',
  },
  {
    id: 'teal-coral',
    name: 'Deep Teal & Coral',
    primaryColor: '#0f766e',
    accentColor: '#e11d48',
    surfaceTint: '#f0fdfa',
  },
  {
    id: 'maroon-heritage',
    name: 'Maroon Academic Crest',
    primaryColor: '#881337',
    accentColor: '#ca8a04',
    surfaceTint: '#fdf2f8',
  },
];

export const DEFAULT_PDF_CONFIG: PdfCustomizationConfig = {
  schoolName: 'KIDZEE SCHOOL',
  schoolTagline: 'Excellence in Early Childhood & Primary Education',
  schoolAddress: 'Marwan, Muzaffarpur, Bihar - 843113',
  schoolPhone: '+91 98012 78254',
  signatoryTitle: 'Accounts & Principal Office',
  badgeTitle: '***** PENDING DUES NOTICE *****',
  themeId: 'emerald-gold',
  primaryColor: '#047857',
  accentColor: '#d97706',
  surfaceTint: '#ecfdf5',
  headerStyle: 'royal-banner',
  logoDataUrl: undefined,
  showWatermark: true,
  watermarkText: 'PENDING DUES',
  showMonthlyBreakdown: true,
  showPaymentBox: true,
  upiId: 'kidzeeschool@sbi',
  customFooterNote:
    'Kindly clear the pending dues before the due date to avoid late fine and ensure uninterrupted school & transport services.',
  includeSignedPdfLinkInWhatsapp: false,
};

export const DEFAULT_PDF_TEMPLATES: PdfTemplateItem[] = [
  {
    ...DEFAULT_PDF_CONFIG,
    id: 'pdf-tpl-emerald-standard',
    name: 'Royal Emerald Standard',
    description: 'Official school dues statement with emerald banner and monthly fee ledger',
  },
  {
    ...DEFAULT_PDF_CONFIG,
    id: 'pdf-tpl-crimson-urgent',
    name: 'Overdue Urgent Crimson',
    description: 'High-contrast crimson alert statement for overdue school accounts',
    badgeTitle: '***** URGENT PENDING DUES *****',
    themeId: 'crimson-urgent',
    primaryColor: '#be123c',
    accentColor: '#ea580c',
    surfaceTint: '#fff1f2',
    headerStyle: 'ribbon-split',
    watermarkText: 'URGENT DUES',
  },
  {
    ...DEFAULT_PDF_CONFIG,
    id: 'pdf-tpl-sapphire-statement',
    name: 'Sapphire Detailed Statement',
    description: 'Clean sapphire bordered crest statement with full month-by-month breakdown',
    badgeTitle: 'MONTHLY FEE & DUES LEDGER',
    themeId: 'royal-sapphire',
    primaryColor: '#1d4ed8',
    accentColor: '#f59e0b',
    surfaceTint: '#eff6ff',
    headerStyle: 'bordered-crest',
    watermarkText: 'FEE STATEMENT',
  },
];

function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned;
  const num = parseInt(full, 16);
  if (isNaN(num)) return [4, 120, 87];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixWithWhite(rgb: [number, number, number], whiteRatio: number): [number, number, number] {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * whiteRatio),
    Math.round(rgb[1] + (255 - rgb[1]) * whiteRatio),
    Math.round(rgb[2] + (255 - rgb[2]) * whiteRatio),
  ];
}

function safePdfText(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val).replace(/₹/g, 'Rs. ').replace(/[^\x20-\x7E\n]/g, ' ').trim();
}

function parsePdfNumber(val: string | undefined): number | undefined {
  if (!val) return undefined;
  const cleaned = val.replace(/rs\.?|inr|₹|,|\s+/gi, '');
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;
  const n = Number(cleaned);
  return isNaN(n) ? undefined : n;
}

function drawPageBorders(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  primaryRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  doc.setDrawColor(...primaryRgb);
  doc.setLineWidth(1.1);
  doc.rect(6, 6, pageWidth - 12, pageHeight - 12);
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.45);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
}

function drawFallbackCrest(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  primaryRgb: [number, number, number],
  accentRgb: [number, number, number]
) {
  doc.setFillColor(255, 255, 255);
  doc.circle(x + size / 2, y + size / 2, size / 2, 'F');
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.9);
  doc.circle(x + size / 2, y + size / 2, size / 2 - 1, 'S');
  doc.setFillColor(...primaryRgb);
  doc.circle(x + size / 2, y + size / 2, size / 2 - 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('KS', x + size / 2, y + size / 2 + 2.2, { align: 'center' });
}

function renderStudentPageIntoDoc(
  doc: jsPDF,
  student: StudentRecord,
  config: PdfCustomizationConfig
): void {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const primaryRgb = hexToRgb(config.primaryColor || '#047857');
  const accentRgb = hexToRgb(config.accentColor || '#d97706');
  const tintRgb = config.surfaceTint
    ? hexToRgb(config.surfaceTint)
    : mixWithWhite(primaryRgb, 0.9);
  const softAccentRgb = mixWithWhite(accentRgb, 0.86);

  // Page outer decorative borders
  drawPageBorders(doc, pageWidth, pageHeight, primaryRgb, accentRgb);

  // Subtle diagonal Watermark
  if (config.showWatermark && config.watermarkText.trim()) {
    const wmRgb = mixWithWhite(primaryRgb, 0.9);
    doc.setTextColor(...wmRgb);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(42);
    doc.text(safePdfText(config.watermarkText).toUpperCase(), pageWidth / 2, pageHeight / 2 + 15, {
      align: 'center',
      angle: 35,
    });
  }

  // Header Section
  let cursorY = 10;
  if (config.headerStyle === 'royal-banner') {
    doc.setFillColor(...primaryRgb);
    doc.roundedRect(margin, cursorY, contentWidth, 38, 3, 3, 'F');
    doc.setFillColor(...accentRgb);
    doc.rect(margin, cursorY + 35, contentWidth, 3, 'F');
  } else if (config.headerStyle === 'ribbon-split') {
    doc.setFillColor(...primaryRgb);
    doc.roundedRect(margin, cursorY, contentWidth, 34, 3, 3, 'F');
    doc.setFillColor(...accentRgb);
    doc.roundedRect(margin, cursorY + 32, contentWidth, 6, 1.5, 1.5, 'F');
  } else {
    doc.setFillColor(...tintRgb);
    doc.roundedRect(margin, cursorY, contentWidth, 38, 3, 3, 'F');
    doc.setDrawColor(...primaryRgb);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, cursorY, contentWidth, 38, 3, 3, 'S');
  }

  const isLightHeader = config.headerStyle === 'bordered-crest';
  const logoSize = 24;
  const logoX = margin + 6;
  const logoY = cursorY + 6.5;

  if (config.logoDataUrl) {
    try {
      const format = config.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX - 1, logoY - 1, logoSize + 2, logoSize + 2, 2, 2, 'F');
      doc.addImage(config.logoDataUrl, format, logoX, logoY, logoSize, logoSize);
    } catch {
      drawFallbackCrest(doc, logoX, logoY, logoSize, primaryRgb, accentRgb);
    }
  } else {
    drawFallbackCrest(doc, logoX, logoY, logoSize, primaryRgb, accentRgb);
  }

  const headerTextX = logoX + logoSize + 8;
  doc.setTextColor(...(isLightHeader ? primaryRgb : ([255, 255, 255] as [number, number, number])));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(safePdfText(config.schoolName || 'KIDZEE SCHOOL'), headerTextX, cursorY + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(
    ...(isLightHeader ? ([71, 85, 105] as [number, number, number]) : ([241, 245, 249] as [number, number, number]))
  );
  doc.text(safePdfText(config.schoolTagline), headerTextX, cursorY + 19.5);

  doc.setFontSize(8.5);
  doc.text(
    `${safePdfText(config.schoolAddress)}  |  Helpline: ${safePdfText(config.schoolPhone)}`,
    headerTextX,
    cursorY + 26.5
  );

  // Date & Ref Pill on right
  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const refNo = `REF-${safePdfText(student.enrollmentNo || student.studentId)}`;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth - margin - 42, cursorY + 6, 38, 17, 2, 2, 'F');
  doc.setTextColor(...primaryRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(refNo, pageWidth - margin - 23, cursorY + 12.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${todayStr}`, pageWidth - margin - 23, cursorY + 18.5, { align: 'center' });

  cursorY += 44;

  // Title Banner: ***** PENDING DUES NOTICE *****
  doc.setFillColor(...softAccentRgb);
  doc.setDrawColor(...accentRgb);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, cursorY, contentWidth, 11, 2, 2, 'FD');

  doc.setTextColor(...accentRgb);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(
    safePdfText(config.badgeTitle || '***** PENDING DUES NOTICE *****'),
    pageWidth / 2,
    cursorY + 7.2,
    { align: 'center' }
  );

  cursorY += 16;

  // Build Student & Fee fields dynamically from uploaded Excel database when present
  const hasExcelDb =
    Boolean(student.excelColumnOrder?.length) &&
    Boolean(student.excelRawColumns) &&
    Boolean(student.excelColumnRoles);

  const studentFields: Array<{ label: string; value: string }> = [];
  if (hasExcelDb && student.excelColumnOrder && student.excelRawColumns && student.excelColumnRoles) {
    for (const col of student.excelColumnOrder) {
      if (student.excelColumnRoles[col] === 'student') {
        // Skip empty trailing serial number if blank
        const val = student.excelRawColumns[col] ?? '';
        if (col.trim().toLowerCase() === 's.no' && !val) continue;
        studentFields.push({
          label: `${col}:`,
          value: val || '--',
        });
      }
    }
  }

  // Fallback to default 8 student fields for built-in records or empty student cols
  if (studentFields.length === 0) {
    studentFields.push(
      { label: 'Student Name:', value: student.studentName },
      { label: 'Class / Grade:', value: student.gradeLevel },
      { label: "Father's Name:", value: student.fatherName || student.parentName },
      {
        label: 'Roll / Enr No:',
        value: `Roll ${student.rollNo || '1'} / Enr ${student.enrollmentNo || student.studentId}`,
      },
      { label: 'Mobile No:', value: formatPhoneNumber(student.parentMobile) },
      { label: 'Due Date:', value: student.expectedPaymentDate || student.duesDueDate || 'Immediate' },
      { label: 'Address:', value: student.address || 'Muzaffarpur' },
      { label: 'Due Months:', value: student.dueMonths || 'Apr - Oct' }
    );
  }

  // Student & Parent Details Card (auto-sized cleanly to match number of uploaded student headers)
  const visibleStudentFields = studentFields.slice(0, 14);
  const studentRowsCount = Math.max(1, Math.ceil(visibleStudentFields.length / 2));
  const detailStepY = studentRowsCount > 5 ? 5.6 : 6.4;
  const studentCardHeight = 11 + studentRowsCount * detailStepY + 3.5;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, cursorY, contentWidth, studentCardHeight, 2.5, 2.5, 'FD');

  // Card header bar
  doc.setFillColor(...primaryRgb);
  doc.roundedRect(margin, cursorY, contentWidth, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('STUDENT & GUARDIAN DETAILS', margin + 4, cursorY + 5.5);

  const statusText = (student.duesStatus || 'Overdue').toUpperCase();
  const statusColor: [number, number, number] =
    student.duesOwed <= 0
      ? [22, 163, 74]
      : student.duesStatus === 'Overdue'
      ? [225, 29, 72]
      : [217, 119, 6];
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageWidth - margin - 34, cursorY + 1.3, 31, 5.4, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text(`STATUS: ${statusText}`, pageWidth - margin - 18.5, cursorY + 5.1, { align: 'center' });

  const col1X = margin + 4;
  const col2X = margin + contentWidth / 2 + 2;
  const drawField = (label: string, value: string, x: number, y: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(100, 116, 139);
    const cleanLabel = safePdfText(label).slice(0, 18);
    doc.text(cleanLabel, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(safePdfText(value).slice(0, 29), x + 30, y);
  };

  for (let i = 0; i < visibleStudentFields.length; i++) {
    const rowIdx = Math.floor(i / 2);
    const isRightCol = i % 2 === 1;
    const xPos = isRightCol ? col2X : col1X;
    const yPos = cursorY + 14 + rowIdx * detailStepY;
    drawField(visibleStudentFields[i].label, visibleStudentFields[i].value, xPos, yPos);
  }

  cursorY += studentCardHeight + 5;

  // Build Fee Rows dynamically from uploaded Excel database when present
  interface PdfFeeRow {
    head: string;
    detail: string;
    amount: string;
  }

  const feeRows: PdfFeeRow[] = [];
  if (hasExcelDb && student.excelColumnOrder && student.excelRawColumns && student.excelColumnRoles) {
    for (const col of student.excelColumnOrder) {
      if (student.excelColumnRoles[col] === 'fee') {
        const rawVal = student.excelRawColumns[col] ?? '';
        const numVal = parsePdfNumber(rawVal);
        if (numVal !== undefined) {
          feeRows.push({
            head: col,
            detail: numVal > 0 ? `Excel Ledger (${col})` : 'Nil / Clear',
            amount: formatCurrency(numVal, 'Rs. '),
          });
        } else {
          feeRows.push({
            head: col,
            detail: rawVal || '--',
            amount: '--',
          });
        }
      }
    }
  }

  // Fallback to default 4 fee rows when built-in data or no explicit fee cols
  if (feeRows.length === 0) {
    feeRows.push(
      {
        head: 'Tuition Fee Dues',
        detail: `Academic Months (${student.dueMonths || 'Current Term'})`,
        amount: formatCurrency(student.tuitionDues ?? 0, 'Rs. '),
      },
      {
        head: 'Transport / Bus Dues',
        detail: (student.transportDues ?? 0) > 0 ? 'School Van / Bus Facility' : 'Not Availed / Nil',
        amount: formatCurrency(student.transportDues ?? 0, 'Rs. '),
      },
      {
        head: 'Late Fee / Fine',
        detail: (student.lateFee ?? 0) > 0 ? 'Delayed payment surcharge' : 'No late fine applied',
        amount: formatCurrency(student.lateFee ?? 0, 'Rs. '),
      },
      {
        head: 'Last Payment Record',
        detail: student.lastPaymentRecord || 'No prior receipt recorded in period',
        amount: '--',
      }
    );
  }

  // Compute monthly entries & reserved bottom height so everything fits cleanly without clipping
  const monthlyEntries = config.showMonthlyBreakdown ? getPdfMonthlyBreakdownEntries(student) : [];
  const monthlyRowsCount = monthlyEntries.length > 7 ? 2 : monthlyEntries.length > 0 ? 1 : 0;
  const monthlySectionHeight =
    monthlyRowsCount > 0 ? 8 + monthlyRowsCount * (monthlyRowsCount === 2 ? 15.5 : 18) + 5 : 0;
  const paymentBoxHeight = config.showPaymentBox ? 27 : 0;
  const footerNoteHeight = config.customFooterNote ? 17 : 0;
  const signatoryReserved = 23;
  const bottomReservedTotal =
    monthlySectionHeight + paymentBoxHeight + footerNoteHeight + signatoryReserved;

  const drawFeeTableHeader = (y: number) => {
    doc.setFillColor(...primaryRgb);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('FEE PARTICULAR / HEAD', margin + 5, y + 6);
    doc.text('DETAILS / REMARKS', margin + 82, y + 6);
    doc.text('AMOUNT (INR)', pageWidth - margin - 5, y + 6, { align: 'right' });
    return y + 9;
  };

  cursorY = drawFeeTableHeader(cursorY);

  const availableForFeeRows = pageHeight - bottomReservedTotal - cursorY - 16;
  const idealRowH = feeRows.length <= 5 ? 9.2 : Math.max(6.8, Math.min(8.8, availableForFeeRows / feeRows.length));

  feeRows.forEach((row, idx) => {
    if (cursorY + idealRowH > pageHeight - 25) {
      doc.addPage();
      drawPageBorders(doc, pageWidth, pageHeight, primaryRgb, accentRgb);
      cursorY = drawFeeTableHeader(14);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(...tintRgb);
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, cursorY, contentWidth, idealRowH, 'FD');

    const textY = cursorY + idealRowH * 0.66;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(idealRowH < 7.8 ? 8.2 : 9);
    doc.setTextColor(30, 41, 59);
    doc.text(safePdfText(row.head).slice(0, 32), margin + 5, textY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(idealRowH < 7.8 ? 7.8 : 8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(safePdfText(row.detail).slice(0, 46), margin + 82, textY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(idealRowH < 7.8 ? 8.5 : 9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(safePdfText(row.amount), pageWidth - margin - 5, textY, { align: 'right' });

    cursorY += idealRowH;
  });

  // Grand Total Row using Total column header if present in Excel
  const excelTotalHeader =
    hasExcelDb && student.excelColumnOrder && student.excelColumnRoles
      ? student.excelColumnOrder.find((col) => student.excelColumnRoles![col] === 'total')
      : undefined;
  const totalLabel = excelTotalHeader
    ? `${safePdfText(excelTotalHeader).toUpperCase()} PAYABLE`
    : 'TOTAL PENDING DUES PAYABLE';

  if (cursorY + 14 > pageHeight - bottomReservedTotal + 8) {
    // Only add page if genuinely near bottom edge
    if (cursorY + bottomReservedTotal > pageHeight - 10) {
      doc.addPage();
      drawPageBorders(doc, pageWidth, pageHeight, primaryRgb, accentRgb);
      cursorY = 14;
    }
  }

  doc.setFillColor(...accentRgb);
  doc.roundedRect(margin, cursorY + 1, contentWidth, 11.5, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(totalLabel.slice(0, 42), margin + 5, cursorY + 8);
  doc.setFontSize(13);
  doc.text(
    safePdfText(formatCurrency(student.duesOwed, 'Rs. ')),
    pageWidth - margin - 5,
    cursorY + 8.3,
    { align: 'right' }
  );

  cursorY += 16;

  // Month-by-Month Dues Breakdown Ledger
  if (config.showMonthlyBreakdown && monthlyEntries.length > 0) {
    const firstMonthLabel = monthlyEntries[0]?.fullLabel?.toUpperCase() || 'APRIL';
    const lastMonthLabel = monthlyEntries[monthlyEntries.length - 1]?.fullLabel?.toUpperCase() || 'OCTOBER';

    doc.setFillColor(...primaryRgb);
    doc.roundedRect(margin, cursorY, contentWidth, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(
      `MONTH-BY-MONTH PENDING DUES (${firstMonthLabel} - ${lastMonthLabel})`,
      margin + 4,
      cursorY + 4.8
    );
    doc.setFontSize(7.5);
    doc.text(
      safePdfText(`Due Months: ${student.dueMonths || `${firstMonthLabel} - ${lastMonthLabel}`}`).slice(0, 34),
      pageWidth - margin - 4,
      cursorY + 4.8,
      { align: 'right' }
    );
    cursorY += 8;

    // Split into 1 row (up to 7 cols) or 2 rows (6 cols per row for 8-12 months)
    const rowsOfMonths =
      monthlyEntries.length > 7
        ? [monthlyEntries.slice(0, 6), monthlyEntries.slice(6, 12)]
        : [monthlyEntries];
    const cellH = rowsOfMonths.length > 1 ? 15.5 : 18;

    rowsOfMonths.forEach((monthSlice) => {
      const cellW = contentWidth / monthSlice.length;
      monthSlice.forEach((entry, i) => {
        const cx = margin + i * cellW;
        const isZero = entry.amount <= 0;

        doc.setFillColor(...(isZero ? ([248, 250, 252] as [number, number, number]) : tintRgb));
        doc.setDrawColor(...primaryRgb);
        doc.setLineWidth(0.25);
        doc.rect(cx, cursorY, cellW, cellH, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(rowsOfMonths.length > 1 ? 7.5 : 8);
        doc.setTextColor(...primaryRgb);
        doc.text(safePdfText(entry.fullLabel).slice(0, 10), cx + cellW / 2, cursorY + 4.5, {
          align: 'center',
        });

        const badgeColor: [number, number, number] = isZero
          ? [22, 163, 74]
          : entry.status === 'Overdue'
          ? [225, 29, 72]
          : [217, 119, 6];
        doc.setFillColor(...badgeColor);
        doc.roundedRect(cx + 3.5, cursorY + 5.8, Math.max(8, cellW - 7), 3.8, 1, 1, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text(isZero ? 'PAID' : entry.status.toUpperCase(), cx + cellW / 2, cursorY + 8.5, {
          align: 'center',
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(rowsOfMonths.length > 1 ? 8 : 8.5);
        doc.setTextColor(isZero ? 100 : 15, isZero ? 116 : 23, isZero ? 139 : 42);
        doc.text(`Rs. ${entry.amount.toLocaleString('en-IN')}`, cx + cellW / 2, cursorY + cellH - 2.5, {
          align: 'center',
        });
      });
      cursorY += cellH;
    });

    cursorY += 4.5;
  }

  // Optional Payment & UPI Box
  if (config.showPaymentBox) {
    doc.setFillColor(...tintRgb);
    doc.setDrawColor(...primaryRgb);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, cursorY, contentWidth, 23, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...primaryRgb);
    doc.text('PAYMENT OPTIONS & ONLINE SETTLEMENT', margin + 5, cursorY + 5.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `1. Pay at School Fee Counter (Monday - Saturday, 08:30 AM to 02:00 PM)`,
      margin + 5,
      cursorY + 11
    );
    doc.text(
      `2. UPI ID: ${safePdfText(config.upiId || 'kidzeeschool@sbi')}   |   Helpline: ${safePdfText(config.schoolPhone)}`,
      margin + 5,
      cursorY + 16
    );
    const payUrl =
      student.paymentLink ||
      `https://pay.schoolportal.in/due/${student.enrollmentNo || student.studentId}`;
    doc.setTextColor(...primaryRgb);
    doc.text(`3. Online Portal: ${safePdfText(payUrl)}`, margin + 5, cursorY + 20.8);

    cursorY += 26.5;
  }

  // Footer Custom Note & Signatory
  if (config.customFooterNote) {
    doc.setFillColor(...softAccentRgb);
    doc.roundedRect(margin, cursorY, contentWidth, 13.5, 2, 2, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const wrappedNote = doc.splitTextToSize(
      safePdfText(config.customFooterNote),
      contentWidth - 10
    );
    doc.text(wrappedNote, margin + 5, cursorY + 5);
    cursorY += 16.5;
  }

  // Authorized Signatory Area anchored cleanly near bottom
  const sigY = Math.max(cursorY + 4, pageHeight - 29);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(pageWidth - margin - 62, sigY, pageWidth - margin - 4, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryRgb);
  doc.text(
    safePdfText(config.signatoryTitle || 'Principal / Accounts Office'),
    pageWidth - margin - 33,
    sigY + 5.5,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(safePdfText(config.schoolName), pageWidth - margin - 33, sigY + 10.5, {
    align: 'center',
  });

  // Left footer timestamp
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by ${safePdfText(config.schoolName)} Automated Fee Suite  •  Ref: ${refNo}`,
    margin,
    sigY + 10.5
  );
}

export function generatePendingDuesPdfDoc(
  student: StudentRecord,
  config: PdfCustomizationConfig
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  renderStudentPageIntoDoc(doc, student, config);
  return doc;
}

export function downloadCombinedPendingDuesPdf(
  students: StudentRecord[],
  config: PdfCustomizationConfig,
  fileName = 'All_Pending_Dues_Statements.pdf'
): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  students.forEach((student, idx) => {
    if (idx > 0) doc.addPage();
    renderStudentPageIntoDoc(doc, student, config);
  });

  doc.save(fileName);
  return fileName;
}

export function getPendingDuesPdfFileName(student: StudentRecord): string {
  const safeName = student.studentName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const safeEnr = (student.enrollmentNo || student.studentId || '001').replace(/[^a-zA-Z0-9]+/g, '');
  return `Pending_Dues_${safeName}_${safeEnr}.pdf`;
}

export function generatePendingDuesPdfBlob(
  student: StudentRecord,
  config: PdfCustomizationConfig
): Blob {
  const doc = generatePendingDuesPdfDoc(student, config);
  return doc.output('blob');
}

export function generatePendingDuesPdfFile(
  student: StudentRecord,
  config: PdfCustomizationConfig
): File {
  const blob = generatePendingDuesPdfBlob(student, config);
  return new File([blob], getPendingDuesPdfFileName(student), { type: 'application/pdf' });
}

export function generatePendingDuesPdfBase64(
  student: StudentRecord,
  config: PdfCustomizationConfig
): string {
  const doc = generatePendingDuesPdfDoc(student, config);
  return doc.output('datauristring');
}

export function downloadPendingDuesPdf(
  student: StudentRecord,
  config: PdfCustomizationConfig
): string {
  const doc = generatePendingDuesPdfDoc(student, config);
  const fileName = getPendingDuesPdfFileName(student);
  doc.save(fileName);
  return fileName;
}

/**
 * Uploads the generated PDF to the authenticated local server and returns an HMAC-signed
 * URL that parents can open/download directly from their WhatsApp message.
 */
export async function uploadPendingDuesPdfForLink(
  student: StudentRecord,
  config: PdfCustomizationConfig
): Promise<string | null> {
  try {
    const base64Pdf = generatePendingDuesPdfBase64(student, config);
    const fileName = getPendingDuesPdfFileName(student);
    const res = await authFetch('/api/pdf/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        base64Pdf,
        studentId: student.enrollmentNo || student.studentId,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && data.relativeUrl) {
      return `${window.location.origin}${data.relativeUrl}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Strictly formats the WhatsApp caption sent alongside the Pending Dues PDF file:
 * ONLY Student's Name, Class, and Pending Dues (no PDF link or extra text).
 */
export function buildPendingDuesWhatsAppCaption(
  student: StudentRecord,
  _config?: PdfCustomizationConfig,
  _signedPdfUrl?: string | null
): string {
  return [
    `Student's Name : ${student.studentName}`,
    `Class : ${student.gradeLevel}`,
    `Pending Dues : ${formatCurrency(student.duesOwed)}`,
  ].join('\n');
}
