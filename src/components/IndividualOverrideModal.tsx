import React, { useState } from 'react';
import { StudentRecord, MessageTemplate } from '../types';
import { renderPersonalizedMessage, formatCurrency } from '../utils/templateEngine';
import { X, Check, RotateCcw, Sparkles } from 'lucide-react';

interface IndividualOverrideModalProps {
  student: StudentRecord;
  template: MessageTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSaveOverride: (studentId: string, customMessage: string | undefined) => void;
}

export const IndividualOverrideModal: React.FC<IndividualOverrideModalProps> = ({
  student,
  template,
  isOpen,
  onClose,
  onSaveOverride,
}) => {
  if (!isOpen) return null;

  const defaultRendered = renderPersonalizedMessage(template.body, {
    ...student,
    customMessageOverride: undefined,
  });

  const [message, setMessage] = useState(
    student.customMessageOverride || defaultRendered
  );

  const handleResetToStandard = () => {
    setMessage(defaultRendered);
  };

  const handleSave = () => {
    // If it equals default rendered, we can clear the override or save it
    onSaveOverride(student.id, message.trim() ? message : undefined);
    onClose();
  };

  const handleClearOverride = () => {
    onSaveOverride(student.id, undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                Customize Message for {student.studentName}
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {student.gradeLevel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Recipient: {student.parentName} ({student.parentRelationship}) • Mobile: {student.parentMobile} • Dues: {formatCurrency(student.duesOwed)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200/60"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Individual Message Customization:</span>
              <p className="text-amber-800 mt-0.5">
                Modifying the text below will send this specific personalized message to {student.parentName} instead of the global automated template.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Message Draft for {student.parentName}:
            </label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed text-slate-800"
              placeholder="Write or edit custom message..."
            />
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>{message.length} characters</span>
              <button
                type="button"
                onClick={handleResetToStandard}
                className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Standard Template
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {student.customMessageOverride && (
              <button
                type="button"
                onClick={handleClearOverride}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
              >
                Remove Custom Override
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save Custom Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
