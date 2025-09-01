/**
 * @file DataContext.js
 * @description Contexte central pour accéder aux repositories de données.
 * Fournit une API unifiée pour tous les besoins en données de l'application.
 */

import { CacheManager } from '../cache/CacheManager';

/**
 * Classe DataContext qui coordonne l'accès aux données via les repositories
 */
export class DataContext {
  /**
   * Crée une nouvelle instance de DataContext
   * @param {Object} options - Options de configuration
   * @param {DeviceRepository} options.deviceRepository - Repository pour les appareils
   * @param {DeviceDataRepository} options.deviceDataRepository - Repository pour les données d'appareils
   * @param {CacheManager} [options.cache] - Gestionnaire de cache optionnel
   */
  constructor(options = {}) {
    if (!options.deviceRepository) {
      throw new Error('DeviceRepository is required');
    }

    if (!options.deviceDataRepository) {
      throw new Error('DeviceDataRepository is required');
    }

    this.deviceRepository = options.deviceRepository;
    this.deviceDataRepository = options.deviceDataRepository;
    this.cache = options.cache || new CacheManager();
  }

  /**
   * Récupère tous les appareils
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Array>} Liste des appareils
   */
  async getDevices(options = {}) {
    try {
      return await this.deviceRepository.getDevices(options);
    } catch (error) {
      throw new Error(`Failed to fetch devices: ${error.message}`);
    }
  }

  /**
   * Récupère un appareil par son ID
   * @param {string} id - ID de l'appareil
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Object|null>} L'appareil ou null s'il n'existe pas
   */
  async getDevice(id, options = {}) {
    try {
      return await this.deviceRepository.getDevice(id, options);
    } catch (error) {
      throw new Error(`Failed to fetch device ${id}: ${error.message}`);
    }
  }

  /**
   * Récupère les appareils par pièce
   * @param {string} room - Nom de la pièce
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Array>} Liste des appareils dans la pièce
   */
  async getDevicesByRoom(room, options = {}) {
    try {
      const devices = await this.deviceRepository.getDevices(options);
      return devices.filter(device => device.room === room);
    } catch (error) {
      throw new Error(`Failed to fetch devices for room ${room}: ${error.message}`);
    }
  }

  /**
   * Récupère les dernières lectures d'un appareil
   * @param {string} deviceId - ID de l'appareil
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Array>} Liste des lectures
   */
  async getDeviceReadings(deviceId, options = {}) {
    try {
      return await this.deviceDataRepository.getDeviceReadings(deviceId, options);
    } catch (error) {
      throw new Error(`Failed to fetch readings for device ${deviceId}: ${error.message}`);
    }
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
    try {
      return await this.deviceDataRepository.getHistoricalData(
        deviceId,
        startDate,
        endDate,
        options
      );
    } catch (error) {
      throw new Error(`Failed to fetch historical data for device ${deviceId}: ${error.message}`);
    }
  }

  /**
   * Récupère un appareil avec ses dernières lectures
   * @param {string} deviceId - ID de l'appareil
   * @param {Object} [options] - Options de récupération
   * @returns {Promise<Object>} Appareil avec ses lectures
   */
  async getDeviceWithReadings(deviceId, options = {}) {
    try {
      const [device, readings] = await Promise.all([
        this.getDevice(deviceId, options),
        this.getDeviceReadings(deviceId, options)
      ]);

      return {
        device,
        readings
      };
    } catch (error) {
      throw new Error(`Failed to fetch device with readings: ${error.message}`);
    }
  }

  /**
   * Rafraîchit les données d'un appareil spécifique
   * @param {string} deviceId - ID de l'appareil
   * @returns {Promise<Object|null>} L'appareil mis à jour
   */
  async refreshDevice(deviceId) {
    try {
      this.cache.invalidate(`device:${deviceId}`);
      return await this.deviceRepository.getDevice(deviceId, { forceRefresh: true });
    } catch (error) {
      throw new Error(`Failed to refresh device ${deviceId}: ${error.message}`);
    }
  }

  /**
   * Rafraîchit tous les appareils
   * @returns {Promise<Array>} Liste des appareils mis à jour
   */
  async refreshDevices() {
    try {
      this.cache.invalidate('devices');
      return await this.deviceRepository.getDevices({ forceRefresh: true });
    } catch (error) {
      throw new Error(`Failed to refresh devices: ${error.message}`);
    }
  }

  /**
   * Rafraîchit les données d'un appareil
   * @param {string} deviceId - ID de l'appareil
   * @returns {Promise<Array>} Liste des lectures mises à jour
   */
  async refreshDeviceData(deviceId) {
    try {
      this.cache.invalidate(`readings:${deviceId}`);
      return await this.deviceDataRepository.getDeviceReadings(deviceId, { forceRefresh: true });
    } catch (error) {
      throw new Error(`Failed to refresh device data: ${error.message}`);
    }
  }

  /**
   * Rafraîchit toutes les données
   * @returns {Promise<void>}
   */
  async refreshAllData() {
    try {
      await this.refreshDevices();
      const devices = await this.getDevices();

      await Promise.all(
        devices.map(device => this.refreshDeviceData(device.id))
      );
    } catch (error) {
      throw new Error(`Failed to refresh all data: ${error.message}`);
    }
  }

  /**
   * Efface le cache
   */
  clearCache() {
    this.cache.clear();
  }
}
