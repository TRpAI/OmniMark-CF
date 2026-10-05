import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isWechat, setIsWechat] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Detect standalone mode (already installed as PWA or running inside home screen app container)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(Boolean(isStandalone));

    // 2. User Agent checks
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobileDevice = /mobile|android|iphone|ipad|ipod|windows phone/i.test(ua) || window.innerWidth < 768;
    const isWechatBrowser = /micromessenger/i.test(ua);

    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);
    setIsWechat(isWechatBrowser);

    // 3. Listen for browser native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setShowModal(false);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('PWA install prompt error:', err);
      }
    }
    
    // If no native prompt (e.g. iOS Safari, WeChat, or already captured), show the guided install modal
    setShowModal(true);
    return false;
  };

  const openInstallGuide = () => {
    if (deferredPrompt) {
      install();
    } else {
      setShowModal(true);
    }
  };

  return {
    isInstallable: Boolean(deferredPrompt) || isIOS || isMobile,
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isMobile,
    isWechat,
    showModal,
    setShowModal,
    install,
    openInstallGuide,
  };
}
