import { useState, useEffect, useCallback } from 'react';

/**
 * Hook principal pour gérer les fonctionnalités PWA
 * - Installation de l'app
 * - Détection online/offline
 * - Mise à jour du Service Worker
 * - État d'installation
 */
export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [swRegistration, setSWRegistration] = useState(null);

  // Détection du statut online/offline
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      console.log('[PWA] App is back online');
    }

    function handleOffline() {
      setIsOnline(false);
      console.log('[PWA] App is now offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Détection de l'événement beforeinstallprompt
  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      console.log('[PWA] beforeinstallprompt triggered');
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    }

    function handleAppInstalled() {
      console.log('[PWA] App installed successfully');
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Vérifier si l'app est déjà installée
  useEffect(() => {
    // Vérification basique pour PWA installée
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSInstalled = window.navigator.standalone === true;

    if (isStandalone || isIOSInstalled) {
      setIsInstalled(true);
      console.log('[PWA] App is running in standalone mode');
    }
  }, []);

  // Enregistrement du Service Worker et détection des mises à jour
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] SW registered:', registration);
          setSWRegistration(registration);

          // Vérifier les mises à jour du SW
          registration.addEventListener('updatefound', () => {
            console.log('[PWA] SW update found');
            const newWorker = registration.installing;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] SW update available');
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch((error) => {
          console.error('[PWA] SW registration failed:', error);
        });

      // Écouter les messages du SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('[PWA] Message from SW:', event.data);
      });
    }
  }, []);

  // Fonction pour installer l'app
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No install prompt available');
      return false;
    }

    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      console.log('[PWA] Install prompt result:', result.outcome);

      if (result.outcome === 'accepted') {
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PWA] Install prompt error:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Fonction pour appliquer la mise à jour du SW
  const applyUpdate = useCallback(() => {
    if (!swRegistration || !swRegistration.waiting) {
      console.warn('[PWA] No SW update available');
      return;
    }

    // Dire au SW en attente de prendre le contrôle
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Rafraîchir la page pour charger la nouvelle version
    window.location.reload();
  }, [swRegistration]);

  // Fonction pour partager l'app
  const shareApp = useCallback(async () => {
    const shareData = {
      title: 'TechTemp IoT',
      text: 'Surveillez vos températures en temps réel !',
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        console.log('[PWA] App shared successfully');
        return true;
      } catch (error) {
        console.log('[PWA] Share cancelled or failed:', error);
        return false;
      }
    } else {
      // Fallback: copier l'URL dans le presse-papier
      try {
        await navigator.clipboard.writeText(window.location.origin);
        console.log('[PWA] URL copied to clipboard');
        return true;
      } catch (error) {
        console.error('[PWA] Failed to copy URL:', error);
        return false;
      }
    }
  }, []);

  return {
    // États
    isOnline,
    isInstallable,
    isInstalled,
    updateAvailable,

    // Actions
    promptInstall,
    applyUpdate,
    shareApp,

    // Données
    swRegistration
  };
}
