import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api.endpoints';
import { useDevicesData, useDeviceAlerts } from './useDevicesData';

/**
 * Hook global pour calculer les alertes à afficher dans la navigation
 * @returns {Object} Nombre d'alertes par catégorie
 */
export const useGlobalAlerts = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [useRealTime] = useState(true); // Par défaut temps réel pour les alertes

  // Traitement des données
  const devicesData = useDevicesData(systemHealth?.devices, useRealTime);
  const deviceAlerts = useDeviceAlerts(devicesData.devices);

  // Séparation des alertes
  const environmentalAlerts = deviceAlerts.filter(alert =>
    alert.type?.includes('Température') ||
    alert.type?.includes('Humidité')
  );

  const technicalAlerts = [
    ...systemHealth?.alerts || [],
    ...deviceAlerts.filter(alert =>
      alert.type?.includes('Offline') ||
      alert.type?.includes('Données') ||
      alert.type?.includes('Système')
    )
  ];

  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LOCAL_HEALTH);
      if (!response.ok) {
        // Fallback vers Firebase si local ne fonctionne pas
        const fbResponse = await fetch(API_ENDPOINTS.FIREBASE_HEALTH);
        if (fbResponse.ok) {
          const data = await fbResponse.json();
          setSystemHealth(data);
        }
        return;
      }
      const data = await response.json();
      setSystemHealth(data);
    } catch (err) {
      console.warn('Erreur lors de la récupération des alertes:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchSystemHealth();

    // Actualiser les alertes toutes les 30 secondes
    const interval = setInterval(fetchSystemHealth, 30000);

    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  return {
    environmentalAlerts: environmentalAlerts.length,
    technicalAlerts: technicalAlerts.length,
    totalAlerts: environmentalAlerts.length + technicalAlerts.length,
    isLoading: !systemHealth
  };
};
