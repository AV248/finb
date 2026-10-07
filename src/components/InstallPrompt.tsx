'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '@/lib/audio';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'finb-install-dismissed';

/**
 * Installability nudge. Chrome/Edge hand us a deferred prompt; iOS is told how
 * to add FINB to the home screen manually.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.localStorage.getItem(DISMISS_KEY) === '1') return undefined;
    if (window.matchMedia('(display-mode: standalone)').matches) return undefined;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 4200);
    };
    const onInstalled = () => {
      setVisible(false);
      window.localStorage.setItem(DISMISS_KEY, '1');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (ios) {
      const timer = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 5200);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onPrompt);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    sfx.good();
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      window.localStorage.setItem(DISMISS_KEY, '1');
    } else {
      dismiss();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 z-[120] w-[min(94vw,430px)] -translate-x-1/2 sm:bottom-28 lg:bottom-32"
        >
          <div className="glass neon-edge-lime flex items-start gap-3 p-3.5">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-2xl bg-[linear-gradient(140deg,#FF6B00,#00C853)] text-lg font-black text-navy-900">F</span>
            <div className="min-w-0 flex-1">
              <b className="text-[13px] text-cream-100">Install FINB as an app</b>
              <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                {iosHint
                  ? 'Tap Share → “Add to Home Screen” for a full-screen, offline-capable vault. No app store, no download size.'
                  : 'Full-screen, offline-capable, launched straight from your home screen — no app store involved.'}
              </p>
              <div className="mt-2 flex gap-2">
                {!iosHint && deferred && (
                  <button className="btn btn-lime !px-3 !py-1.5 text-[11px]" onClick={install}>
                    ⬇️ Install
                  </button>
                )}
                <button className="btn btn-ghost !px-3 !py-1.5 text-[11px]" onClick={dismiss}>
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
