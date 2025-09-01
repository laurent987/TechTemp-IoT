/**
 * @file DeviceDataRepository.js
 * @description Repository pour accéder aux données des appareils (lectures et historique)
 */

import { BaseRepository } from './BaseRepository';

/**
 * Repository pour les données des appareils
 */
export class DeviceDataRepository extends BaseRepository {
  /**
   * Récupère les dernières lectures d'un appareil
   * @param {string} deviceId - ID de l'appareil
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Array>} Liste des lectures
   */
  async getDeviceReadings(deviceId, options = {}) {
    const cacheKey = `readings:${deviceId}`;

    // Vérifie le cache si le rafraîchissement n'est pas forcé
    if (!options.forceRefresh) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Récupère les données depuis les adaptateurs
    const readings = await this.fetchFromAdapters(
      adapter => adapter.fetchDeviceReadings(deviceId, options),
      `Failed to fetch readings for device ${deviceId}`
    );

    // Met en cache les résultats
    this.cache.set(cacheKey, readings);

    return readings;
  }

  /**
   * Récupère les données historiques d'un appareil
   * @param {string} deviceId - ID de l'appareil
   * @param {string} startDate - Date de début (ISO string)
   * @param {string} endDate - Date de fin (ISO string)
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Array>} Liste des lectures historiques
   */
  async getHistoricalData(deviceId, startDate, endDate, options = {}) {
    const cacheKey = `historical:${deviceId}:${startDate}:${endDate}`;

    // Vérifie le cache si le rafraîchissement n'est pas forcé
    if (!options.forceRefresh) {
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Récupère les données depuis les adaptateurs
    const data = await this.fetchFromAdapters(
      adapter => adapter.fetchHistoricalData(deviceId, startDate, endDate, options),
      `Failed to fetch historical data for device ${deviceId}`
    );

    // Met en cache les résultats avec une durée de vie plus longue pour les données historiques
    const ttl = options.ttl || 30 * 60 * 1000; // 30 minutes par défaut
    this.cache.set(cacheKey, data, ttl);

    return data;
  }

  /**
   * Calcule les statistiques pour un appareil
   * @param {string} deviceId - ID de l'appareil
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Object>} Statistiques de l'appareil
   */
  async getDeviceStats(deviceId, options = {}) {
    const readings = await this.getDeviceReadings(deviceId, options);

    if (!readings || readings.length === 0) {
      return {
        deviceId,
        temperatureStats: {
          min: null,
          max: null,
          avg: null,
          current: null
        },
        humidityStats: {
          min: null,
          max: null,
          avg: null,
          current: null
        },
        readingCount: 0,
        lastUpdated: null
      };
    }

    // Trie les lectures par date, de la plus récente à la plus ancienne
    const sortedReadings = [...readings].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    const temperatures = sortedReadings
      .map(r => r.temperature)
      .filter(t => t !== null && t !== undefined);

    const humidities = sortedReadings
      .map(r => r.humidity)
      .filter(h => h !== null && h !== undefined);

    // Calcule les statistiques
    const temperatureStats = temperatures.length > 0 ? {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures),
      avg: temperatures.reduce((sum, val) => sum + val, 0) / temperatures.length,
      current: sortedReadings[0].temperature
    } : {
      min: null,
      max: null,
      avg: null,
      current: null
    };

    const humidityStats = humidities.length > 0 ? {
      min: Math.min(...humidities),
      max: Math.max(...humidities),
      avg: humidities.reduce((sum, val) => sum + val, 0) / humidities.length,
      current: sortedReadings[0].humidity
    } : {
      min: null,
      max: null,
      avg: null,
      current: null
    };

    return {
      deviceId,
      temperatureStats,
      humidityStats,
      readingCount: readings.length,
      lastUpdated: sortedReadings[0]?.timestamp || null
    };
  }
}
