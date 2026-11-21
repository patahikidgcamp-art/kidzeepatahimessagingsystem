import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatPhoneNumber,
  isValidMobileNumber,
  renderPersonalizedMessage,
  getWhatsAppPhoneDigits,
  generateWhatsAppWebUrl,
  formatTextForWhatsApp,
  applyTemplateDesign,
  getStudentMonthlyBreakdown,
} from './templateEngine';
import { buildPendingDuesWhatsAppCaption } from './pdfDuesGenerator';
import { StudentRecord } from '../types';

const mockStudent: StudentRecord = {
  id: 'stu-1',
  studentId: '446',
  enrollmentNo: '446',
  registrationNo: 'REG-2026-446',
  rollNo: '11',
  studentName: 'Aayu Mehra',
  gradeLevel: 'Montessoris 2 A',
  parentName: 'Mr. Chandan Kumar',
  fatherName: 'Mr. Chandan Kumar',
  parentRelationship: 'Father',
  parentMobile: '9801278254',
  parentEmail: 'chandan@example.com',
  address: 'Vill- Marwan',
  gpa: 3.85,
  attendanceRate: 96,
  overallPercentage: 92,
  topSubject: 'Rhymes & Numbers',
  areaToImprove: 'Art & Craft',
  academicStanding: 'Exemplary',
  subjectGrades: [],
  teacherRemarks: 'Bright and interactive child.',
  tuitionDues: 14851,
  transportDues: 8400,
  lateFee: 50,
  duesOwed: 23251,
  dueMonths: '4,5,6',
  duesDueDate: '2026-10-15',
  expectedPaymentDate: '15/10/2026',
  duesStatus: 'Overdue',
  paymentLink: 'https://pay.schoolportal.in/due/446',
};

test('formatCurrency formats amounts properly with Rupee symbol', () => {
  assert.equal(formatCurrency(250), 'Rs. 250');
  assert.equal(formatCurrency(0), 'Rs. 0');
  assert.equal(formatCurrency(23251), 'Rs. 23,251');
  assert.equal(formatCurrency(100, '$'), '$100');
});

test('formatPhoneNumber formats 10-digit Indian phone strings nicely', () => {
  assert.equal(formatPhoneNumber('9801278254'), '+91 98012 78254');
  assert.equal(formatPhoneNumber('8873051708 6200770876'), '+91 88730 51708 / +91 62007 70876');
});

test('isValidMobileNumber validates minimum and maximum digits', () => {
  assert.equal(isValidMobileNumber('9801278254'), true);
  assert.equal(isValidMobileNumber('+91 98012 78254'), true);
  assert.equal(isValidMobileNumber('123'), false);
  assert.equal(isValidMobileNumber(''), false);
});

test('renderPersonalizedMessage interpolates student performance and dues variables', () => {
  const template = 'Dear {ParentName}, {StudentName} (Roll: {RollNo}, Class: {Grade}) has Total Dues: {TotalDues}. Tuition: {TuitionDues}, Transport: {TransportDues}.';
  const rendered = renderPersonalizedMessage(template, mockStudent);

  assert.ok(rendered.includes('Dear Mr. Chandan Kumar'));
  assert.ok(rendered.includes('Aayu Mehra (Roll: 11, Class: Montessoris 2 A)'));
  assert.ok(rendered.includes('Total Dues: Rs. 23,251'));
  assert.ok(rendered.includes('Tuition: Rs. 14,851'));
  assert.ok(rendered.includes('Transport: Rs. 8,400'));
});

test('renderPersonalizedMessage interpolates full Excel & class cohort tokens', () => {
  const secondClassmate: StudentRecord = { ...mockStudent, id: 'stu-2', duesOwed: 1000 };
  const template =
    'Reg:{RegistrationNo} Email:{ParentEmail} Status:{DuesStatus} Apr:{AprilDue} ClassCount:{ClassTotalStudents} ClassDues:{ClassTotalDues} Monthly:{MonthlyDuesSummary}';
  const rendered = renderPersonalizedMessage(template, mockStudent, {
    allStudents: [mockStudent, secondClassmate],
  });

  assert.ok(rendered.includes('Reg:REG-2026-446'));
  assert.ok(rendered.includes('Email:chandan@example.com'));
  assert.ok(rendered.includes('Status:Overdue'));
  assert.ok(rendered.includes('Apr:Rs. 7,751'));
  assert.ok(rendered.includes('ClassCount:2'));
  assert.ok(rendered.includes('ClassDues:Rs. 24,251'));
  assert.ok(rendered.includes('Apr: Rs. 7,751'));
});

test('renderPersonalizedMessage handles conditional dues and transport blocks', () => {
  const template = 'Hello {ParentName}. {{#if dues}}Notice: Outstanding balance of {TotalDues} due by {DueDate}.{{/if}} {{#if transport}}Includes transport bus fees: {TransportDues}.{{/if}}';
  
  const renderedWithDues = renderPersonalizedMessage(template, mockStudent);
  assert.ok(renderedWithDues.includes('Outstanding balance of Rs. 23,251'));
  assert.ok(renderedWithDues.includes('Includes transport bus fees: Rs. 8,400'));

  // Student with 0 dues
  const noDuesStudent: StudentRecord = { ...mockStudent, duesOwed: 0, transportDues: 0, duesStatus: 'Paid' };
  const renderedNoDues = renderPersonalizedMessage(template, noDuesStudent);
  assert.ok(!renderedNoDues.includes('Outstanding balance'));
  assert.ok(!renderedNoDues.includes('transport bus fees'));
});

test('renderPersonalizedMessage prioritizes individual custom message override', () => {
  const studentWithOverride: StudentRecord = {
    ...mockStudent,
    customMessageOverride: 'Custom note for Mr. Chandan: Aayu stood first in numbers quiz!',
  };
  const standardTemplate = 'Standard template: {StudentName} total dues is {TotalDues}';
  const rendered = renderPersonalizedMessage(standardTemplate, studentWithOverride);

  assert.equal(rendered, 'Custom note for Mr. Chandan: Aayu stood first in numbers quiz!');
});

test('getWhatsAppPhoneDigits formats numbers with 91 prefix for WhatsApp', () => {
  assert.equal(getWhatsAppPhoneDigits('9801278254'), '919801278254');
  assert.equal(getWhatsAppPhoneDigits('+91 98012 78254'), '919801278254');
  assert.equal(getWhatsAppPhoneDigits('8873051708 6200770876'), '918873051708');

  const url = generateWhatsAppWebUrl('9801278254', 'Hello Parent');
  assert.ok(url.startsWith('https://web.whatsapp.com/send?phone=919801278254&text=Hello%20Parent'));
});

test('formatTextForWhatsApp converts __underline__ and <u>underline</u> while preserving *bold* and _italic_', () => {
  const input = '*Notice:* _Urgent_ __Fee Due__ and <u>Pay Now</u>';
  const out = formatTextForWhatsApp(input);
  assert.ok(out.includes('*Notice:*'));
  assert.ok(out.includes('_Urgent_'));
  assert.ok(!out.includes('__Fee Due__'));
  assert.ok(!out.includes('<u>'));
  assert.ok(out.includes('\u0332'));
});

test('applyTemplateDesign adds designer header badge, border frame, and italic footer signature', () => {
  const styled = applyTemplateDesign('Fee reminder body', {
    theme: 'urgent-crimson',
    borderStyle: 'dues-alert-box',
    headerBadge: '***** PENDING DUES *****',
    footerSignature: 'Principal, Kidzee School',
  });
  assert.ok(styled.includes('***** PENDING DUES *****'));
  assert.ok(styled.includes('Fee reminder body'));
  assert.ok(styled.includes('_Principal, Kidzee School_'));
  assert.ok(styled.includes('┏'));
});

test('applyTemplateDesign wraps every line in an all-over box border when fullBorderBox is enabled', () => {
  const boxed = applyTemplateDesign('Line One\nLine Two', {
    theme: 'emerald-crest',
    borderStyle: 'full-box',
    fullBorderBox: true,
    headerBadge: 'KIDZEE NOTICE',
    footerSignature: 'Principal Office',
  });
  const lines = boxed.split('\n');
  assert.ok(lines[0].startsWith('┏'));
  assert.ok(lines.some((l) => l === '┃ Line One'));
  assert.ok(lines.some((l) => l === '┃ Line Two'));
  assert.ok(lines[lines.length - 1].startsWith('┗'));
});

test('getStudentMonthlyBreakdown returns April-October dues summing to duesOwed', () => {
  const entries = getStudentMonthlyBreakdown(mockStudent);
  assert.equal(entries.length, 7);
  const sum = entries.reduce((acc, e) => acc + e.amount, 0);
  assert.equal(sum, mockStudent.duesOwed);
  assert.equal(entries[6].amount, 0); // October not in dueMonths '4,5,6'
});

test('buildPendingDuesWhatsAppCaption outputs strictly Student Name, Class, and Pending Dues with no URLs or extra text', () => {
  const caption = buildPendingDuesWhatsAppCaption(mockStudent);
  assert.equal(
    caption,
    "Student's Name : Aayu Mehra\nClass : Montessoris 2 A\nPending Dues : Rs. 23,251"
  );
  assert.ok(!caption.includes('http'));
});

