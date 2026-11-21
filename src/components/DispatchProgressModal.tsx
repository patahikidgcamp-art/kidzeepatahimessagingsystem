import React, { useState, useEffect } from 'react';
import { StudentRecord, MessageTemplate, DispatchLog } from '../types';
import { renderPersonalizedMessage, formatCurrency, formatPhoneNumber, isValidMobileNumber } from '../utils/templateEngine';
import { CustomDurationSelector } from './CustomDurationSelector';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  ShieldAlert,
  Download,
  X,
  FileSpreadsheet,
  Pause,
  Play,
} from 'lucide-react';

interface DispatchProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetStudents: StudentRecord[];
  template: MessageTemplate;
  onDispatchComplete: (newLogs: DispatchLog[]) => void;
  jobTitle?: string;
  initialDelayMs?: number;
}

export const DispatchProgressModal: React.FC<DispatchProgressModalProps> = ({
  isOpen,
  onClose,
  targetStudents,
  template,
  onDispatchComplete,
  jobTitle = 'Automated Message Dispatch',
  initialDelayMs = 2000,
}) => {
  if (!isOpen) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [completedLogs, setCompletedLogs] = useState<DispatchLog[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [delayMs, setDelayMs] = useState<number>(initialDelayMs);
  const [countdownSec, setCountdownSec] = useState<number>(Math.max(1, Math.round(initialDelayMs / 1000)));

  // Countdown timer ticker for live UI display
  useEffect(() => {
    if (!isRunning || isFinished) return;
    const interval = setInterval(() => {
      setCountdownSec((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isFinished]);

  // Message dispatcher step effect with configurable delay
  useEffect(() => {
    if (!isRunning || isFinished) return;

    if (currentIndex >= targetStudents.length) {
      setIsFinished(true);
      setIsRunning(false);
      onDispatchComplete(completedLogs);
      return;
    }

    const timer = setTimeout(() => {
      const student = targetStudents[currentIndex];
      const isValidPhone = isValidMobileNumber(student.parentMobile);
      const renderedText = renderPersonalizedMessage(template.body, student);

      const status: 'Delivered' | 'Read' | 'Failed' = !isValidPhone
        ? 'Failed'
        : Math.random() > 0.3
        ? 'Read'
        : 'Delivered';

      const newLog: DispatchLog = {
        id: `log-${Date.now()}-${currentIndex}`,
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        studentId: student.studentId,
        studentName: student.studentName,
        parentName: student.parentName,
        parentMobile: student.parentMobile,
        channel: template.channel,
        messageText: renderedText,
        duesOwedAtDispatch: student.duesOwed,
        gpaAtDispatch: student.gpa,
        attendanceAtDispatch: student.attendanceRate,
        status,
        failureReason: !isValidPhone ? 'Invalid mobile phone number length' : undefined,
      };

      setCompletedLogs((prev) => [...prev, newLog]);
      setCurrentIndex((prev) => prev + 1);
      setCountdownSec(Math.max(1, Math.round(delayMs / 1000)));
    }, delayMs);

    return () => clearTimeout(timer);
  }, [currentIndex, isRunning, isFinished, targetStudents, template, completedLogs, onDispatchComplete, delayMs]);

  const progressPercentage = Math.round(
    (currentIndex / Math.max(targetStudents.length, 1)) * 100
  );

  const totalDuesReported = completedLogs.reduce(
    (acc, l) => acc + (l.duesOwedAtDispatch || 0),
    0
  );

  const formatCountdown = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                <Send className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-slate-900 text-base">{jobTitle}</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Template: {template.name} ({template.channel}) • {targetStudents.length} recipients queued
            </p>
          </div>

          {isFinished && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Section */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-2">
                {isFinished
                  ? 'All messages processed successfully'
                  : `Transmitting messages to parents (${currentIndex} of ${targetStudents.length})...`}
                {!isFinished && isRunning && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Clock className="w-3 h-3 animate-spin" />
                    Next in: {formatCountdown(countdownSec)}
                  </span>
                )}
              </span>
              <span className="font-mono font-bold text-blue-600">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isFinished ? 'bg-emerald-500' : 'bg-blue-600'
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Dynamic Message Delay / Throttle (Seconds & Minutes) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <CustomDurationSelector
              durationMs={delayMs}
              onChangeDurationMs={(ms) => {
                setDelayMs(ms);
                setCountdownSec(Math.max(1, Math.round(ms / 1000)));
              }}
              disabled={isFinished}
              totalItems={targetStudents.length - currentIndex}
              label="Live Transmission Throttle (Seconds & Minutes)"
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Delivered / Read</div>
              <div className="text-base font-bold text-emerald-600 font-mono mt-0.5">
                {completedLogs.filter((l) => l.status === 'Delivered' || l.status === 'Read').length}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Dues Reported</div>
              <div className="text-base font-bold text-amber-600 font-mono mt-0.5">
                {formatCurrency(totalDuesReported)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Failed / Invalid</div>
              <div className="text-base font-bold text-rose-600 font-mono mt-0.5">
                {completedLogs.filter((l) => l.status === 'Failed').length}
              </div>
            </div>
          </div>

          {/* Live Dispatch Stream */}
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Transmission Log Stream:
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 space-y-2 font-mono text-[11px]">
              {completedLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-4">Initializing carrier gateway...</div>
              ) : (
                completedLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-400 text-[10px]">{log.timestamp}</span>
                      <span className="text-slate-200 font-semibold">{log.parentName}</span>
                      <span className="text-cyan-400 text-[10px]">({formatPhoneNumber(log.parentMobile)})</span>
                      <span className="text-slate-400 text-[10px]">for {log.studentName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.duesOwedAtDispatch > 0 && (
                        <span className="text-amber-400 text-[10px]">
                          Due: {formatCurrency(log.duesOwedAtDispatch)}
                        </span>
                      )}
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                          log.status === 'Read'
                            ? 'bg-cyan-900/80 text-cyan-300'
                            : log.status === 'Delivered'
                            ? 'bg-emerald-900/80 text-emerald-300'
                            : 'bg-rose-900/80 text-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isFinished ? 'Dispatch completed. Audit log updated.' : 'Transmitting via high-throughput messaging gateway...'}
          </span>

          <div className="flex items-center gap-2">
            {!isFinished && (
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
              >
                {isRunning ? 'Pause' : 'Resume'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${
                isFinished
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              {isFinished ? 'Done & View Reports' : 'Cancel Batch'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
