import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  whatsappServerApi,
  ServerStatusResponse,
  ServerConnectedUser,
  ServerLogEntry,
  ServerBatchState,
} from '../services/whatsappServerApi';
import { StudentRecord, MessageTemplate } from '../types';
import { renderPersonalizedMessage, formatCurrency } from '../utils/templateEngine';
import { CustomDurationSelector } from './CustomDurationSelector';
import {
  Server,
  QrCode,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Send,
  Play,
  Square,
  Clock,
  ShieldCheck,
  Battery,
  BatteryCharging,
  Wifi,
  Users,
  Copy,
  Check,
  Download,
  Trash2,
  Zap,
  Sliders,
  Filter,
} from 'lucide-react';

interface WhatsAppServerGatewayProps {
  students: StudentRecord[];
  templates: MessageTemplate[];
  onOpenDirectWebHub?: () => void;
  onOpenDirectMessageModal?: () => void;
  onOpenInstallationModal?: () => void;
}

export const WhatsAppServerGateway: React.FC<WhatsAppServerGatewayProps> = ({
  students,
  templates,
  onOpenDirectWebHub,
  onOpenDirectMessageModal,
  onOpenInstallationModal,
}) => {
  // Server connection states
  const [serverStatus, setServerStatus] = useState<ServerStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // QR & Pairing states
  const [loginMethod, setLoginMethod] = useState<'qr' | 'pairing_code'>('qr');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [schoolPhoneNumber, setSchoolPhoneNumber] = useState<string>('9801278254');
  const [customPushName, setCustomPushName] = useState<string>('Kidzee School Dispatcher');
  const [qrCountdown, setQrCountdown] = useState<number>(60);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);

  // Batch queue states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.find((t) => t.channel === 'WhatsApp')?.id || templates[0].id
  );
  const [batchCohortFilter, setBatchCohortFilter] = useState<'all' | 'dues' | 'overdue'>('all');
  const [throttleDelayMs, setThrottleDelayMs] = useState<number>(1500);
  const [batchState, setBatchState] = useState<ServerBatchState | null>(null);
  const [isTriggeringBatch, setIsTriggeringBatch] = useState(false);

  // Single test send states
  const [testMobile, setTestMobile] = useState<string>('9801278254');
  const [testRecipientName, setTestRecipientName] = useState<string>('Parent / Guardian');
  const [testMessage, setTestMessage] = useState<string>(
    'Respected Parent, this is an official fee reminder and student update from Kidzee School Administration.'
  );
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessNotice, setTestSuccessNotice] = useState<string | null>(null);

  // Server logs state
  const [logs, setLogs] = useState<ServerLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('ALL');
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);

  // Polling intervals refs
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial status fetch & recurrent heartbeat
  const fetchStatus = async () => {
    try {
      const statusData = await whatsappServerApi.getStatus();
      setServerStatus(statusData);
      setBatchState(statusData.batchState);
      setServerError(null);
      return statusData;
    } catch (err: any) {
      setServerError('Unable to reach port 3000 API Gateway. Ensure server is active.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await whatsappServerApi.getLogs(logFilter);
      if (res.success) {
        setLogs(res.logs);
      }
    } catch {
      // ignore transient fetch errors
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLogs();

    // Start background polling
    pollTimerRef.current = setInterval(async () => {
      const st = await fetchStatus();
      if (st?.batchState?.isProcessing || autoRefreshLogs) {
        fetchLogs();
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [logFilter, autoRefreshLogs]);

  // 2. Manage QR Countdown
  useEffect(() => {
    if (serverStatus?.status !== 'PAIRING' && !qrDataUrl) return;

    const timer = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          // Auto-refresh QR code
          handleRefreshQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [serverStatus?.status, qrDataUrl]);

  // Handle Start / Refresh QR Session
  const handleRefreshQr = async () => {
    setIsQrLoading(true);
    try {
      const res = await whatsappServerApi.startLoginSession();
      if (res.success) {
        setQrDataUrl(res.qrDataUrl);
        setPairingCode(res.pairingCode);
        setQrCountdown(res.expiresIn || 60);
        await fetchStatus();
        await fetchLogs();
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to generate QR code.');
    } finally {
      setIsQrLoading(false);
    }
  };

  // Handle Request Pairing Code with school phone
  const handleRequestPairingCode = async () => {
    if (!schoolPhoneNumber.trim()) return;
    setIsQrLoading(true);
    try {
      const res = await whatsappServerApi.requestPairingCode(schoolPhoneNumber);
      if (res.success) {
        setPairingCode(res.pairingCode);
        await fetchStatus();
        await fetchLogs();
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to request pairing code');
    } finally {
      setIsQrLoading(false);
    }
  };

  // Handle Confirm Scan / Simulated Link
  const handleConfirmLink = async () => {
    setIsQrLoading(true);
    try {
      await whatsappServerApi.confirmScanOrLink({
        phoneNumber: schoolPhoneNumber,
        pushName: customPushName || 'Kidzee School Dispatcher',
        schoolName: 'Kidzee School',
      });
      setQrDataUrl('');
      await fetchStatus();
      await fetchLogs();
    } catch (err: any) {
      setServerError(err.message || 'Failed to authenticate connection.');
    } finally {
      setIsQrLoading(false);
    }
  };

  // Handle Logout / Revoke
  const handleLogout = async () => {
    try {
      await whatsappServerApi.logout();
      setQrDataUrl('');
      setPairingCode('');
      await fetchStatus();
      await fetchLogs();
    } catch (err: any) {
      setServerError(err.message || 'Failed to disconnect session.');
    }
  };

  // Handle Single Test Send
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMobile.trim() || !testMessage.trim()) return;
    setIsSendingTest(true);
    setTestSuccessNotice(null);
    try {
      const res = await whatsappServerApi.sendMessage({
        recipientMobile: testMobile,
        recipientName: testRecipientName,
        message: testMessage,
      });
      if (res.success) {
        setTestSuccessNotice(`Message sent! Message ID: ${res.messageId}`);
        await fetchLogs();
        await fetchStatus();
      }
    } catch (err: any) {
      setServerError(err.message || 'Test message dispatch failed.');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Filter students for batch send
  const filteredBatchStudents = students.filter((s) => {
    if (batchCohortFilter === 'dues') return s.duesOwed > 0;
    if (batchCohortFilter === 'overdue') return s.duesStatus === 'Overdue';
    return true;
  });

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Handle Start Batch Queue
  const handleStartBatchQueue = async () => {
    if (filteredBatchStudents.length === 0) return;
    setIsTriggeringBatch(true);
    setServerError(null);

    const items = filteredBatchStudents.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      parentName: s.parentName,
      parentMobile: s.parentMobile,
      message: s.customMessageOverride || renderPersonalizedMessage(activeTemplate.body, s),
      duesOwed: s.duesOwed,
    }));

    try {
      const res = await whatsappServerApi.sendBatchQueue(items, throttleDelayMs);
      if (res.success) {
        setBatchState(res.batchState);
        await fetchLogs();
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to trigger batch queue.');
    } finally {
      setIsTriggeringBatch(false);
    }
  };

  // Handle Cancel Batch
  const handleCancelBatch = async () => {
    try {
      await whatsappServerApi.cancelBatch();
      await fetchStatus();
      await fetchLogs();
    } catch {
      // ignore
    }
  };

  // Clear Logs
  const handleClearLogs = async () => {
    try {
      await whatsappServerApi.clearLogs();
      setLogs([]);
    } catch {
      // ignore
    }
  };

  // Export Logs to Excel
  const handleExportLogsExcel = () => {
    const exportData = logs.map((l) => ({
      'Log ID': l.id,
      'Timestamp': l.timestamp,
      'Recipient Name': l.recipientName,
      'Parent Mobile': l.recipientMobile,
      'Student Associated': l.studentName || 'N/A',
      'Status': l.status,
      'WhatsApp Message ID': l.messageId,
      'Channel': l.channel,
      'Server Latency (ms)': l.serverLatencyMs,
      'Message Preview': l.messagePreview,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Server_WhatsApp_Logs');
    XLSX.writeFile(wb, `WhatsApp_Server_Dispatch_Audit_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPairingCode(true);
    setTimeout(() => setCopiedPairingCode(false), 2500);
  };

  const isConnected = serverStatus?.status === 'CONNECTED';
  const isPairing = serverStatus?.status === 'PAIRING' || !!qrDataUrl;
  const isProcessingBatch = batchState?.isProcessing ?? false;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Kidzee School — WhatsApp Web Login Server & Gateway
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Kidzee Port 3000 Gateway
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kidzee School Multi-Device Gateway • Live QR Handshake & Pairing Code • Server 1-Click Automated Batch Sender
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              isConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : isPairing
                ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                : serverStatus?.online
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-600'
                  : isPairing
                  ? 'bg-amber-500'
                  : serverStatus?.online
                  ? 'bg-slate-400'
                  : 'bg-rose-500'
              }`}
            />
            <span>
              {isConnected
                ? 'WHATSAPP LINKED & READY'
                : isPairing
                ? 'WAITING FOR QR SCAN'
                : serverStatus?.online
                ? 'SERVER ONLINE (IDLE)'
                : 'SERVER OFFLINE'}
            </span>
          </div>

          {onOpenDirectMessageModal && (
            <button
              type="button"
              onClick={onOpenDirectMessageModal}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Direct Message (Kidzee School)</span>
            </button>
          )}

          {onOpenInstallationModal && (
            <button
              type="button"
              onClick={onOpenInstallationModal}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              title="Download 1-click Windows installer (install.bat), Mac/Linux scripts, or complete offline ZIP package"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download Installer</span>
            </button>
          )}

          {onOpenDirectWebHub && (
            <button
              type="button"
              onClick={onOpenDirectWebHub}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              Switch to Direct Web Tab →
            </button>
          )}
        </div>
      </div>

      {/* Error alert if any */}
      {serverError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{serverError}</span>
          </div>
          <button
            type="button"
            onClick={() => setServerError(null)}
            className="text-rose-600 hover:text-rose-900 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Column = Login / Linked Device; Right Column = Batch Sender & Testing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: WhatsApp Web Connection Console (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {!isConnected ? (
            /* LOGIN CONSOLE: QR CODE & PAIRING CODE */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-emerald-600" />
                      Link School WhatsApp
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Connect your school administrator WhatsApp to enable server automated dispatches.
                    </p>
                  </div>
                </div>

                {/* Login Method Toggle */}
                <div className="mt-4 flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('qr')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      loginMethod === 'qr' ? 'bg-white text-emerald-800 shadow-xs' : 'hover:text-slate-900'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('pairing_code')}
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      loginMethod === 'pairing_code'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Link with Phone #</span>
                  </button>
                </div>
              </div>

              {loginMethod === 'qr' ? (
                /* QR Code Method */
                <div className="space-y-4 text-center">
                  {qrDataUrl ? (
                    <div className="flex flex-col items-center">
                      <div className="relative p-3 bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md inline-block">
                        <img
                          src={qrDataUrl}
                          alt="WhatsApp Web Login QR Code"
                          className="w-56 h-56 object-contain rounded-xl"
                        />
                        <div className="absolute -top-3 -right-3 bg-emerald-600 text-white rounded-full p-1.5 shadow-sm">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      </div>

                      {/* QR Countdown & Refresh */}
                      <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 font-medium">
                        <span className="flex items-center gap-1 font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Clock className="w-3.5 h-3.5" />
                          Auto-refreshing in {qrCountdown}s
                        </span>
                        <button
                          type="button"
                          onClick={handleRefreshQr}
                          disabled={isQrLoading}
                          className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-semibold"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isQrLoading ? 'animate-spin' : ''}`} />
                          Refresh QR
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-10 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-slate-800">No active login session initialized</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Click below to request a secure WhatsApp Web multi-device handshake token.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRefreshQr}
                        disabled={isQrLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isQrLoading ? 'animate-spin' : ''}`} />
                        <span>Generate WhatsApp QR Code</span>
                      </button>
                    </div>
                  )}

                  {/* Instructions & NPE Safeguard */}
                  <div className="bg-slate-50 rounded-xl p-3.5 text-left border border-slate-100 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Android NullPointerException Fixed</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      QR payload now streams all 4 required 32-byte Base64 Noise protocol keys (<code className="bg-white px-1 py-0.5 rounded text-[10px] text-slate-800 font-mono">ref,noiseKey,identityKey,advSecret</code>) preventing Android <span className="font-mono text-rose-600 font-semibold">Base64.encode(null)</span> array crashes.
                    </p>
                    <div className="pt-1 border-t border-slate-200/60">
                      <div className="font-bold text-slate-800 mb-1">To link your WhatsApp:</div>
                      <ol className="list-decimal list-inside space-y-1 text-[11px]">
                        <li>Open WhatsApp on your school phone</li>
                        <li>
                          Tap <strong>Menu ⋮</strong> (Android) or <strong>Settings ⚙️</strong> (iPhone)
                        </li>
                        <li>
                          Select <strong>Linked Devices</strong> &rarr; <strong>Link a Device</strong>
                        </li>
                        <li>Point your camera at this QR code (or use Link with Phone #)</li>
                      </ol>
                    </div>
                  </div>

                  {/* Official WhatsApp Web Direct Button */}
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-left flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-emerald-900">Direct Browser WhatsApp Web</div>
                      <div className="text-[10px] text-emerald-700">For direct 1-click parent sending from your browser session</div>
                    </div>
                    <a
                      href="https://web.whatsapp.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs inline-flex items-center gap-1"
                    >
                      <span>web.whatsapp.com</span>
                      <span>↗</span>
                    </a>
                  </div>

                  {/* Immediate 1-Click Scan Confirmation Simulation */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleConfirmLink}
                      disabled={isQrLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Authorize Device Link</span>
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Instantly completes the gateway handshake for testing and automated school dispatch.
                    </p>
                  </div>
                </div>
              ) : (
                /* Pairing Code Method */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      School WhatsApp Phone Number
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={schoolPhoneNumber}
                        onChange={(e) => setSchoolPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="flex-1 px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleRequestPairingCode}
                        disabled={isQrLoading}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0"
                      >
                        Get Code
                      </button>
                    </div>
                  </div>

                  {pairingCode && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                      <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">
                        Enter this 8-Character Pairing Code on WhatsApp
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-2xl font-mono font-extrabold tracking-widest text-emerald-950 bg-white px-4 py-2 rounded-xl border border-emerald-300 shadow-2xs">
                          {pairingCode}
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pairingCode)}
                          className="p-2.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-700 transition-all"
                          title="Copy Code"
                        >
                          {copiedPairingCode ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-700">
                        In WhatsApp: Linked Devices &rarr; Link with phone number instead &rarr; Type this code.
                      </p>
                    </div>
                  )}

                  {/* Device Push Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sender Name / Department Label
                    </label>
                    <input
                      type="text"
                      value={customPushName}
                      onChange={(e) => setCustomPushName(e.target.value)}
                      placeholder="e.g. Principal Office Dispatch"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmLink}
                    disabled={isQrLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize Pairing & Link Device</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* CONNECTED SESSION DASHBOARD */
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-base font-extrabold text-slate-900">
                        {serverStatus?.connectedUser?.pushName || 'WhatsApp Connected'}
                      </h3>
                    </div>
                    <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                      {serverStatus?.connectedUser?.phoneNumber}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              {/* Linked Device Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Platform</div>
                  <div className="font-semibold text-slate-800 mt-0.5 truncate">
                    {serverStatus?.connectedUser?.platform}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Battery Status</div>
                  <div className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
                    {serverStatus?.connectedUser?.isCharging ? (
                      <BatteryCharging className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Battery className="w-4 h-4 text-slate-600" />
                    )}
                    <span>{serverStatus?.connectedUser?.batteryLevel}% (Charging)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Session ID</div>
                  <div className="font-mono text-[11px] font-bold text-slate-700 mt-0.5 truncate">
                    {serverStatus?.connectedUser?.sessionId}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="text-[10px] uppercase font-bold text-emerald-700">Messages Dispatched</div>
                  <div className="font-mono font-extrabold text-emerald-900 mt-0.5 text-sm">
                    {serverStatus?.connectedUser?.messagesSentCount || 0} msgs
                  </div>
                </div>
              </div>

              {/* Quick Send Single Test */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-emerald-600" />
                    Quick Server Direct Send
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">Test direct socket</span>
                </div>

                <form onSubmit={handleSendTestMessage} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={testRecipientName}
                        onChange={(e) => setTestRecipientName(e.target.value)}
                        placeholder="Recipient Name"
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={testMobile}
                        onChange={(e) => setTestMobile(e.target.value)}
                        placeholder="Phone Number"
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Type test message..."
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-hidden resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    {testSuccessNotice ? (
                      <span className="text-[11px] text-emerald-700 font-semibold truncate max-w-xs">
                        {testSuccessNotice}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Routes via server port 3000</span>
                    )}

                    <button
                      type="submit"
                      disabled={isSendingTest}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition-all shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSendingTest ? 'Sending...' : 'Send Message'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Server Engine Architecture Specs */}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 space-y-3 text-xs shadow-xs">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <span className="font-bold flex items-center gap-1.5 text-white">
                <Wifi className="w-4 h-4 text-emerald-400" />
                Daemon Architecture
              </span>
              <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded text-emerald-400">
                Express + WS Gateway
              </span>
            </div>
            <div className="space-y-1.5 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Listening Port:</span>
                <span className="text-white font-mono">3000 (Vite proxy/backend)</span>
              </div>
              <div className="flex justify-between">
                <span>Login Protocol:</span>
                <span className="text-white font-mono">QR Handshake & Pairing Code</span>
              </div>
              <div className="flex justify-between">
                <span>Queue Engine:</span>
                <span className="text-emerald-400 font-semibold">Async Background Throttler</span>
              </div>
              <div className="flex justify-between">
                <span>Anti-Spam Safeguards:</span>
                <span className="text-slate-200">500ms - 5000ms randomized pacing</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 1-Click Server Batch Dispatcher & Transmission Audit (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1-CLICK SERVER BATCH DISPATCH ENGINE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Server 1-Click Automated Batch Dispatch
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transmit personalized reports to all student parents directly through the background server.
                </p>
              </div>

              <div className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{filteredBatchStudents.length} Target Recipients</span>
              </div>
            </div>

            {/* Batch Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Template Picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  disabled={isProcessingBatch}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cohort Filter */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Cohort</label>
                <select
                  value={batchCohortFilter}
                  onChange={(e) => setBatchCohortFilter(e.target.value as any)}
                  disabled={isProcessingBatch}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="all">All Enrolled Students ({students.length})</option>
                  <option value="dues">
                    Students with Dues ({students.filter((s) => s.duesOwed > 0).length})
                  </option>
                  <option value="overdue">
                    Overdue Dues Only ({students.filter((s) => s.duesStatus === 'Overdue').length})
                  </option>
                </select>
              </div>
            </div>

            {/* Custom Duration Selector (Seconds & Minutes) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <CustomDurationSelector
                durationMs={throttleDelayMs}
                onChangeDurationMs={setThrottleDelayMs}
                disabled={isProcessingBatch}
                label="Message Sending Duration / Delay Between Notices"
                totalItems={filteredBatchStudents.length}
              />
            </div>

            {/* Live Progress Bar when Batch is Running or Finished */}
            {batchState && batchState.total > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {batchState.isProcessing ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="font-extrabold text-slate-800">
                      {batchState.isProcessing
                        ? `Sending ${batchState.processed} of ${batchState.total}...`
                        : `Batch Complete: ${batchState.successful} Delivered`}
                    </span>
                  </div>

                  <span className="font-mono font-bold text-emerald-800">
                    {Math.round((batchState.processed / batchState.total) * 100)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 transition-all duration-300 rounded-full"
                    style={{
                      width: `${(batchState.processed / batchState.total) * 100}%`,
                    }}
                  />
                </div>

                {/* Details info */}
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    Current target:{' '}
                    <strong>{batchState.currentRecipient || 'All items processed'}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700 font-semibold">
                      ✓ {batchState.successful} Success
                    </span>
                    {batchState.failed > 0 && (
                      <span className="text-rose-600 font-semibold">
                        ✕ {batchState.failed} Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* One-Click Trigger Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              {!isProcessingBatch ? (
                <button
                  type="button"
                  onClick={handleStartBatchQueue}
                  disabled={!isConnected || isTriggeringBatch || filteredBatchStudents.length === 0}
                  className={`flex-1 py-3 px-6 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 ${
                    !isConnected
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>
                    {!isConnected
                      ? 'Link WhatsApp First to Enable 1-Click Server Batch'
                      : `One-Click Send All (${filteredBatchStudents.length} Records) via Server`}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancelBatch}
                  className="flex-1 py-3 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Square className="w-4 h-4" />
                  <span>Halt / Cancel Active Server Batch</span>
                </button>
              )}
            </div>
          </div>

          {/* LIVE SERVER TRANSMISSION AUDIT LOG */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Live Server Transmission Audit Log
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {logs.length} Records
                </span>
              </div>

              {/* Actions & Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 font-medium"
                >
                  <option value="ALL">All Events</option>
                  <option value="DELIVERED">Delivered Only</option>
                  <option value="FAILED">Failed Only</option>
                  <option value="SYSTEM">System/Auth Only</option>
                </select>

                <button
                  type="button"
                  onClick={handleExportLogsExcel}
                  disabled={logs.length === 0}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-all"
                  title="Export to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-all"
                  title="Clear Logs"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Logs Table / Stream */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No transmissions recorded yet. Run a single send or batch queue above.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Recipient / Target</th>
                      <th className="py-2.5 px-3">Message Preview</th>
                      <th className="py-2.5 px-3">Message ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              log.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : log.status === 'SYSTEM'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{log.recipientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {log.recipientMobile}
                          </div>
                        </td>
                        <td className="py-2 px-3 max-w-xs text-slate-600 truncate text-[11px]" title={log.messagePreview}>
                          {log.messagePreview}
                        </td>
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          {log.messageId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
