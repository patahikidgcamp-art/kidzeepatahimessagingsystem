import React, { useState } from 'react';
import { StudentRecord, MessageTemplate } from '../types';
import {
  renderPersonalizedMessage,
  formatCurrency,
  formatPhoneNumber,
  generateWhatsAppWebUrl,
  formatTextForWhatsApp,
} from '../utils/templateEngine';
import { FormattedMessageText } from './FormattedMessageText';
import { CheckCheck, Send, Copy, Check, MessageSquare, Edit3, ShieldAlert, ExternalLink } from 'lucide-react';

interface ParentPhonePreviewProps {
  student: StudentRecord;
  allStudents?: StudentRecord[];
  template: MessageTemplate;
  onEditStudentOverride?: (student: StudentRecord) => void;
  onSendSingleMessage?: (student: StudentRecord, renderedText: string) => void;
}

export const ParentPhonePreview: React.FC<ParentPhonePreviewProps> = ({
  student,
  allStudents,
  template,
  onEditStudentOverride,
  onSendSingleMessage,
}) => {
  const [deviceType, setDeviceType] = useState<'iphone' | 'android'>('iphone');
  const [copied, setCopied] = useState(false);

  const renderedMessage = renderPersonalizedMessage(template.body, student, {
    design: template.design,
    allStudents,
  });
  const isWhatsApp = template.channel === 'WhatsApp';
  const hasOverride = Boolean(student.customMessageOverride);
  const hasAllOverBorder = Boolean(
    template.design?.fullBorderBox || template.design?.borderStyle === 'full-box'
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(formatTextForWhatsApp(renderedMessage));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedPhone = formatPhoneNumber(student.parentMobile);

  return (
    <div className="flex flex-col items-center">
      {/* Device & Channel controls */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Preview Device:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setDeviceType('iphone')}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                deviceType === 'iphone' ? 'bg-white shadow-xs text-blue-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              iOS
            </button>
            <button
              type="button"
              onClick={() => setDeviceType('android')}
              className={`px-2 py-1 rounded-md font-medium transition-all ${
                deviceType === 'android' ? 'bg-white shadow-xs text-emerald-600 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Android
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              isWhatsApp ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            {isWhatsApp ? 'WhatsApp Mode' : 'SMS / iMessage'}
          </span>
        </div>
      </div>

      {/* Phone Hardware Mockup */}
      <div className="relative w-full max-w-[340px] bg-slate-900 rounded-[38px] p-3 shadow-2xl ring-1 ring-slate-800/60">
        {/* Notch / Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20 flex items-center justify-center">
          <div className="w-2.5 h-2.5 bg-slate-800 rounded-full mr-2"></div>
          <div className="w-2 h-2 bg-blue-900/60 rounded-full"></div>
        </div>

        {/* Inner Screen */}
        <div
          className={`relative rounded-[28px] overflow-hidden flex flex-col h-[520px] ${
            isWhatsApp ? 'bg-[#0b141a]' : 'bg-slate-100'
          }`}
        >
          {/* Status Bar */}
          <div
            className={`pt-2 px-5 pb-1 flex justify-between items-center text-[11px] select-none ${
              isWhatsApp ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <span className="font-semibold">09:41</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]">5G</span>
              <div className="w-5 h-2.5 border border-current rounded-xs p-0.5 flex items-center">
                <div className="w-full h-full bg-current rounded-2xs"></div>
              </div>
            </div>
          </div>

          {/* Chat Header */}
          <div
            className={`px-3 py-2 flex items-center gap-2.5 border-b shadow-xs select-none ${
              isWhatsApp
                ? 'bg-[#202c33] text-slate-100 border-slate-700'
                : 'bg-white/80 backdrop-blur-md text-slate-900 border-slate-200'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                isWhatsApp ? 'bg-emerald-600' : 'bg-blue-600'
              }`}
            >
              {student.parentName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                <span>{student.parentName}</span>
                <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-md bg-slate-200/60 text-slate-700">
                  {student.parentRelationship}
                </span>
              </div>
              <div
                className={`text-[10px] truncate ${
                  isWhatsApp ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {formattedPhone}
              </div>
            </div>
          </div>

          {/* Chat Bubble Scrollable Area */}
          <div
            className={`flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 ${
              isWhatsApp ? 'bg-[#0b141a] bg-opacity-95' : 'bg-slate-100'
            }`}
          >
            {/* Timestamp label */}
            <div className="text-center my-1">
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-medium ${
                  isWhatsApp
                    ? 'bg-[#182229] text-slate-400'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                Today, 09:41 AM
              </span>
            </div>

            {/* Dues Badge Alert inside preview */}
            {student.duesOwed > 0 && (
              <div
                className={`rounded-lg p-2 text-[11px] border flex items-start gap-1.5 ${
                  student.duesStatus === 'Overdue'
                    ? 'bg-rose-950/40 text-rose-300 border-rose-800/60'
                    : 'bg-amber-950/40 text-amber-200 border-amber-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-semibold">
                    {student.duesStatus === 'Overdue' ? 'Overdue Dues Notice' : 'Pending Fee Dues'}
                  </div>
                  <div>
                    Amount: <span className="font-mono font-bold text-white">{formatCurrency(student.duesOwed)}</span> | Due: {student.duesDueDate}
                  </div>
                </div>
              </div>
            )}

            {/* Message Bubble */}
            <div className="flex flex-col items-end">
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs shadow-sm break-words whitespace-pre-wrap leading-relaxed ${
                  isWhatsApp
                    ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-xs'
                    : 'bg-blue-600 text-white rounded-tr-xs'
                }`}
                style={
                  hasAllOverBorder
                    ? { border: `2px solid ${template.design?.accentColor || '#34d399'}` }
                    : template.design?.accentColor
                    ? { borderTop: `3px solid ${template.design.accentColor}` }
                    : undefined
                }
              >
                <div
                  className={
                    hasAllOverBorder
                      ? 'rounded-lg border border-white/25 p-2 bg-black/10'
                      : undefined
                  }
                >
                  <FormattedMessageText text={renderedMessage} />
                </div>

                {/* Bubble Footer with timestamp and checks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-75">
                  <span>09:41</span>
                  <CheckCheck className="w-3 h-3 text-cyan-300" />
                </div>
              </div>

              {hasOverride && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-500 font-medium">
                  <Edit3 className="w-3 h-3" />
                  <span>Customized individual override active</span>
                </div>
              )}
            </div>
          </div>

          {/* Fake Input Bar */}
          <div
            className={`px-3 py-2 flex items-center gap-2 border-t ${
              isWhatsApp
                ? 'bg-[#202c33] border-slate-700 text-slate-400'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            <div
              className={`flex-1 rounded-full px-3 py-1.5 text-xs ${
                isWhatsApp ? 'bg-[#2a3942] text-slate-300' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Reply to school...
            </div>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                isWhatsApp ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons below phone */}
      <div className="w-full max-w-[340px] mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Copy Message</span>
            </>
          )}
        </button>

        {onEditStudentOverride && (
          <button
            type="button"
            onClick={() => onEditStudentOverride(student)}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs transition-colors"
            title="Tailor a custom note specifically for this student"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-700" />
            <span>Customize Note</span>
          </button>
        )}

        {onSendSingleMessage && (
          <button
            type="button"
            onClick={() => onSendSingleMessage(student, renderedMessage)}
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
            title="Dispatch message right now to this parent"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Now</span>
          </button>
        )}
      </div>

      {/* Direct WhatsApp Web Launcher Button */}
      <div className="w-full max-w-[340px] mt-2">
        <a
          href={generateWhatsAppWebUrl(student.parentMobile, renderedMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center justify-center gap-2 transition-all active:scale-98"
          title={`Open direct WhatsApp Web chat with ${student.parentName}`}
        >
          <MessageSquare className="w-4 h-4 fill-current" />
          <span>Open Chat in WhatsApp Web</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
