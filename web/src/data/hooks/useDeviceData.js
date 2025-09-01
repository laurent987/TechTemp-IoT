/**
 * @file useDeviceData.js
 * @description Hook React pour gérer les données historiques d'un appareil
 */

import { useState, useEffect, useCallback, useContext } from 'react';
import { DataContextProvider } from './DataContextProvider';

/**
 * Hook pour accéder aux données historiques d'un appareil
 * @param {string} deviceId - ID de l'appareil
 * @param {Object} options - Options de configuration
 * @param {string} [options.startDate] - Date de début (ISO string)
 * @param {string} [options.endDate] - Date de fin (ISO string)
 * @param {boolean} [options.autoRefresh=false] - Rafraîchir automatiquement les données
 * @param {number} [options.refreshInterval=300000] - Intervalle de rafraîchissement (ms)
 * @returns {Object} État et méthodes pour interagir avec les données
 */
export function useDeviceData(deviceId, options = {}) {
  const defaultEndDate = new Date().toISOString();
  const defaultStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24h avant

  const {
    startDate = defaultStartDate,
    endDate = defaultEndDate,
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes par défaut
  } = options;

  const { dataContext } = useContext(DataContextProvider.context);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Calcule les statistiques à partir des données
   * @param {Array} data - Données de l'appareil
   * @returns {Object} Statistiques calculées
   */
  const calculateStats = useCallback((data) => {
    if (!data || data.length === 0) {
      return {
        temperature: { min: null, max: null, avg: null },
        humidity: { min: null, max: null, avg: null },
        count: 0
      };
    }

    const tempValues = data.map(d => d.temperature).filter(v => v !== null && v !== undefined);
    const humValues = data.map(d => d.humidity).filter(v => v !== null && v !== undefined);

    const tempStats = tempValues.length > 0 ? {
      min: Math.min(...tempValues),
      max: Math.max(...tempValues),
      avg: tempValues.reduce((a, b) => a + b, 0) / tempValues.length
    } : { min: null, max: null, avg: null };

    const humStats = humValues.length > 0 ? {
      min: Math.min(...humValues),
      max: Math.max(...humValues),
      avg: humValues.reduce((a, b) => a + b, 0) / humValues.length
    } : { min: null, max: null, avg: null };

    return {
      temperature: tempStats,
      humidity: humStats,
      count: data.length
    };
  }, []);

  /**
   * Charge les données historiques
   */
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!deviceId) {
      setError('Device ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Option pour forcer le rafraîchissement
      const options = forceRefresh ? { forceRefresh: true } : {};

      const historicalData = await dataContext.getHistoricalData(
        deviceId,
        startDate,
        endDate,
        options
      );

      setData(historicalData);
      setStats(calculateStats(historicalData));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dataContext, deviceId, startDate, endDate, calculateStats]);

  /**
   * Rafraîchit les données
   */
  const refreshData = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Configuration du rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshData();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  return {
    data,
    stats,
    loading,
    error,
    refresh: refreshData
  };
}
