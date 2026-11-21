import React, { useState } from 'react';
import { StudentRecord, DispatchLog } from '../types';
import { calculateReportSummary, exportStudentsToExcel, exportDispatchLogsToExcel } from '../utils/reportingEngine';
import { formatCurrency, formatPhoneNumber } from '../utils/templateEngine';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Download,
  Users,
  Phone,
  CheckCircle2,
  Clock,
  Sparkles,
  FileSpreadsheet,
  Send,
  ShieldAlert,
  Search,
  Filter,
} from 'lucide-react';

interface ReportingDashboardProps {
  students: StudentRecord[];
  dispatchLogs: DispatchLog[];
  onTriggerDuesNotice: (student: StudentRecord) => void;
}

export const ReportingDashboard: React.FC<ReportingDashboardProps> = ({
  students,
  dispatchLogs,
  onTriggerDuesNotice,
}) => {
  const summary = calculateReportSummary(students);
  const [activeTab, setActiveTab] = useState<'dues_report' | 'dispatch_audit'>('dues_report');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'paid'>('all');

  const filteredStudents = students.filter((s) => {
    const q = searchFilter.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.studentName.toLowerCase().includes(q) ||
      s.parentName.toLowerCase().includes(q) ||
      s.parentMobile.includes(q) ||
      s.studentId.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'pending') return s.duesStatus === 'Pending' && s.duesOwed > 0;
    if (statusFilter === 'overdue') return s.duesStatus === 'Overdue' && s.duesOwed > 0;
    if (statusFilter === 'paid') return s.duesStatus === 'Paid' || s.duesOwed === 0;

    return true;
  });

  const totalLogs = dispatchLogs.length;
  const successfulDispatches = dispatchLogs.filter(
    (l) => l.status === 'Delivered' || l.status === 'Read'
  ).length;
  const successRate = totalLogs > 0 ? Math.round((successfulDispatches / totalLogs) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Automated Financial Dues & Performance Reporting System
            </h2>
            <p className="text-xs text-slate-500">
              Real-time analytics on student academic metrics, parent mobile numbers, and dues owed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportStudentsToExcel(students, 'Comprehensive_Student_Dues_Report.xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Dues Report (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => exportDispatchLogsToExcel(dispatchLogs, 'Messaging_Audit_Logs.xlsx')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Dispatch Logs</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Dues Owed */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Dues Outstanding</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(summary.totalDuesOwed)}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Tuition: {formatCurrency(summary.totalTuitionDues)}</span>
            <span className="font-semibold text-indigo-600">
              Transport: {formatCurrency(summary.totalTransportDues)}
            </span>
          </div>
        </div>

        {/* Collection & Status breakdown */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dues Status Breakdown</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold mt-1">
            <span className="text-emerald-600">{summary.duesByStatus.paid.count} Paid</span>
            <span className="text-slate-300">•</span>
            <span className="text-amber-600">{summary.duesByStatus.pending.count} Pending</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600">{summary.duesByStatus.overdue.count} Overdue</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full"
              style={{
                width: `${(summary.duesByStatus.paid.count / Math.max(summary.totalStudents, 1)) * 100}%`,
              }}
              title="Paid"
            />
            <div
              className="bg-amber-400 h-full"
              style={{
                width: `${(summary.duesByStatus.pending.count / Math.max(summary.totalStudents, 1)) * 100}%`,
              }}
              title="Pending"
            />
            <div
              className="bg-rose-500 h-full"
              style={{
                width: `${(summary.duesByStatus.overdue.count / Math.max(summary.totalStudents, 1)) * 100}%`,
              }}
              title="Overdue"
            />
          </div>
        </div>

        {/* Cohort Performance Average */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Cohort Academic Average</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {summary.averageGpa.toFixed(2)} GPA
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>Avg Attendance: {summary.averageAttendance}%</span>
            <span className="text-emerald-600 font-semibold">{summary.honorRollCount} Honors</span>
          </div>
        </div>

        {/* Messaging Gateway Health */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Delivery Success Rate</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {successRate}%
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>{totalLogs} total parent dispatches</span>
            <span className="text-slate-600">0 Carrier Bounces</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 pt-3 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('dues_report')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'dues_report'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Automated Student & Dues Report
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch_audit')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'dispatch_audit'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Transmission Audit Trail ({dispatchLogs.length})
            </button>
          </div>

          <div className="text-xs text-slate-400">
            Reporting Engine v2.4 • Live Data
          </div>
        </div>

        {activeTab === 'dues_report' && (
          <div className="p-4 space-y-4">
            {/* Filter and Search Bar inside Report */}
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter by student, mobile, or parent..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">Status:</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    statusFilter === 'overdue'
                      ? 'bg-rose-600 text-white font-semibold'
                      : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  Overdue ({summary.overdueStudentsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white font-semibold'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  Pending ({summary.duesByStatus.pending.count})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg font-medium ${
                    statusFilter === 'paid'
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-emerald-50 text-emerald-800'
                  }`}
                >
                  Paid ({summary.duesByStatus.paid.count})
                </button>
              </div>
            </div>

            {/* Comprehensive Report Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Class & Roll</th>
                    <th className="py-3 px-3">Student Name</th>
                    <th className="py-3 px-3">Father Name</th>
                    <th className="py-3 px-3">Parent Mobile Number</th>
                    <th className="py-3 px-3">Village / Address</th>
                    <th className="py-3 px-3">Total Dues (₹)</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3 text-right">Instant Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {students.length === 0 ? (
                          <div className="flex flex-col items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-slate-300 mb-1.5" />
                            <p className="text-xs font-semibold text-slate-700">No Student Records Found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              The student database is currently empty. Reload the official CSV from the Student Database tab.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <p className="text-xs font-medium text-slate-700">No students match current filter criteria</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Try selecting "All Dues Status" or clearing the search text.</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block">{s.gradeLevel}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Roll: {s.rollNo} • Enr: {s.enrollmentNo}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-bold text-blue-700">{s.studentName}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-700">
                        {s.fatherName || s.parentName}
                      </td>

                      {/* Explicitly displayed Mobile Number */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-medium text-slate-800 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{formatPhoneNumber(s.parentMobile)}</span>
                        </div>
                      </td>

                      {/* Village / Address */}
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {s.address}
                      </td>

                      {/* Explicitly displayed Dues Owed in Rupees */}
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-rose-600 text-sm">
                          {formatCurrency(s.duesOwed)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tu: {formatCurrency(s.tuitionDues ?? 0)} • Tr: {formatCurrency(s.transportDues ?? 0)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {s.expectedPaymentDate || s.duesDueDate}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {s.duesOwed > 0 ? (
                          <button
                            type="button"
                            onClick={() => onTriggerDuesNotice(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                          >
                            <Send className="w-3 h-3 text-amber-600" />
                            <span>Dispatch Notice</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Cleared
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'dispatch_audit' && (
          <div className="p-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Student & Parent</th>
                    <th className="py-3 px-3">Mobile Contact</th>
                    <th className="py-3 px-3">Channel</th>
                    <th className="py-3 px-3">Dues at Dispatch</th>
                    <th className="py-3 px-3">GPA & Attd</th>
                    <th className="py-3 px-3">Message Snippet</th>
                    <th className="py-3 px-3 text-right">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {dispatchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block font-sans">
                          {log.studentName}
                        </span>
                        <span className="text-slate-400 font-sans text-[10px]">
                          Parent: {log.parentName}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-800">
                        {formatPhoneNumber(log.parentMobile)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            log.channel === 'WhatsApp'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {formatCurrency(log.duesOwedAtDispatch)}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {log.gpaAtDispatch} / {log.attendanceAtDispatch}%
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-600 font-sans">
                        {log.messageText}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold uppercase ${
                            log.status === 'Read'
                              ? 'bg-cyan-100 text-cyan-800'
                              : log.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
