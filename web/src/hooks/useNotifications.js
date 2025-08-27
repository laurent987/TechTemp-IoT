import { useState, useEffect, useCallback } from 'react';

/**
 * Hook pour gérer les notifications push
 * - Demande de permissions
 * - Abonnement push
 * - Gestion des erreurs
 */
export function useNotifications() {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  // Vérifier le support des notifications
  useEffect(() => {
    const supported = 'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    setIsSupported(supported);

    if (!supported) {
      console.warn('[Notifications] Push notifications not supported');
    }
  }, []);

  // Vérifier l'abonnement existant au chargement
  useEffect(() => {
    if (!isSupported) return;

    async function checkExistingSubscription() {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existingSubscription = await registration.pushManager.getSubscription();

        if (existingSubscription) {
          setSubscription(existingSubscription);
          setIsSubscribed(true);
          console.log('[Notifications] Existing subscription found');
        }
      } catch (error) {
        console.error('[Notifications] Error checking subscription:', error);
      }
    }

    checkExistingSubscription();
  }, [isSupported]);

  // Demander la permission (non-bloquant)
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Notifications not supported');
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      console.log('[Notifications] Permission result:', result);
      return result === 'granted';
    } catch (error) {
      console.error('[Notifications] Permission request failed:', error);
      throw error;
    }
  }, [permission, isSupported]);

  // S'abonner aux notifications push
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications not supported');
    }

    if (permission !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      // Clé VAPID publique (à remplacer par la vraie)
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY_HERE';

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      setSubscription(pushSubscription);
      setIsSubscribed(true);

      // Envoyer l'abonnement au serveur
      await sendSubscriptionToServer(pushSubscription);

      console.log('[Notifications] Successfully subscribed:', pushSubscription);
      return pushSubscription;
    } catch (error) {
      console.error('[Notifications] Subscription failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [permission, isSupported]);

  // Se désabonner
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      return;
    }

    setLoading(true);

    try {
      await subscription.unsubscribe();
      await removeSubscriptionFromServer(subscription);

      setSubscription(null);
      setIsSubscribed(false);

      console.log('[Notifications] Successfully unsubscribed');
    } catch (error) {
      console.error('[Notifications] Unsubscribe failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  // Envoyer une notification de test
  const sendTestNotification = useCallback(async () => {
    if (!isSubscribed || !subscription) {
      throw new Error('Not subscribed to notifications');
    }

    try {
      // Appeler votre endpoint pour envoyer une notification test
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          message: 'Test notification from TechTemp!'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      console.log('[Notifications] Test notification sent');
      return true;
    } catch (error) {
      console.error('[Notifications] Test notification failed:', error);
      throw error;
    }
  }, [isSubscribed, subscription]);

  return {
    // États
    permission,
    isSubscribed,
    isSupported,
    loading,
    subscription,

    // Actions
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  };
}

// Utilitaires

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function sendSubscriptionToServer(subscription) {
  // TODO: Remplacer par votre endpoint
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to send subscription to server');
  }
}

async function removeSubscriptionFromServer(subscription) {
  // TODO: Remplacer par votre endpoint
  const response = await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    throw new Error('Failed to remove subscription from server');
  }
}
