import React, { useState } from 'react';
import {
  generateWhatsAppWebUrl,
  generateWaMeUrl,
  getWhatsAppPhoneDigits,
  formatPhoneNumber,
} from '../utils/templateEngine';
import { whatsappServerApi } from '../services/whatsappServerApi';
import { DispatchLog } from '../types';
import {
  X,
  Send,
  MessageSquare,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  School,
  AlertCircle,
  CheckCircle2,
  Share2,
  Users,
} from 'lucide-react';

interface KidzeeDirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogDispatch?: (log: DispatchLog) => void;
}

const KIDZEE_PRESETS = [
  {
    title: 'School Fee Dues Reminder',
    category: 'Fees & Dues',
    text: 'Respected Parent,\n\nThis is an official fee reminder from Kidzee School. Kindly clear the pending school and transport dues at the earliest at the school fee counter.\n\nFor fee queries, contact: 9801278254\nThank you,\nKidzee School Administration',
  },
  {
    title: 'School Holiday / Vacation Notice',
    category: 'General',
    text: 'Dear Parent,\n\nGreetings from Kidzee School! Please be informed that the school will remain closed tomorrow on account of holiday. Classes will resume as per regular timetable.\n\nWarm regards,\nPrincipal, Kidzee School',
  },
  {
    title: 'Parent-Teacher Meeting (PTM) Invitation',
    category: 'Academic',
    text: "Dear Parent,\n\nKidzee School cordially invites you to the upcoming Parent-Teacher Meeting (PTM) this Saturday from 09:00 AM to 01:00 PM. Your presence is valuable to discuss your child's learning progress.\n\nThanks & Regards,\nKidzee School",
  },
  {
    title: 'Urgent Weather / Timing Alert',
    category: 'Urgent',
    text: "Urgent Notice - Kidzee School:\nDear Parent, please note today's adjusted school timing. For transport & safety queries, call school desk: 9801278254.\n\nKidzee School Office",
  },
  {
    title: 'Kidzee Admission & Re-Enrollment',
    category: 'Admissions',
    text: 'Dear Parent,\n\nAdmissions and re-enrollment for the new academic session are now open at Kidzee School. Please visit the school office or call 9801278254 for details.\n\nKidzee School Admissions Desk',
  },
];

export const KidzeeDirectMessageModal: React.FC<KidzeeDirectMessageModalProps> = ({
  isOpen,
  onClose,
  onLogDispatch,
}) => {
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientName, setRecipientName] = useState('Parent / Guardian');
  const [messageText, setMessageText] = useState(KIDZEE_PRESETS[0].text);
  const [copied, setCopied] = useState(false);
  const [isSendingServer, setIsSendingServer] = useState(false);
  const [autoCloseTab, setAutoCloseTab] = useState(true);
  const [autoCloseDelaySec, setAutoCloseDelaySec] = useState(8);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const cleanPhone = recipientNumber.trim();
  const phoneDigits = getWhatsAppPhoneDigits(cleanPhone);
  const isValidPhone = phoneDigits.length >= 10;

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // 1. Direct Web WhatsApp link (web.whatsapp.com)
  const handleSendWebWhatsApp = () => {
    if (!isValidPhone) {
      showNotification('error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    const url = generateWhatsAppWebUrl(cleanPhone, messageText) + '#autosend=1&autoclose=1';
    const win = window.open(url, '_blank');

    if (autoCloseTab && win) {
      setTimeout(() => {
        try {
          if (!win.closed) win.close();
        } catch (e) {
          console.warn('Could not auto-close tab:', e);
        }
      }, autoCloseDelaySec * 1000);
    }

    logDirectSend('WhatsApp Web');
    showNotification(
      'success',
      `Opened WhatsApp Web for ${cleanPhone}${autoCloseTab ? ` (Auto-closing in ${autoCloseDelaySec}s)` : ''}`
    );
  };

  // 2. Universal wa.me link
  const handleSendWaMe = () => {
    if (!isValidPhone) {
      showNotification('error', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    const url = generateWaMeUrl(cleanPhone, messageText);
    window.open(url, '_blank', 'noopener,noreferrer');

    logDirectSend('wa.me Direct');
    showNotification('success', `Opened direct WhatsApp link for ${cleanPhone}!`);
  };

  // 3. Direct SMS Link
  const handleSendSMS = () => {
    if (!cleanPhone) {
      showNotification('error', 'Please enter a mobile number.');
      return;
    }
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const smsUrl = `sms:${cleanDigits}?body=${encodeURIComponent(messageText)}`;
    window.location.href = smsUrl;

    logDirectSend('Direct SMS');
    showNotification('success', `Triggered native SMS to ${cleanPhone} from Kidzee School.`);
  };

  // 4. Send via Background Server Gateway
  const handleSendViaServer = async () => {
    if (!isValidPhone) {
      showNotification('error', 'Please enter a valid mobile number.');
      return;
    }
    setIsSendingServer(true);
    try {
      const res = await whatsappServerApi.sendMessage({
        recipientMobile: cleanPhone,
        recipientName: recipientName || 'Parent',
        message: messageText,
      });
      if (res.success) {
        logDirectSend('WhatsApp Server Gateway', res.messageId);
        showNotification('success', `Dispatched from Kidzee School via Port 3000 Daemon (ID: ${res.messageId})!`);
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Server dispatch failed. Ensure WhatsApp Gateway is linked.');
    } finally {
      setIsSendingServer(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const logDirectSend = (channelName: string, messageId?: string) => {
    if (!onLogDispatch) return;
    onLogDispatch({
      id: `direct-log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      studentId: 'DIRECT-SEND',
      studentName: 'Direct Number Dispatch',
      parentName: recipientName || 'Parent',
      parentMobile: cleanPhone,
      channel: 'WhatsApp',
      messageText,
      duesOwedAtDispatch: 0,
      gpaAtDispatch: 0,
      attendanceAtDispatch: 100,
      status: 'Delivered',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Modal Header with Kidzee School Branding */}
        <div className="bg-linear-to-r from-emerald-700 via-teal-700 to-emerald-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-amber-300 font-extrabold text-xl shadow-xs">
              <School className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight">
                  Kidzee School Direct Text & WhatsApp Sender
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 shadow-2xs">
                  Kidzee Official
                </span>
              </div>
              <p className="text-xs text-emerald-100">
                Send direct text & WhatsApp messages to any mobile number using "Kidzee School" sender identity
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Notification Alert */}
          {actionNotice && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
                actionNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {actionNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{actionNotice.message}</span>
            </div>
          )}

          {/* Sender Identity Banner */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <div>
                <span className="text-slate-500 font-medium">Official Sender: </span>
                <strong className="text-emerald-950 font-extrabold text-sm">Kidzee School</strong>
                <span className="text-emerald-700 ml-1.5 font-mono text-[11px]">(Marwan, Muzaffarpur)</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-200/70 text-emerald-900 font-bold text-[10px] uppercase tracking-wider">
              Verified Channel
            </span>
          </div>

          {/* Recipient Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Parent / Recipient Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientNumber}
                  onChange={(e) => setRecipientNumber(e.target.value)}
                  placeholder="e.g. 9801278254 or +91 98012 78254"
                  className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                {cleanPhone && (
                  <span className="absolute right-3 top-2.5 text-[11px] font-mono text-emerald-700 font-bold">
                    {isValidPhone ? '✓ Valid' : '10 digits required'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Formats automatically with international prefix (<span className="font-mono text-slate-700">+91</span>)
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Recipient / Parent Name (Optional)
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Mr. Chandan Kumar"
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Addressed as parent or guardian in the greeting
              </p>
            </div>
          </div>

          {/* Preset Kidzee School Messages */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Kidzee School Presets
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Click any preset to load</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {KIDZEE_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessageText(preset.text)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200 transition-all text-slate-700"
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800">
                Message Content (Signed as "Kidzee School")
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  {messageText.length} chars
                </span>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-xs text-slate-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message from Kidzee School..."
              className="w-full px-3.5 py-3 text-xs font-sans border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden leading-relaxed resize-y"
            />
          </div>

          {/* 1-Click Sending Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800 mb-2">
              Choose Dispatch Channel:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: WhatsApp Web Direct */}
              <button
                type="button"
                onClick={handleSendWebWhatsApp}
                disabled={!isValidPhone}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Send via WhatsApp Web (Direct)</span>
              </button>

              {/* Option 2: wa.me Direct Link */}
              <button
                type="button"
                onClick={handleSendWaMe}
                disabled={!isValidPhone}
                className="py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Share2 className="w-4 h-4" />
                <span>Send via wa.me Link (Universal)</span>
              </button>

              {/* Option 3: Direct SMS */}
              <button
                type="button"
                onClick={handleSendSMS}
                disabled={!cleanPhone}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Smartphone className="w-4 h-4" />
                <span>Send via SMS (Kidzee Sender ID)</span>
              </button>

              {/* Option 4: Background Server Gateway */}
              <button
                type="button"
                onClick={handleSendViaServer}
                disabled={!isValidPhone || isSendingServer}
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>{isSendingServer ? 'Transmitting...' : 'Send via Server Gateway'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Signed as <strong>Kidzee School</strong> • Direct Parent Communication</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
