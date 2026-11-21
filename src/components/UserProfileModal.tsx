import React, { useState, useEffect } from 'react';
import { UserPermissionKey } from '../types';
import { AdminUserInfo, authFetch, updateStoredUser } from '../utils/authClient';
import {
  X,
  User,
  Clock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
  Phone,
  Briefcase,
  Building2,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserInfo;
  onUserUpdated: (updated: AdminUserInfo) => void;
  secondsUntilAutoLogout?: number | null;
}

const PERMISSION_LABELS: Record<UserPermissionKey, string> = {
  viewStudents: 'View Students & Excel Data',
  editStudents: 'Edit / Import Students & Dues',
  sendWhatsapp: 'WhatsApp Web & Login Server',
  managePdf: 'Pending Dues PDF Studio',
  manageTemplates: 'Designer Templates',
  manageScheduler: 'Automated Scheduling',
  viewReports: 'Reporting & Dues Audit',
  downloadInstallers: 'Download Installers',
  manageUsers: 'Manage Users & Rights',
};

const TIMEOUT_PRESETS = [
  { label: '1 min', value: 1 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '60 min', value: 60 },
  { label: 'Disabled', value: 0 },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  secondsUntilAutoLogout,
}) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [designation, setDesignation] = useState(user.designation || '');
  const [department, setDepartment] = useState(user.department || '');
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState<number>(
    typeof user.inactivityTimeoutMinutes === 'number' ? user.inactivityTimeoutMinutes : 15
  );
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDesignation(user.designation || '');
      setDepartment(user.department || '');
      setInactivityTimeoutMinutes(
        typeof user.inactivityTimeoutMinutes === 'number' ? user.inactivityTimeoutMinutes : 15
      );
      setCurrentPassword('');
      setNewPassword('');
      setStatus(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          designation: designation.trim(),
          department: department.trim(),
          inactivityTimeoutMinutes: Math.max(0, Math.min(480, Math.round(Number(inactivityTimeoutMinutes) || 0))),
          ...(newPassword.trim()
            ? { currentPassword, newPassword: newPassword.trim() }
            : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.user) {
        setStatus({
          type: 'error',
          text: data.error || 'Could not update your profile settings.',
        });
        return;
      }

      updateStoredUser(data.user);
      onUserUpdated(data.user);
      setCurrentPassword('');
      setNewPassword('');
      setStatus({
        type: 'success',
        text: 'Profile details and automatic logout schedule saved.',
      });
    } catch {
      setStatus({
        type: 'error',
        text: 'Network error while updating profile.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activePermissionEntries = (Object.keys(PERMISSION_LABELS) as UserPermissionKey[]).filter(
    (key) => user.isPrimaryAdmin || user.role === 'admin' || user.permissions?.[key]
  );

  const formatTimestamp = (iso?: string | number) => {
    if (!iso) return 'Current session';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              {(user.fullName || user.username).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                User Profile &amp; Security Settings
              </h3>
              <p className="text-xs text-slate-500">
                @{user.username} · {user.isPrimaryAdmin ? 'Primary Administrator' : user.role.toUpperCase()} · {user.designation || 'Portal User'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            aria-label="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSaveProfile} className="overflow-y-auto p-6 space-y-6 text-xs">
          {status && (
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-2.5 ${
                status.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{status.text}</span>
            </div>
          )}

          {/* Account Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Username</div>
              <div className="font-mono font-bold text-slate-900 mt-0.5">{user.username}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Role &amp; Status</div>
              <div className="font-semibold text-slate-900 mt-0.5 capitalize">
                {user.isPrimaryAdmin ? 'Primary Admin' : user.role} · {user.isActive ? 'Active' : 'Suspended'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Account Created</div>
              <div className="font-medium text-slate-800 tabular-nums mt-0.5">
                {formatTimestamp(user.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Last Sign-In</div>
              <div className="font-medium text-slate-800 tabular-nums mt-0.5">
                {formatTimestamp(user.lastLoginAt)}
              </div>
            </div>
          </div>

          {/* Personal & Contact Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-600" />
              <span>Personal &amp; Department Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Address
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@kidzeeschool.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Phone Number
                  </span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98012 78254"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    Designation
                  </span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Principal, Accountant, Coordinator"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Department / Section
                  </span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. School Administration & Fees"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Automatic Inactivity Logout Schedule */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Automatic Inactivity Logout Schedule</span>
              </h4>
              {typeof secondsUntilAutoLogout === 'number' && inactivityTimeoutMinutes > 0 && (
                <span className="text-[11px] font-mono font-semibold text-amber-900 tabular-nums">
                  Current idle timer remaining: {Math.floor(secondsUntilAutoLogout / 60)}m{' '}
                  {String(secondsUntilAutoLogout % 60).padStart(2, '0')}s
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600">
              Automatically lock and sign out your session when there is no mouse, keyboard, or touch activity for the scheduled duration.
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              {TIMEOUT_PRESETS.map((preset) => {
                const active = inactivityTimeoutMinutes === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setInactivityTimeoutMinutes(preset.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}

              <div className="flex items-center gap-1.5 ml-auto">
                <label className="text-[11px] font-semibold text-slate-700">Custom (min):</label>
                <input
                  type="number"
                  min={0}
                  max={480}
                  value={inactivityTimeoutMinutes}
                  onChange={(e) => setInactivityTimeoutMinutes(Math.max(0, Math.min(480, Number(e.target.value) || 0)))}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900 tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Assigned Rights & Permissions Overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Assigned Portal Rights ({activePermissionEntries.length} / 9)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(PERMISSION_LABELS) as UserPermissionKey[]).map((key) => {
                const allowed =
                  user.isPrimaryAdmin || user.role === 'admin' || Boolean(user.permissions?.[key]);
                return (
                  <div
                    key={key}
                    className={`px-3 py-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                      allowed
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="truncate">{PERMISSION_LABELS[key]}</span>
                    <span>{allowed ? 'Allowed' : 'Locked'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Password Optional Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-600" />
              <span>Change Password (Optional)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required only if changing password"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Profile...' : 'Save Profile & Auto-Logout Timer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
