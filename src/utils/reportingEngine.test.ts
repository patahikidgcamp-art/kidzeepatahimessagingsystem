import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  calculateReportSummary,
  parseExcelFileDetailed,
  applyExcelColumnMappings,
} from './reportingEngine';
import { getPdfMonthlyBreakdownEntries, renderPersonalizedMessage } from './templateEngine';
import { DEFAULT_PDF_CONFIG, generatePendingDuesPdfBlob } from './pdfDuesGenerator';
import { StudentRecord } from '../types';

const sampleStudents: StudentRecord[] = [
  {
    id: '1',
    studentId: '446',
    enrollmentNo: '446',
    rollNo: '11',
    studentName: 'Aayu Mehra',
    gradeLevel: 'Montessoris 2 A',
    parentName: 'Mr. Chandan Kumar',
    fatherName: 'Mr. Chandan Kumar',
    parentRelationship: 'Father',
    parentMobile: '9801278254',
    address: 'Vill- Marwan',
    gpa: 3.9,
    attendanceRate: 98,
    overallPercentage: 94,
    topSubject: 'Numbers',
    areaToImprove: 'Art',
    academicStanding: 'Exemplary',
    subjectGrades: [],
    teacherRemarks: 'Excellent effort',
    tuitionDues: 14851,
    transportDues: 8400,
    lateFee: 50,
    duesOwed: 23251,
    duesDueDate: '2026-10-15',
    duesStatus: 'Overdue',
  },
  {
    id: '2',
    studentId: '227',
    enrollmentNo: '227',
    rollNo: '1',
    studentName: 'Aliyan Fatma',
    gradeLevel: 'Montessoris 3 A',
    parentName: 'Shek Mohmad Raja',
    fatherName: 'Shek Mohmad Raja',
    parentRelationship: 'Father',
    parentMobile: '8084921433',
    address: 'PAKARI PAKOHI',
    gpa: 3.8,
    attendanceRate: 95,
    overallPercentage: 91,
    topSubject: 'English',
    areaToImprove: 'Drawing',
    academicStanding: 'Exemplary',
    subjectGrades: [],
    teacherRemarks: 'Disciplined',
    tuitionDues: 23850,
    transportDues: 5600,
    lateFee: 50,
    duesOwed: 29450,
    duesDueDate: '2026-09-19',
    duesStatus: 'Overdue',
  },
];

test('calculateReportSummary computes accurate totals and averages for Indian school data', () => {
  const summary = calculateReportSummary(sampleStudents);

  assert.equal(summary.totalStudents, 2);
  assert.equal(summary.totalDuesOwed, 52701);
  assert.equal(summary.totalTuitionDues, 38701);
  assert.equal(summary.totalTransportDues, 14000);
  assert.equal(summary.totalLateFee, 100);
  assert.equal(summary.studentsWithDuesCount, 2);
  assert.equal(summary.totalOverdueDues, 52701);
  assert.equal(summary.overdueStudentsCount, 2);
  assert.equal(summary.averageGpa, 3.85);
  assert.equal(summary.averageAttendance, 96.5);
});

test('calculateReportSummary handles empty records gracefully when cleared', () => {
  const summary = calculateReportSummary([]);

  assert.equal(summary.totalStudents, 0);
  assert.equal(summary.totalDuesOwed, 0);
  assert.equal(summary.totalTuitionDues, 0);
  assert.equal(summary.totalTransportDues, 0);
  assert.equal(summary.studentsWithDuesCount, 0);
  assert.equal(summary.averageGpa, 0);
  assert.equal(summary.averageAttendance, 0);
  assert.deepEqual(summary.classWiseSummary, {});
});

test('parseExcelFileDetailed captures ALL columns into full database and drives monthly & PDF generation', async () => {
  const aoa = [
    ['KIDZEE SCHOOL MARWAN - FEE REGISTER'], // Title banner row 1 (must be skipped automatically)
    [
      'Adm No',
      'Pupil Name',
      'Guardian Name',
      'Std',
      'WhatsApp No',
      'Bus Route',
      'Tuition Fee',
      'Computer Fee',
      'Exam Fee',
      'Nov',
      'Dec',
      'Jan',
      'Net Balance',
      'Status',
    ],
    [
      'KZ-901',
      'Aarav Singh',
      'Mr. Vikram Singh',
      'Std-III A',
      '9801278254',
      'Route-4 Karja',
      '4500',
      '800',
      '500',
      '1800',
      '2000',
      '2000',
      '5800',
      'Pending',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'FeeRegister');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  const parsed = parseExcelFileDetailed(buf);
  assert.equal(parsed.headerRowIndex, 1);
  assert.equal(parsed.columnOrder.length, 14);
  assert.equal(parsed.records.length, 1);

  const rec = parsed.records[0];
  assert.equal(rec.studentName, 'Aarav Singh');
  assert.equal(rec.fatherName, 'Mr. Vikram Singh');
  assert.equal(rec.enrollmentNo, 'KZ-901');
  assert.equal(rec.gradeLevel, 'Std-III A');
  assert.equal(rec.duesOwed, 5800);
  assert.equal(rec.duesStatus, 'Pending');
  assert.equal(rec.excelRawColumns?.['Bus Route'], 'Route-4 Karja');
  assert.equal(rec.excelRawColumns?.['Computer Fee'], '800');
  assert.equal(rec.excelColumnRoles?.['Bus Route'], 'student');
  assert.equal(rec.excelColumnRoles?.['Computer Fee'], 'fee');
  assert.equal(rec.excelColumnRoles?.['Nov'], 'monthly');
  assert.equal(rec.excelColumnRoles?.['Net Balance'], 'total');

  // Dynamic monthly dues from uploaded Excel sheet
  const months = getPdfMonthlyBreakdownEntries(rec);
  assert.deepEqual(
    months.map((m) => [m.fullLabel, m.amount]),
    [
      ['Nov', 1800],
      ['Dec', 2000],
      ['Jan', 2000],
    ]
  );

  // Dynamic Excel column token interpolation in Designer Templates
  const msg = renderPersonalizedMessage('Student: {StudentName}, Bus: {Bus Route}, Comp: {Computer Fee}', rec);
  assert.equal(msg, 'Student: Aarav Singh, Bus: Route-4 Karja, Comp: 800');

  // Rename only a data header cleanly
  const remapped = applyExcelColumnMappings(
    parsed.records,
    parsed.columnOrder.map((col) => ({
      originalHeader: col,
      displayHeader: col === 'Bus Route' ? 'Transport Route' : col,
      role: parsed.columnRoles[col],
    }))
  );
  assert.equal(remapped[0].excelRawColumns?.['Transport Route'], 'Route-4 Karja');

  // Generate PDF directly from uploaded Excel database record
  const pdfBlob = generatePendingDuesPdfBlob(remapped[0], DEFAULT_PDF_CONFIG);
  assert.ok(pdfBlob.size > 500);
});
