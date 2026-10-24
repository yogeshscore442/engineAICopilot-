/// <reference types="@capacitor/core" />

import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

let isInitialized = false;

export async function initializeCapacitor() {
  if (isInitialized || !Capacitor.isNativePlatform()) {
    return;
  }

  isInitialized = true;

  try {
    await SplashScreen.hide();
  } catch {
    // SplashScreen might not be ready
  }

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0d9488' });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    // StatusBar might not be ready
  }

  try {
    await Keyboard.setResizeMode({ mode: 'body' as any });
  } catch {
    // Keyboard might not be ready
  }

  App.addListener('backButton', ({ canGoBack }) => {
    if (!canGoBack) {
      App.exitApp();
    } else {
      window.history.back();
    }
  });

  const networkStatus = await Network.getStatus();
  if (!networkStatus.connected) {
    console.warn('Network: offline');
  }

  Network.addListener('networkStatusChange', (status) => {
    console.log('Network status changed:', status);
    if (!status.connected) {
      showOfflineToast();
    } else {
      hideOfflineToast();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  });
}

let offlineToast: HTMLDivElement | null = null;

function showOfflineToast() {
  if (offlineToast) return;
  offlineToast = document.createElement('div');
  offlineToast.style.cssText = `
    position: fixed;
    bottom: calc(24px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    backdrop-filter: blur(8px);
    animation: slideUp 0.3s ease-out;
  `;
  offlineToast.textContent = 'No internet connection. Some features may be unavailable.';
  document.body.appendChild(offlineToast);

  const style = document.createElement('style');
  style.id = 'offline-toast-style';
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function hideOfflineToast() {
  if (offlineToast) {
    offlineToast.remove();
    offlineToast = null;
  }
  const style = document.getElementById('offline-toast-style');
  if (style) style.remove();
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): string {
  return Capacitor.getPlatform();
}