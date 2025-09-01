/**
 * @file useDevices.js
 * @description React Hook pour accéder aux données des appareils via le DataContext
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { DataContextProvider } from './DataContextProvider';

/**
 * Hook pour accéder aux appareils
 * @param {Object} options - Options de configuration
 * @param {boolean} [options.autoRefresh=false] - Rafraîchir automatiquement les données
 * @param {number} [options.refreshInterval=60000] - Intervalle de rafraîchissement (ms)
 * @param {string} [options.room] - Filtrer par pièce
 * @returns {Object} État et méthodes pour interagir avec les appareils
 */
export function useDevices(options = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 60000,
    room = null
  } = options;

  const { dataContext } = useContext(DataContextProvider.context);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Charge les appareils depuis le contexte
   */
  const loadDevices = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      let result;
      if (forceRefresh) {
        result = await dataContext.refreshDevices();
      } else if (room) {
        result = await dataContext.getDevicesByRoom(room);
      } else {
        result = await dataContext.getDevices();
      }

      setDevices(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dataContext, room]);

  /**
   * Rafraîchit les appareils
   */
  const refreshDevices = useCallback(() => {
    return loadDevices(true);
  }, [loadDevices]);

  // Chargement initial
  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Configuration du rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshDevices();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshDevices]);

  return {
    devices,
    loading,
    error,
    refresh: refreshDevices
  };
}
