import React from 'react';
import {
  FileSpreadsheet,
  MessageSquare,
  Clock,
  BarChart3,
  Send,
  School,
  DollarSign,
  Users,
  Server,
  Download,
  FileText,
  LogOut,
  ShieldCheck,
  UserCircle2,
  UserCog,
} from 'lucide-react';
import { formatCurrency } from '../utils/templateEngine';
import { AdminUserInfo, hasUserPermission } from '../utils/authClient';

export type NavTab =
  | 'students'
  | 'whatsapp'
  | 'whatsapp-server'
  | 'pdf-studio'
  | 'templates'
  | 'scheduler'
  | 'reports';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  totalStudents: number;
  totalDuesOwed: number;
  overdueDuesOwed: number;
  activeAutomationsCount: number;
  onOpenQuickBatchModal: () => void;
  onOpenDirectMessageModal?: () => void;
  onOpenInstallationModal?: () => void;
  adminUser?: AdminUserInfo | null;
  adminUsername?: string;
  secondsUntilAutoLogout?: number | null;
  onOpenProfileModal?: () => void;
  onOpenUserManagementModal?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  totalStudents,
  totalDuesOwed,
  overdueDuesOwed,
  activeAutomationsCount,
  onOpenQuickBatchModal,
  onOpenDirectMessageModal,
  onOpenInstallationModal,
  adminUser,
  adminUsername,
  secondsUntilAutoLogout,
  onOpenProfileModal,
  onOpenUserManagementModal,
  onLogout,
}) => {
  const canViewStudents = hasUserPermission(adminUser, 'viewStudents');
  const canSendWhatsapp = hasUserPermission(adminUser, 'sendWhatsapp');
  const canManagePdf = hasUserPermission(adminUser, 'managePdf');
  const canManageTemplates = hasUserPermission(adminUser, 'manageTemplates');
  const canManageScheduler = hasUserPermission(adminUser, 'manageScheduler');
  const canViewReports = hasUserPermission(adminUser, 'viewReports');
  const canDownloadInstallers = hasUserPermission(adminUser, 'downloadInstallers');
  const canManageUsers = hasUserPermission(adminUser, 'manageUsers');

  const displayName = adminUser?.fullName || adminUser?.username || adminUsername || 'Admin';
  const idleMinutesLeft =
    typeof secondsUntilAutoLogout === 'number' && secondsUntilAutoLogout > 0
      ? Math.ceil(secondsUntilAutoLogout / 60)
      : null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      {/* Top tier brand & school metrics bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-emerald-700 via-teal-600 to-emerald-800 flex items-center justify-center text-white shadow-xs shrink-0">
            <School className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
                Kidzee School
              </h1>
              <span className="text-[11px] font-semibold text-emerald-700 hidden sm:inline whitespace-nowrap">
                Official School Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Parent Notification, Dues Tracking &amp; WhatsApp Web Suite
            </p>
          </div>
        </div>

        {/* Live System Counter & User Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Total Dues Indicator */}
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center gap-2 text-xs">
            <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-[10px] text-amber-800/80 font-semibold uppercase">Total Dues Owed</div>
              <div className="font-mono font-bold text-amber-900 tabular-nums whitespace-nowrap">
                {formatCurrency(totalDuesOwed)}
                {overdueDuesOwed > 0 && (
                  <span className="text-[10px] text-rose-600 font-semibold ml-1">
                    ({formatCurrency(overdueDuesOwed)} overdue)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Enrolled Students */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 hidden xl:flex items-center gap-2 text-xs">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Excel Cohort</div>
              <div className="font-mono font-bold text-slate-800 tabular-nums whitespace-nowrap">
                {totalStudents} Students
              </div>
            </div>
          </div>

          {/* Download Installer & Package Button */}
          {onOpenInstallationModal && canDownloadInstallers && (
            <button
              type="button"
              onClick={onOpenInstallationModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs transition-all whitespace-nowrap shrink-0"
              title="Download 1-click Windows installer (install.bat), Mac/Linux scripts, or complete offline ZIP package"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer</span>
            </button>
          )}

          {/* Direct Message Kidzee School Button */}
          {onOpenDirectMessageModal && canSendWhatsapp && (
            <button
              type="button"
              onClick={onOpenDirectMessageModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all whitespace-nowrap shrink-0"
              title="Send direct text or WhatsApp message to any phone number using Kidzee School sender ID"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Direct Msg</span>
            </button>
          )}

          {/* Quick Dispatch Action Button */}
          {canSendWhatsapp && (
            <button
              type="button"
              onClick={onOpenQuickBatchModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-all whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Batch Send</span>
            </button>
          )}

          {/* Manage Users & Rights Button (Admin Only) */}
          {onOpenUserManagementModal && canManageUsers && (
            <button
              type="button"
              onClick={onOpenUserManagementModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 transition-all whitespace-nowrap shrink-0"
              title="Create new users and manage all user rights"
            >
              <UserCog className="w-3.5 h-3.5 text-indigo-700" />
              <span>Users &amp; Rights</span>
            </button>
          )}

          {/* User Profile & Auto-Logout Settings Button */}
          {onOpenProfileModal && (
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-all whitespace-nowrap shrink-0"
              title="View your full User Profile, active rights, and customize Automatic Logout schedule"
            >
              <UserCircle2 className="w-4 h-4 text-emerald-700" />
              <span className="max-w-[110px] truncate">{displayName}</span>
              {idleMinutesLeft !== null && (
                <span className="text-[10px] font-mono text-slate-500 tabular-nums hidden md:inline">
                  · {idleMinutesLeft}m
                </span>
              )}
            </button>
          )}

          {/* Admin Session Lock / Logout */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-800 transition-all whitespace-nowrap shrink-0"
              title={`Signed in as ${adminUser?.username || adminUsername || 'Admin'} — Click to Lock & Sign Out`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 hidden sm:inline" />
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Lock</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation tabs (filtered by user permissions) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100 flex items-center gap-1 overflow-x-auto text-xs font-medium">
        {canViewStudents && (
          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'students'
                ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Data &amp; Students</span>
            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
              ({totalStudents})
            </span>
          </button>
        )}

        {canSendWhatsapp && (
          <button
            type="button"
            onClick={() => onSelectTab('whatsapp')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'whatsapp'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Web Sender</span>
          </button>
        )}

        {canSendWhatsapp && (
          <button
            type="button"
            onClick={() => onSelectTab('whatsapp-server')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'whatsapp-server'
                ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Login Server</span>
          </button>
        )}

        {canManagePdf && (
          <button
            type="button"
            onClick={() => onSelectTab('pdf-studio')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'pdf-studio'
                ? 'border-amber-600 text-amber-800 font-bold bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-600" />
            <span>Pending Dues PDF</span>
          </button>
        )}

        {canManageTemplates && (
          <button
            type="button"
            onClick={() => onSelectTab('templates')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'templates'
                ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Designer Templates</span>
          </button>
        )}

        {canManageScheduler && (
          <button
            type="button"
            onClick={() => onSelectTab('scheduler')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'scheduler'
                ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Automated Scheduling</span>
            <span className="text-[11px] font-mono text-indigo-700 tabular-nums">
              ({activeAutomationsCount})
            </span>
          </button>
        )}

        {canViewReports && (
          <button
            type="button"
            onClick={() => onSelectTab('reports')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'reports'
                ? 'border-blue-600 text-blue-700 font-bold bg-blue-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reporting &amp; Dues Audit</span>
          </button>
        )}
      </div>
    </header>
  );
};
