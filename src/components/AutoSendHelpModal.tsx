import React, { useState } from 'react';
import {
  X,
  Zap,
  Download,
  Check,
  Copy,
  ExternalLink,
  Laptop,
  Puzzle,
  FileCode,
  ShieldCheck,
  Server,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface AutoSendHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToServerGateway?: () => void;
}

export const AutoSendHelpModal: React.FC<AutoSendHelpModalProps> = ({
  isOpen,
  onClose,
  onSwitchToServerGateway,
}) => {
  const [activeTab, setActiveTab] = useState<'extension' | 'userscript' | 'bookmarklet' | 'server'>('extension');
  const [copiedBookmarklet, setCopiedBookmarklet] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const bookmarkletCode = `javascript:(function(){const b=document.querySelector('button[aria-label="Send"],span[data-icon="send"]')?.closest('button')||document.querySelector('[data-testid="send"]');if(b){b.click();setTimeout(()=>window.close(),1800);}else{alert('Send button not ready yet. Please wait for WhatsApp chat to load.');}})();`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopiedBookmarklet(true);
    setTimeout(() => setCopiedBookmarklet(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  WhatsApp Web Auto-Send & Auto-Close Setup
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  1-Click Automation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically click the green "Send" button on WhatsApp Web and close the tab after dispatch!
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

        {/* Tab Selector */}
        <div className="px-5 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('extension')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'extension'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>Chrome/Edge Extension</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('userscript')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'userscript'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Tampermonkey Script</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookmarklet')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'bookmarklet'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Bookmarklet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('server')}
            className={`py-2 px-3.5 rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'server'
                ? 'border-emerald-600 text-emerald-800 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Zero-Tab Server Mode</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: CHROME EXTENSION */}
          {activeTab === 'extension' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">
                    Kidzee Auto-Send & Auto-Close Extension
                  </h4>
                  <p className="text-emerald-800 text-xs mt-0.5">
                    Installs directly into Chrome, Edge, Brave, or Opera. Automatically detects the Send button, clicks it with zero delay, and closes the tab!
                  </p>
                </div>

                <a
                  href="/api/download/whatsapp-extension-zip"
                  download="kidzee-whatsapp-autosender-extension.zip"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0 active:scale-98"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Extension (.zip)</span>
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5 text-slate-700">
                <div className="font-bold text-slate-900 text-xs">Easy 3-Step Setup (Takes 30 seconds):</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>Download and extract the <strong>kidzee-whatsapp-autosender-extension.zip</strong> file.</li>
                  <li>In your browser, open <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">chrome://extensions</code> (or <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">edge://extensions</code>).</li>
                  <li>Turn on <strong>"Developer mode"</strong> in the top right, click <strong>"Load unpacked"</strong>, and select the extracted folder.</li>
                </ol>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Done! WhatsApp Web will now automatically click Send and close each parent tab!</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TAMPERMONKEY USERSCRIPT */}
          {activeTab === 'userscript' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Tampermonkey / Violentmonkey Userscript
                  </h4>
                  <p className="text-slate-300 text-xs mt-0.5">
                    If you already use Tampermonkey, install our verified script in 1 click.
                  </p>
                </div>

                <a
                  href="/assets/kidzee-whatsapp-autosender.user.js"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>1-Click Install Script</span>
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-slate-900 text-xs">How it works:</div>
                <p className="text-slate-600 text-xs">
                  Whenever EduNotify opens a WhatsApp Web notice, the Tampermonkey script watches for the green send button. As soon as the contact's chat and text load, it clicks <strong>Send</strong>, waits 2 seconds for transmission, and executes <code>window.close()</code>!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: BOOKMARKLET */}
          {activeTab === 'bookmarklet' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <h4 className="font-bold text-amber-950 text-sm">
                  1-Click Instant Bookmarklet (No Extension Required)
                </h4>
                <p className="text-amber-900 text-xs">
                  Drag the button below to your browser Bookmarks Bar. While on WhatsApp Web, clicking the bookmark clicks Send and closes the tab!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={bookmarkletCode}
                  onClick={(e) => e.preventDefault()}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-md cursor-grab active:cursor-grabbing inline-flex items-center gap-2"
                  title="Drag this button to your Bookmarks Toolbar"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Drag Me: ⚡ Send & Close WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyBookmarklet}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {copiedBookmarklet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBookmarklet ? 'Copied code!' : 'Copy Bookmarklet Code'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: ZERO-TAB SERVER GATEWAY */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-900 text-emerald-50 rounded-2xl space-y-2">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  Port 3000 Server Mode: Zero Tabs Ever Opened!
                </h4>
                <p className="text-emerald-200 text-xs">
                  Did you know? Kidzee School includes a background WhatsApp Web Login Server on Port 3000! Once linked with your school phone via QR code or Pairing Code, the server dispatches directly in the background without opening ANY browser tabs at all.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <div className="font-bold text-slate-900">Switch to Port 3000 Server Gateway</div>
                  <div className="text-[11px] text-slate-500">100% automated background sending, zero tabs, zero clicks</div>
                </div>

                {onSwitchToServerGateway && (
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToServerGateway();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <span>Open Server Gateway</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>EduNotify Official Kidzee School Automation Suite</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
