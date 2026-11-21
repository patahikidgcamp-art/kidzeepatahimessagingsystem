import React, { useState, useEffect } from 'react';
import { AppUserAccount, UserPermissionKey, UserPermissions } from '../types';
import { authFetch } from '../utils/authClient';
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  Clock,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

const PERMISSION_OPTIONS: Array<{ key: UserPermissionKey; label: string; desc: string }> = [
  { key: 'viewStudents', label: 'View Students & Excel Data', desc: 'Open student directory & view balances' },
  { key: 'editStudents', label: 'Edit & Import Excel Students', desc: 'Add, edit, delete, or import Excel rows' },
  { key: 'sendWhatsapp', label: 'WhatsApp Web & Login Server', desc: 'Send WhatsApp messages & manage QR login' },
  { key: 'managePdf', label: 'Pending Dues PDF Studio', desc: 'Customize PDF templates & auto-send PDFs' },
  { key: 'manageTemplates', label: 'Designer Templates', desc: 'Create & edit designer message templates' },
  { key: 'manageScheduler', label: 'Automated Scheduling', desc: 'Manage & trigger scheduled jobs' },
  { key: 'viewReports', label: 'Reporting & Dues Audit', desc: 'View summary analytics & audit logs' },
  { key: 'downloadInstallers', label: 'Download Installers', desc: 'Download ZIP packages & installer scripts' },
  { key: 'manageUsers', label: 'Manage Users & Rights', desc: 'Create users and modify portal rights' },
];

const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  viewStudents: true,
  editStudents: false,
  sendWhatsapp: true,
  managePdf: true,
  manageTemplates: false,
  manageScheduler: false,
  viewReports: true,
  downloadInstallers: false,
  manageUsers: false,
};

const ALL_ADMIN_PERMISSIONS: UserPermissions = {
  viewStudents: true,
  editStudents: true,
  sendWhatsapp: true,
  managePdf: true,
  manageTemplates: true,
  manageScheduler: true,
  viewReports: true,
  downloadInstallers: true,
  manageUsers: true,
};

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [users, setUsers] = useState<AppUserAccount[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('NEW');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for create / edit
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('School Staff');
  const [department, setDepartment] = useState('Accounts & Messaging');
  const [role, setRole] = useState<'admin' | 'staff' | 'operator'>('staff');
  const [isActive, setIsActive] = useState(true);
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState(15);
  const [permissions, setPermissions] = useState<UserPermissions>({ ...DEFAULT_STAFF_PERMISSIONS });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/users');
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setStatus({ type: 'error', text: data.error || 'Unable to load users.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Failed to reach user directory endpoint.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStatus(null);
      loadUsers();
    }
  }, [isOpen]);

  const populateFormForNew = () => {
    setSelectedUserId('NEW');
    setUsername('');
    setPassword('');
    setFullName('');
    setEmail('');
    setPhone('');
    setDesignation('School Staff');
    setDepartment('Accounts & Messaging');
    setRole('staff');
    setIsActive(true);
    setInactivityTimeoutMinutes(15);
    setPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
    setStatus(null);
  };

  const populateFormForUser = (u: AppUserAccount) => {
    setSelectedUserId(u.id);
    setUsername(u.username);
    setPassword('');
    setFullName(u.fullName || '');
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setDesignation(u.designation || '');
    setDepartment(u.department || '');
    setRole(u.role);
    setIsActive(u.isActive);
    setInactivityTimeoutMinutes(
      typeof u.inactivityTimeoutMinutes === 'number' ? u.inactivityTimeoutMinutes : 15
    );
    setPermissions(
      u.isPrimaryAdmin || u.role === 'admin'
        ? { ...ALL_ADMIN_PERMISSIONS }
        : { ...DEFAULT_STAFF_PERMISSIONS, ...(u.permissions || {}) }
    );
    setStatus(null);
  };

  if (!isOpen) return null;

  const selectedExisting = users.find((u) => u.id === selectedUserId);
  const isNewMode = selectedUserId === 'NEW' || !selectedExisting;
  const isPrimaryTarget = Boolean(selectedExisting?.isPrimaryAdmin);

  const handleRoleChange = (nextRole: 'admin' | 'staff' | 'operator') => {
    setRole(nextRole);
    if (nextRole === 'admin') {
      setPermissions({ ...ALL_ADMIN_PERMISSIONS });
    } else if (isNewMode) {
      setPermissions({ ...DEFAULT_STAFF_PERMISSIONS });
    }
  };

  const handleTogglePermission = (key: UserPermissionKey) => {
    if (isPrimaryTarget) return;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      if (isNewMode) {
        const res = await authFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password,
            fullName: fullName.trim() || username.trim(),
            email: email.trim(),
            phone: phone.trim(),
            designation: designation.trim(),
            department: department.trim(),
            role,
            inactivityTimeoutMinutes: Math.max(0, Math.round(Number(inactivityTimeoutMinutes) || 0)),
            permissions,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.user) {
          setStatus({ type: 'error', text: data.error || 'Could not create user.' });
          return;
        }
        await loadUsers();
        populateFormForUser(data.user);
        setStatus({
          type: 'success',
          text: `Created new user "${data.user.username}" with assigned rights.`,
        });
      } else if (selectedExisting) {
        const res = await authFetch(`/api/users/${selectedExisting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            designation: designation.trim(),
            department: department.trim(),
            role,
            isActive,
            inactivityTimeoutMinutes: Math.max(0, Math.round(Number(inactivityTimeoutMinutes) || 0)),
            permissions,
            ...(password.trim() ? { newPassword: password.trim() } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success || !data.user) {
          setStatus({ type: 'error', text: data.error || 'Could not update user.' });
          return;
        }
        await loadUsers();
        populateFormForUser(data.user);
        setStatus({
          type: 'success',
          text: `Updated user "${data.user.username}" and portal rights.`,
        });
      }
    } catch {
      setStatus({ type: 'error', text: 'Network error while saving user account.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (target: AppUserAccount) => {
    if (target.isPrimaryAdmin) return;
    setIsSaving(true);
    setStatus(null);
    try {
      const res = await authFetch(`/api/users/${target.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setStatus({ type: 'error', text: data.error || 'Could not delete user.' });
        return;
      }
      await loadUsers();
      populateFormForNew();
      setStatus({ type: 'success', text: `Deleted user "${target.username}".` });
    } catch {
      setStatus({ type: 'error', text: 'Failed to delete user.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Admin User Creation &amp; Portal Rights Control
              </h3>
              <p className="text-xs text-slate-500">
                Create new school accounts, reset passwords, configure auto-logout times, and manage all 9 portal permissions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            aria-label="Close user management"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Existing User Directory */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 p-4 space-y-3 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Registered Accounts ({users.length})
              </span>
              <button
                type="button"
                onClick={populateFormForNew}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white inline-flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New User</span>
              </button>
            </div>

            {isLoading ? (
              <div className="text-xs text-slate-500 py-8 text-center">Loading users...</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const selected = selectedUserId === u.id;
                  const permCount =
                    u.isPrimaryAdmin || u.role === 'admin'
                      ? 9
                      : Object.values(u.permissions || {}).filter(Boolean).length;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => populateFormForUser(u)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs truncate">{u.fullName || u.username}</span>
                        <span
                          className={`text-[10px] font-semibold ${
                            selected ? 'text-emerald-300' : u.isActive ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {u.isPrimaryAdmin ? 'Primary Admin' : u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-1 flex items-center justify-between ${
                          selected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        <span className="font-mono">@{u.username}</span>
                        <span className="tabular-nums">
                          {permCount}/9 rights · {u.inactivityTimeoutMinutes || 0}m lock
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Create / Edit User Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isNewMode
                    ? 'Create New School User'
                    : `Editing Account: ${selectedExisting?.fullName} (@${selectedExisting?.username})`}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isPrimaryTarget
                    ? 'Primary Administrator retains permanent access to all features.'
                    : 'Configure credentials, role, profile details, auto-logout schedule, and individual rights.'}
                </p>
              </div>

              {!isNewMode && selectedExisting && !selectedExisting.isPrimaryAdmin && selectedExisting.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => handleDeleteUser(selectedExisting)}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete User</span>
                </button>
              )}
            </div>

            {status && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 ${
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  disabled={!isNewMode}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. accounts_staff"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {isNewMode ? 'Password * (min 6 chars)' : 'Reset Password (leave blank to keep)'}
                </label>
                <input
                  type="password"
                  required={isNewMode}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isNewMode ? 'Enter strong password' : 'Leave blank to keep existing'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Staff member full name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Portal Role</label>
                <select
                  value={role}
                  disabled={isPrimaryTarget}
                  onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'staff' | 'operator')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-semibold disabled:bg-slate-100"
                >
                  <option value="staff">Staff (Custom Rights)</option>
                  <option value="operator">WhatsApp &amp; PDF Operator</option>
                  <option value="admin">Administrator (Full Access)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono"
                />
              </div>
            </div>

            {/* Auto-Logout & Account Active Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Auto-Logout Idle Timer (Minutes)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={480}
                    value={inactivityTimeoutMinutes}
                    onChange={(e) => setInactivityTimeoutMinutes(Math.max(0, Number(e.target.value) || 0))}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono tabular-nums text-slate-900"
                  />
                  <span className="text-[11px] text-slate-500">
                    {inactivityTimeoutMinutes === 0 ? 'Disabled' : `Locks after ${inactivityTimeoutMinutes}m idle`}
                  </span>
                </div>
              </div>

              {!isNewMode && !isPrimaryTarget && (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-800">Account Access Status</div>
                    <div className="text-[11px] text-slate-500">
                      {isActive ? 'User can sign in to Kidzee Portal' : 'Account is suspended from sign-in'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg font-bold inline-flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    {isActive ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'Active' : 'Suspended'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Granular Rights Matrix */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Manage User Rights &amp; Module Permissions</span>
                </h5>
                {!isPrimaryTarget && role !== 'admin' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPermissions({ ...ALL_ADMIN_PERMISSIONS })}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPermissions({
                          viewStudents: true,
                          editStudents: false,
                          sendWhatsapp: false,
                          managePdf: false,
                          manageTemplates: false,
                          manageScheduler: false,
                          viewReports: false,
                          downloadInstallers: false,
                          manageUsers: false,
                        })
                      }
                      className="text-[11px] font-semibold text-slate-500 hover:underline"
                    >
                      Minimal View-Only
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PERMISSION_OPTIONS.map((opt) => {
                  const checked =
                    isPrimaryTarget || role === 'admin' ? true : Boolean(permissions[opt.key]);
                  return (
                    <label
                      key={opt.key}
                      className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        checked
                          ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      } ${isPrimaryTarget || role === 'admin' ? 'opacity-80 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPrimaryTarget || role === 'admin'}
                        onChange={() => handleTogglePermission(opt.key)}
                        className="mt-0.5 rounded text-emerald-600"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[11px] leading-tight">{opt.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSaving
                    ? 'Saving...'
                    : isNewMode
                    ? 'Create User & Assign Rights'
                    : 'Save User Changes & Rights'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
