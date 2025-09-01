/**
 * @file useDevice.js
 * @description React Hook pour accéder aux données d'un appareil spécifique via le DataContext
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { DataContextProvider } from './DataContextProvider';

/**
 * Hook pour accéder à un appareil spécifique
 * @param {string} deviceId - ID de l'appareil
 * @param {Object} options - Options de configuration
 * @param {boolean} [options.autoRefresh=false] - Rafraîchir automatiquement les données
 * @param {number} [options.refreshInterval=60000] - Intervalle de rafraîchissement (ms)
 * @param {boolean} [options.includeReadings=false] - Inclure les lectures de l'appareil
 * @returns {Object} État et méthodes pour interagir avec l'appareil
 */
export function useDevice(deviceId, options = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 60000,
    includeReadings = false
  } = options;

  const { dataContext } = useContext(DataContextProvider.context);
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Charge un appareil depuis le contexte
   */
  const loadDevice = useCallback(async (forceRefresh = false) => {
    if (!deviceId) {
      setError('Device ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (includeReadings) {
        // Récupère l'appareil avec ses lectures
        const result = forceRefresh
          ? await Promise.all([
            dataContext.refreshDevice(deviceId),
            dataContext.refreshDeviceData(deviceId)
          ]).then(([device, readings]) => ({ device, readings }))
          : await dataContext.getDeviceWithReadings(deviceId);

        setDevice(result.device);
        setReadings(result.readings);
      } else {
        // Récupère seulement l'appareil
        const result = forceRefresh
          ? await dataContext.refreshDevice(deviceId)
          : await dataContext.getDevice(deviceId);

        setDevice(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dataContext, deviceId, includeReadings]);

  /**
   * Rafraîchit les données de l'appareil
   */
  const refreshDevice = useCallback(() => {
    return loadDevice(true);
  }, [loadDevice]);

  // Chargement initial
  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  // Configuration du rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshDevice();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshDevice]);

  return {
    device,
    readings: includeReadings ? readings : undefined,
    loading,
    error,
    refresh: refreshDevice
  };
}
