import React, { useState, useEffect } from 'react';
import {
  Download,
  Terminal,
  FolderArchive,
  Monitor,
  Check,
  Copy,
  ExternalLink,
  X,
  FileCode,
  ShieldCheck,
  Play,
  ArrowRight,
  Sparkles,
  Github,
  Laptop,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { downloadProtectedFile } from '../utils/authClient';

interface InstallationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallationModal: React.FC<InstallationModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'mac-linux' | 'full-zip' | 'github' | 'pwa'>('windows');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstalledSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleTriggerPwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccess(true);
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    } else {
      alert('To install as an app:\n\n1. Look at the top right of your browser URL bar for the "Install" icon (desktop monitor with down arrow).\n2. Or click the 3 dots menu > "Install Kidzee School".');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Installation & Download Center
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Kidzee School v1.0
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Download 1-click installation files, offline package, launcher scripts, or install as desktop app.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 bg-slate-50/60 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('windows')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'windows'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows (1-Click)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('full-zip')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'full-zip'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-amber-500" />
            <span>Full Package (.zip)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mac-linux')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'mac-linux'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>macOS & Linux</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'github'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pwa')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'pwa'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 text-blue-600" />
            <span>Install as App (PWA)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* TAB 1: WINDOWS 1-CLICK */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Windows 1-Click Automated Setup
                  </h4>
                  <p className="text-emerald-800 mt-0.5 text-xs">
                    Download <strong>install.bat</strong> and <strong>start.bat</strong> into your project folder. Double-click <code>install.bat</code> to verify Node.js, install all packages, and launch Kidzee School in your browser automatically!
                  </p>
                </div>
              </div>

              {/* 1-Click Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => downloadProtectedFile('/api/download/install-bat', 'install-kidzee-school.bat')}
                  className="text-left p-4 rounded-2xl border-2 border-emerald-500/80 bg-white hover:bg-emerald-50/40 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 group-hover:scale-105 transition-transform">
                      <Download className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      Primary Setup
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>Download install.bat</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Checks Node runtime, runs npm install, sets up .env & .data, creates launcher
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => downloadProtectedFile('/api/download/start-bat', 'start-kidzee-school.bat')}
                  className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="p-2 rounded-xl bg-blue-100 text-blue-800 group-hover:scale-105 transition-transform">
                      <Play className="w-4 h-4 fill-current" />
                    </span>
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Daily Launcher
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>Download start.bat</span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      1-Click launcher to start server on Port 3000 and auto-open http://localhost:3000
                    </p>
                  </div>
                </button>
              </div>

              {/* Steps Guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="font-bold text-slate-900 text-xs">How to use on Windows:</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 text-xs">
                  <li>Place <code>install.bat</code> and <code>start.bat</code> in the extracted project folder.</li>
                  <li>Double-click <strong>install.bat</strong> (it checks Node.js and installs dependencies).</li>
                  <li>Double-click <strong>start.bat</strong> whenever you want to open Kidzee School.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: FULL PACKAGE ZIP */}
          {activeTab === 'full-zip' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl shrink-0">
                    <FolderArchive className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Complete Offline Installation Package (.zip)
                    </h4>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Contains the entire source code, install.bat, start.bat, install.sh, sample data, and server daemon ready to extract anywhere.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => downloadProtectedFile('/api/download/package-zip', 'kidzee-school-suite-installer.zip')}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full ZIP</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Includes</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">Full Source Code</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Installers</span>
                  <span className="font-bold text-slate-800 text-xs mt-0.5 block">Windows & Mac/Linux Scripts</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Persistence</span>
                  <span className="font-bold text-emerald-700 text-xs mt-0.5 block">Auto-Saving .data/ storage</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAC & LINUX */}
          {activeTab === 'mac-linux' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    macOS & Linux Terminal Commands
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('chmod +x install.sh start.sh && ./install.sh', 'terminal')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1"
                  >
                    {copiedText === 'terminal' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === 'terminal' ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>
                <div className="font-mono text-xs text-emerald-400 bg-slate-950 p-3 rounded-xl overflow-x-auto space-y-1">
                  <div>chmod +x install.sh start.sh</div>
                  <div>./install.sh</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => downloadProtectedFile('/api/download/install-sh', 'install-kidzee-school.sh')}
                  className="text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-xs flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-900">Download install.sh</div>
                    <div className="text-[11px] text-slate-500">Automated setup shell script</div>
                  </div>
                  <Download className="w-4 h-4 text-emerald-600" />
                </button>

                <button
                  type="button"
                  onClick={() => downloadProtectedFile('/api/download/start-sh', 'start-kidzee-school.sh')}
                  className="text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-xs flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-slate-900">Download start.sh</div>
                    <div className="text-[11px] text-slate-500">1-Click server launcher</div>
                  </div>
                  <Download className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB REPO SETUP */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-2">
                    <Github className="w-4 h-4 text-slate-800" />
                    Upload & Run from GitHub Repository
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadProtectedFile('/api/download/setup-git-bat', 'setup-git.bat')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>setup-git.bat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadProtectedFile('/api/download/setup-git-sh', 'setup-git.sh')}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 text-white hover:bg-slate-900 inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>setup-git.sh</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 text-slate-200 p-3.5 rounded-xl font-mono text-xs space-y-1 relative group">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git\ngit push -u origin main',
                        'git'
                      )
                    }
                    className="absolute right-3 top-3 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded text-[10px] flex items-center gap-1"
                  >
                    {copiedText === 'git' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === 'git' ? 'Copied' : 'Copy'}</span>
                  </button>
                  <div className="text-slate-500"># Link to your GitHub repository and push main branch</div>
                  <div className="text-emerald-400">git remote add origin https://github.com/&lt;USERNAME&gt;/&lt;REPO&gt;.git</div>
                  <div className="text-emerald-400">git push -u origin main</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PWA BROWSER APP */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-600 text-white rounded-2xl shrink-0">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Install as Desktop or Mobile Web App
                    </h4>
                    <p className="text-slate-600 text-xs mt-0.5">
                      Runs in its own window without browser tabs, works like native desktop software, and launches from your desktop or home screen!
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerPwaInstall}
                  className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>{installedSuccess ? 'App Installed!' : 'Install Kidzee School App'}</span>
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-slate-700 text-xs">
                <div className="font-bold text-slate-900">How to install in your browser:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-900">Google Chrome / Microsoft Edge</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click the <strong>Install</strong> icon on the right side of the URL address bar, or click browser menu (3 dots) &gt; "Install Kidzee School".
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200/80">
                    <div className="font-bold text-slate-900">iPhone / iPad (Safari)</div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tap the <strong>Share</strong> button at the bottom of Safari, then tap <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Zero cloud dependencies • 100% Free & Open-Source</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadProtectedFile('/api/download/package-zip', 'kidzee-school-suite-installer.zip')}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full Package (.zip)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
