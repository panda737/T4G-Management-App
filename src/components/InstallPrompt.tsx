import { useEffect, useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';

// The Chrome/Android event that lets us trigger the native install dialog.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 't4g-install-dismissed-at';
const DISMISS_DAYS = 14; // re-offer after two weeks if they closed it

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this when launched from the home screen
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  const iDevice = /iphone|ipad|ipod/i.test(ua);
  // iPadOS 13+ reports as a Mac — detect it via touch support.
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iDevice || iPadOs;
}

function recentlyDismissed(): boolean {
  const at = localStorage.getItem(DISMISS_KEY);
  if (!at) return false;
  const ageMs = Date.now() - Number(at);
  return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; we show our own
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    const onInstalled = () => {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS never fires beforeinstallprompt — show our own hint with instructions.
    if (isIos()) setVisible(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    setVisible(false);
    setShowIosHelp(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  }

  async function handleInstall() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      void choice;
    } else if (isIos()) {
      setShowIosHelp(true);
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Install banner */}
      <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pointer-events-none">
        <div className="pointer-events-auto mx-auto max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-3 flex items-center gap-3">
          <img src="/icon-192.png" alt="Tech4Green" className="w-11 h-11 rounded-xl flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900">Install Tech4Green</p>
            <p className="text-xs text-gray-500 leading-snug">Add it to your home screen for quick, app-like access.</p>
          </div>
          <button
            onClick={handleInstall}
            className="flex-shrink-0 inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors"
          >
            <Download size={15} /> Install
          </button>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex-shrink-0 p-1.5 -mr-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS instructions sheet */}
      {showIosHelp && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowIosHelp(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add to Home Screen</h2>
              <button onClick={() => setShowIosHelp(false)} aria-label="Close" className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600">On iPhone/iPad, install from the Safari Share menu:</p>
            <ol className="space-y-3">
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center text-xs">1</span>
                Tap the <Share size={16} className="inline text-blue-600" /> <span className="font-medium">Share</span> button in the toolbar.
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center text-xs">2</span>
                Choose <Plus size={16} className="inline text-gray-700" /> <span className="font-medium">Add to Home Screen</span>.
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-semibold flex items-center justify-center text-xs">3</span>
                Tap <span className="font-medium">Add</span> — the T4G icon appears on your home screen.
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
