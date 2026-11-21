import React, { useState } from 'react';
import { StudentRecord, MessageTemplate } from '../types';
import { formatCurrency } from '../utils/templateEngine';
import { CustomDurationSelector } from './CustomDurationSelector';
import { Send, Users, DollarSign, X, CheckCircle2, ShieldAlert } from 'lucide-react';

interface QuickBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRecord[];
  templates: MessageTemplate[];
  onStartDispatch: (targetStudents: StudentRecord[], template: MessageTemplate, jobTitle: string, delayMs?: number) => void;
}

export const QuickBatchModal: React.FC<QuickBatchModalProps> = ({
  isOpen,
  onClose,
  students,
  templates,
  onStartDispatch,
}) => {
  if (!isOpen) return null;

  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id || '');
  const [selectedCohort, setSelectedCohort] = useState<
    'all' | 'dues' | 'overdue' | 'low_attendance' | 'warning'
  >('all');
  const [dispatchDelayMs, setDispatchDelayMs] = useState<number>(3000);

  const getTargetStudents = () => {
    switch (selectedCohort) {
      case 'dues':
        return students.filter((s) => s.duesOwed > 0);
      case 'overdue':
        return students.filter((s) => s.duesStatus === 'Overdue' && s.duesOwed > 0);
      case 'low_attendance':
        return students.filter((s) => s.attendanceRate < 85);
      case 'warning':
        return students.filter((s) => s.gpa < 2.5 || s.academicStanding === 'Academic Warning');
      default:
        return students;
    }
  };

  const targetStudents = getTargetStudents();
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const totalDuesInBatch = targetStudents.reduce((acc, s) => acc + (s.duesOwed || 0), 0);

  const handleLaunch = () => {
    const title = `Batch Dispatch: ${selectedTemplate.name}`;
    onStartDispatch(targetStudents, selectedTemplate, title, dispatchDelayMs);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <Send className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-base">Launch Batch Dispatch</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              1. Select Message Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl bg-white font-medium text-slate-800"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.channel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              2. Target Parent Cohort
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedCohort('all')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedCohort === 'all'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs">All Students</div>
                <div className="text-[11px] text-slate-500 font-normal">
                  {students.length} recipients
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCohort('dues')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedCohort === 'dues'
                    ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-amber-600" />
                  <span>Has Dues Owed</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  {students.filter((s) => s.duesOwed > 0).length} recipients
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCohort('overdue')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedCohort === 'overdue'
                    ? 'border-rose-600 bg-rose-50/70 text-rose-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  <span>Overdue Dues Only</span>
                </div>
                <div className="text-[11px] text-slate-500 font-normal">
                  {students.filter((s) => s.duesStatus === 'Overdue' && s.duesOwed > 0).length} recipients
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCohort('low_attendance')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedCohort === 'low_attendance'
                    ? 'border-orange-600 bg-orange-50/70 text-orange-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs">Low Attendance (&lt;85%)</div>
                <div className="text-[11px] text-slate-500 font-normal">
                  {students.filter((s) => s.attendanceRate < 85).length} recipients
                </div>
              </button>
            </div>
          </div>

          {/* Custom Duration Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <CustomDurationSelector
              durationMs={dispatchDelayMs}
              onChangeDurationMs={setDispatchDelayMs}
              label="Custom Sending Duration (Seconds & Minutes)"
              totalItems={targetStudents.length}
            />
          </div>

          {/* Batch Summary box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="font-semibold text-slate-800 text-xs">
              Batch Dispatch Summary:
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Recipients Queued:</span>{' '}
                <span className="font-bold text-slate-900">{targetStudents.length}</span>
              </div>
              <div>
                <span className="text-slate-500">Dues Reported:</span>{' '}
                <span className="font-bold text-amber-700 font-mono">
                  {formatCurrency(totalDuesInBatch)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Channel Gateway:</span>{' '}
                <span className="font-bold text-slate-900">{selectedTemplate.channel}</span>
              </div>
              <div>
                <span className="text-slate-500">Estimated Delivery:</span>{' '}
                <span className="font-bold text-emerald-700">~2 seconds</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={targetStudents.length === 0}
            onClick={handleLaunch}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Transmit Batch to {targetStudents.length} Parents</span>
          </button>
        </div>
      </div>
    </div>
  );
};
