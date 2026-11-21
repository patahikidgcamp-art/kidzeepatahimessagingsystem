import React, { useState } from 'react';
import { ScheduledJob, MessageTemplate, StudentRecord } from '../types';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Sparkles,
  Users,
  Repeat,
  Zap,
  ArrowRight,
} from 'lucide-react';

interface SchedulerViewProps {
  scheduledJobs: ScheduledJob[];
  templates: MessageTemplate[];
  students: StudentRecord[];
  onUpdateJobs: (jobs: ScheduledJob[]) => void;
  onRunJobNow: (job: ScheduledJob) => void;
}

export const SchedulerView: React.FC<SchedulerViewProps> = ({
  scheduledJobs,
  templates,
  students,
  onUpdateJobs,
  onRunJobNow,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newJob, setNewJob] = useState<Partial<ScheduledJob>>({
    name: 'Weekly Attendance & Fee Follow-up',
    templateId: templates[0]?.id || '',
    targetCohort: 'Students with Dues Owed',
    triggerType: 'Recurring Monthly',
    recurrenceDay: '1st of month',
    scheduledTime: '09:00',
    scheduledDate: '2026-11-01',
    channel: 'SMS',
    status: 'Active',
  });

  const getRecipientCountForCohort = (cohort: string) => {
    switch (cohort) {
      case 'Students with Dues Owed':
        return students.filter((s) => s.duesOwed > 0).length;
      case 'Low Attendance (<85%)':
        return students.filter((s) => s.attendanceRate < 85).length;
      case 'Academic Warning':
        return students.filter((s) => s.gpa < 2.5 || s.academicStanding === 'Academic Warning').length;
      case 'Grade 10 Only':
        return students.filter((s) => s.gradeLevel.includes('10')).length;
      default:
        return students.length;
    }
  };

  const handleToggleJobStatus = (id: string) => {
    onUpdateJobs(
      scheduledJobs.map((j) => {
        if (j.id === id) {
          const nextStatus = j.status === 'Active' ? 'Paused' : 'Active';
          return { ...j, status: nextStatus };
        }
        return j;
      })
    );
  };

  const handleDeleteJob = (id: string) => {
    onUpdateJobs(scheduledJobs.filter((j) => j.id !== id));
  };

  const handleCreateJob = () => {
    if (!newJob.name || !newJob.templateId) return;
    const selectedTemplate = templates.find((t) => t.id === newJob.templateId);
    const count = getRecipientCountForCohort(newJob.targetCohort || 'All Students');

    const created: ScheduledJob = {
      id: `job-${Date.now()}`,
      name: newJob.name,
      templateId: newJob.templateId,
      templateName: selectedTemplate?.name || 'Custom Template',
      targetCohort: (newJob.targetCohort as any) || 'All Students',
      triggerType: (newJob.triggerType as any) || 'Recurring Monthly',
      scheduledDate: newJob.scheduledDate,
      scheduledTime: newJob.scheduledTime || '09:00',
      recurrenceDay: newJob.recurrenceDay || '1st of month',
      channel: (newJob.channel as any) || selectedTemplate?.channel || 'SMS',
      status: 'Active',
      nextRun:
        newJob.triggerType === 'Recurring Monthly'
          ? 'Nov 1, 2026 at 09:00 AM'
          : newJob.triggerType === 'Recurring Weekly'
          ? 'Next Monday at 08:30 AM'
          : `${newJob.scheduledDate} at ${newJob.scheduledTime}`,
      totalRecipients: count,
    };

    onUpdateJobs([...scheduledJobs, created]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Automated Scheduling Engine
            </h2>
            <p className="text-xs text-slate-500">
              Configure hands-off recurring dispatches, term report dates, and dues payment alerts
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create Schedule Rule</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Active Automations</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {scheduledJobs.filter((j) => j.status === 'Active').length}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready to trigger on schedule</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Dues Autopilot Jobs</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {
              scheduledJobs.filter(
                (j) =>
                  j.targetCohort === 'Students with Dues Owed' ||
                  j.name.toLowerCase().includes('due') ||
                  j.name.toLowerCase().includes('fee')
              ).length
            }
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Targeting outstanding balances
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Next Scheduled Run</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {scheduledJobs.find((j) => j.status === 'Active')?.nextRun || 'None pending'}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1 mt-1">
            <Bell className="w-3 h-3" />
            <span>Automated Cron daemon</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500">Total Enrolled Recipients</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Across active Excel cohorts
          </div>
        </div>
      </div>

      {/* Scheduled Jobs Table / Cards */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            Scheduled Automation Rules & Queues
          </h3>
          <span className="text-xs text-slate-500">
            {scheduledJobs.length} scheduled jobs
          </span>
        </div>

        <div className="space-y-3">
          {scheduledJobs.map((job) => {
            const recipientCount = getRecipientCountForCohort(job.targetCohort);
            const isDuesJob =
              job.targetCohort === 'Students with Dues Owed' ||
              job.name.toLowerCase().includes('due');

            return (
              <div
                key={job.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all bg-slate-50/50 hover:bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left details */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">
                      {job.name}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        job.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {job.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                        job.channel === 'WhatsApp'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {job.channel}
                    </span>
                    {isDuesJob && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        💳 Financial Notice
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-4">
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-slate-700">Template:</span>{' '}
                      {job.templateName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">Cohort:</span>{' '}
                      {job.targetCohort} ({recipientCount} parents)
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-4">
                    <span className="flex items-center gap-1 font-mono">
                      <Repeat className="w-3 h-3 text-indigo-500" />
                      {job.triggerType}: {job.recurrenceDay || job.scheduledDate} at{' '}
                      {job.scheduledTime}
                    </span>
                    {job.nextRun && (
                      <span className="text-indigo-600 font-semibold">
                        Next Run: {job.nextRun}
                      </span>
                    )}
                    {job.lastRun && (
                      <span className="text-slate-400">Last executed: {job.lastRun}</span>
                    )}
                  </div>
                </div>

                {/* Right actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleJobStatus(job.id)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      job.status === 'Active'
                        ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {job.status === 'Active' ? (
                      <>
                        <Pause className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Resume</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRunJobNow(job)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors"
                    title="Execute this automation batch immediately"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete automation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Create Automated Scheduling Rule
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Schedule Task Name
                </label>
                <input
                  type="text"
                  value={newJob.name}
                  onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                  placeholder="e.g. End of Month Dues Clearance Reminder"
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Message Template
                </label>
                <select
                  value={newJob.templateId}
                  onChange={(e) => setNewJob({ ...newJob, templateId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.channel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Cohort
                  </label>
                  <select
                    value={newJob.targetCohort}
                    onChange={(e) =>
                      setNewJob({ ...newJob, targetCohort: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="All Students">All Students ({students.length})</option>
                    <option value="Students with Dues Owed">
                      Students with Dues Owed ({students.filter((s) => s.duesOwed > 0).length})
                    </option>
                    <option value="Low Attendance (<85%)">
                      Low Attendance (&lt;85%) ({students.filter((s) => s.attendanceRate < 85).length})
                    </option>
                    <option value="Academic Warning">
                      Academic Warning ({students.filter((s) => s.gpa < 2.5).length})
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Channel
                  </label>
                  <select
                    value={newJob.channel}
                    onChange={(e) =>
                      setNewJob({ ...newJob, channel: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border rounded-xl bg-white"
                  >
                    <option value="SMS">SMS Message</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block font-semibold text-slate-700 mb-2">
                  Automation Trigger Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'Recurring Monthly', label: 'Monthly Dues' },
                    { type: 'Recurring Weekly', label: 'Weekly Summary' },
                    { type: 'Scheduled Once', label: 'One-time Date' },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() =>
                        setNewJob({ ...newJob, triggerType: item.type as any })
                      }
                      className={`p-2 rounded-xl text-center border font-medium transition-all ${
                        newJob.triggerType === item.type
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {newJob.triggerType === 'Scheduled Once' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newJob.scheduledDate}
                      onChange={(e) =>
                        setNewJob({ ...newJob, scheduledDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={newJob.scheduledTime}
                      onChange={(e) =>
                        setNewJob({ ...newJob, scheduledTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Recurrence Schedule
                    </label>
                    <input
                      type="text"
                      value={newJob.recurrenceDay}
                      onChange={(e) =>
                        setNewJob({ ...newJob, recurrenceDay: e.target.value })
                      }
                      placeholder="e.g. 1st of month"
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Execution Time
                    </label>
                    <input
                      type="time"
                      value={newJob.scheduledTime}
                      onChange={(e) =>
                        setNewJob({ ...newJob, scheduledTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateJob}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-xs"
              >
                Save Schedule Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
