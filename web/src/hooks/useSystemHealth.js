import { useState, useCallback, useRef } from 'react';
import { useToast } from '@chakra-ui/react';
import { API_ENDPOINTS } from '../utils/systemMonitoringHelpers';

/**
 * Hook personnalisé pour gérer l'état de santé du système
 * Centralise la logique de récupération des données avec fallback intelligent
 */
export const useSystemHealth = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useRealTimeForDevices, setUseRealTimeForDevices] = useState(true);
  const [realTimeAvailable, setRealTimeAvailable] = useState(true);
  const [fallbackToastShown, setFallbackToastShown] = useState(false);
  const [testingRealTime, setTestingRealTime] = useState(false);

  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  const toast = useToast();

  const fetchSystemHealth = useCallback(async (forceRealTime = null, callSource = 'unknown') => {
    // Protection contre les appels multiples
    if (fetchInProgress.current) {
      console.log(`⏸️ fetchSystemHealth déjà en cours (useRef), skip call from: ${callSource}`);
      return;
    }

    // Protection temporelle
    const now = Date.now();
    if (now - lastFetchTime.current < 500) {
      console.log(`⏸️ fetchSystemHealth trop rapide (${now - lastFetchTime.current}ms), skip call from: ${callSource}`);
      return;
    }

    console.log(`🚀 Début fetchSystemHealth from: ${callSource}`);
    fetchInProgress.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    setError(null);

    const useRealTime = forceRealTime !== null ? forceRealTime : useRealTimeForDevices;

    try {
      if (useRealTime) {
        // Mode temps réel avec timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 2s')), 2000)
        );

        const fetchPromise = fetch(API_ENDPOINTS.LOCAL_HEALTH);
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Temps réel disponible:', data);
        setSystemHealth(data);
        setRealTimeAvailable(true);
        setFallbackToastShown(false);

      } else {
        throw new Error('Mode Firebase demandé');
      }
    } catch (err) {
      // Diagnostic détaillé de l'erreur
      let diagnosticMessage = 'Erreur inconnue';
      if (err.message.includes('Timeout')) {
        diagnosticMessage = `Serveur Raspberry Pi (192.168.0.42:8080) ne répond pas - Timeout après 2s`;
      } else if (err.message.includes('Failed to fetch')) {
        diagnosticMessage = `Impossible de joindre le serveur Raspberry Pi (192.168.0.42:8080) - Vérifiez que le serveur est démarré`;
      } else {
        diagnosticMessage = `Erreur serveur Raspberry Pi: ${err.message}`;
      }

      console.warn('⚠️ Temps réel indisponible, fallback vers Firebase:', diagnosticMessage);

      try {
        const firebaseResponse = await fetch(API_ENDPOINTS.FIREBASE_HEALTH, { timeout: 5000 });

        if (firebaseResponse.ok) {
          const firebaseData = await firebaseResponse.json();
          console.log('✅ Fallback Firebase réussi');
          setSystemHealth(firebaseData);
          setUseRealTimeForDevices(false);
          setRealTimeAvailable(false);

          if (!fallbackToastShown) {
            setFallbackToastShown(true);
            toast({
              title: "🔄 Basculement automatique vers Firebase",
              description: diagnosticMessage,
              status: "warning",
              duration: 5000,
              isClosable: true,
            });
          }

          // Test en arrière-plan
          setTimeout(async () => {
            try {
              const testResponse = await fetch(API_ENDPOINTS.LOCAL_HEALTH, { timeout: 3000 });
              if (testResponse.ok) {
                setRealTimeAvailable(true);
                setFallbackToastShown(false);
                toast({
                  title: "Temps réel disponible",
                  description: "Le serveur local est maintenant accessible",
                  status: "success",
                  duration: 4000,
                  isClosable: true,
                });
              }
            } catch (testErr) {
              console.log('⏳ Temps réel toujours indisponible...');
            }
          }, 10000);

        } else {
          throw new Error('Firebase aussi indisponible');
        }
      } catch (fallbackErr) {
        console.error('❌ Fallback Firebase échoué:', fallbackErr.message);
        setError('Impossible de se connecter aux APIs');
        setSystemHealth(null);

        toast({
          title: "Connexion impossible",
          description: "Ni le temps réel ni Firebase ne sont disponibles",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [useRealTimeForDevices, fallbackToastShown, toast]);

  const refreshCurrentMode = useCallback(async () => {
    console.log(`🔄 Actualisation simple en mode: ${useRealTimeForDevices ? 'temps réel' : 'Firebase'}`);

    if (useRealTimeForDevices) {
      fetchSystemHealth(true, 'refresh-current-mode');
    } else {
      fetchSystemHealth(false, 'refresh-firebase-only');
    }
  }, [useRealTimeForDevices, fetchSystemHealth]);

  const testRealTimeConnection = useCallback(async () => {
    setTestingRealTime(true);

    try {
      console.log('🔍 Test de connexion temps réel...');

      // Test avec timeout plus long pour diagnostic
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(API_ENDPOINTS.LOCAL_HEALTH, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ Temps réel disponible !');
        setRealTimeAvailable(true);
        setFallbackToastShown(false);

        toast({
          title: "✅ Connexion temps réel réussie",
          description: `Serveur Raspberry Pi (192.168.0.42:8080) accessible - Status: ${response.status}`,
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      } else {
        throw new Error(`Serveur répond mais erreur HTTP ${response.status}`);
      }
    } catch (err) {
      console.log('⏳ Temps réel toujours indisponible:', err.message);
      setRealTimeAvailable(false);

      let diagnosticDetail = 'Erreur inconnue';
      if (err.name === 'AbortError') {
        diagnosticDetail = 'Timeout après 5s - Le serveur ne répond pas';
      } else if (err.message.includes('Failed to fetch')) {
        diagnosticDetail = 'Impossible de joindre 192.168.0.42:8080 - Serveur probablement arrêté';
      } else {
        diagnosticDetail = err.message;
      }

      toast({
        title: "❌ Diagnostic réseau",
        description: `Test échoué: ${diagnosticDetail}`,
        status: "warning",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setTestingRealTime(false);
    }
  }, [toast]);

  const handleToggleDevicesRealTime = useCallback(() => {
    const newRealTimeMode = !useRealTimeForDevices;

    if (newRealTimeMode) {
      toast({
        title: "Tentative de connexion temps réel...",
        description: "Vérification de la disponibilité du serveur local",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }

    setUseRealTimeForDevices(newRealTimeMode);
    fetchSystemHealth(newRealTimeMode, 'mode-change');
  }, [useRealTimeForDevices, toast, fetchSystemHealth]);

  return {
    // État
    systemHealth,
    loading,
    error,
    useRealTimeForDevices,
    realTimeAvailable,
    testingRealTime,

    // Actions
    fetchSystemHealth,
    refreshCurrentMode,
    testRealTimeConnection,
    handleToggleDevicesRealTime,

    // Setters pour compatibilité
    setUseRealTimeForDevices,
    setRealTimeAvailable,
    setFallbackToastShown
  };
};
