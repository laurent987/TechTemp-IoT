import { FirebaseAdapter } from '../adapters/FirebaseAdapter';
import { LocalServerAdapter } from '../adapters/LocalServerAdapter';
import { CacheManager } from '../cache/CacheManager';
import firebaseService from '../../services/firebase.service';
import { apiGet, isUrlAccessible } from '../../services/api.service';
import config from '../../config/api.config';
import { API_ENDPOINTS, buildApiUrl } from '../../config/api.endpoints';

/**
 * Repository pour l'accès aux données des appareils
 * Centralise la logique d'accès aux données et la normalisation
 */
export class DeviceRepository {
  constructor() {
    this.firebaseAdapter = new FirebaseAdapter();
    this.localAdapter = new LocalServerAdapter();
    this.cache = new CacheManager('devices', {
      ttl: config.firebase.cacheTTL,
      maxSize: 100
    });
    this.endpoints = API_ENDPOINTS;
  }

  /**
   * Récupère les appareils depuis la source spécifiée
   * @param {Object} options - Options de récupération
   * @param {string} options.source - Source des données ('firebase', 'local', 'auto')
   * @param {boolean} options.forceRefresh - Force le rafraîchissement du cache
   * @param {boolean} options.fallbackEnabled - Active le fallback sur l'autre source
   * @returns {Promise<Array>} Liste d'appareils normalisés
   */
  async getDevices(options = {}) {
    const {
      source = 'auto',
      forceRefresh = false,
      fallbackEnabled = true
    } = options;

    // Vérifier le cache d'abord
    if (!forceRefresh) {
      const cached = this.cache.get(`devices_${source}`);
      if (cached) {
        console.log(`Using cached devices (${source})`);
        return cached;
      }
    }

    try {
      let devices;

      if (source === 'firebase' || (source === 'auto' && await this.isSourceAvailable('firebase'))) {
        console.log('Fetching from Firebase...');
        devices = await this.getFirebaseDevices();
      } else if (source === 'local' || source === 'auto') {
        console.log('Fetching from local server...');
        devices = await this.getLocalDevices();
      }

      // Stratégie de fallback
      if (!devices || devices.length === 0) {
        if (fallbackEnabled && source === 'auto') {
          console.warn('Primary source returned no devices, trying fallback...');
          if (await this.isSourceAvailable('local')) {
            devices = await this.getLocalDevices();
          } else if (await this.isSourceAvailable('firebase')) {
            devices = await this.getFirebaseDevices();
          }
        }
      }

      if (devices && devices.length > 0) {
        this.cache.set(`devices_${source}`, devices);
      }

      return devices || [];
    } catch (error) {
      console.error('DeviceRepository.getDevices error:', error);

      // Retourner les données en cache si disponibles pendant une erreur
      const cached = this.cache.get(`devices_${source}`);
      if (cached) {
        console.log('Returning cached data due to error');
        return cached;
      }

      throw error;
    }
  }

  /**
   * Vérifie si une source est disponible
   * @param {string} source - Source à vérifier ('firebase' ou 'local')
   * @returns {Promise<boolean>} Disponibilité de la source
   */
  async isSourceAvailable(source) {
    try {
      if (source === 'local') {
        // Ping le serveur local (timeout court)
        return await isUrlAccessible(this.endpoints.LOCAL_HEALTH, 2000);
      } else if (source === 'firebase') {
        // Vérifier Firebase via notre service
        return await firebaseService.isAvailable();
      }
      return false;
    } catch (error) {
      console.error(`Source ${source} check failed:`, error);
      return false;
    }
  }

  /**
   * Récupère les appareils depuis Firebase
   * @returns {Promise<Array>} Liste d'appareils normalisés
   */
  async getFirebaseDevices() {
    try {
      console.log('DeviceRepository: Récupération des appareils depuis Firebase...');

      // Utiliser notre service Firebase qui appelle la Cloud Function
      const devices = await firebaseService.getDevices();

      console.log('DeviceRepository: Données brutes reçues de Firebase:', devices);

      if (!devices || devices.length === 0) {
        console.warn('No devices found in Firebase');
        return [];
      }

      const normalizedDevices = this.firebaseAdapter.normalizeDevices(devices);
      console.log('DeviceRepository: Données normalisées par FirebaseAdapter:', normalizedDevices);

      return normalizedDevices;
    } catch (error) {
      console.error('Firebase fetch error:', error);
      throw error;
    }
  }

  /**
   * Récupère les appareils depuis le serveur local
   * @returns {Promise<Array>} Liste d'appareils normalisés
   */
  async getLocalDevices() {
    try {
      const data = await apiGet(this.endpoints.LOCAL_DEVICES, {
        retry: {
          retryAttempts: config.localApi.retryAttempts,
          retryDelay: config.localApi.retryDelay,
          timeout: config.localApi.timeout,
          onRetry: (error, attempt) => {
            console.warn(`Retry ${attempt} to fetch devices from local API after error:`, error.message);
          }
        }
      });

      return this.localAdapter.normalizeDevices(data);
    } catch (error) {
      console.error('Local server fetch error:', error);
      throw error;
    }
  }

  /**
   * Récupère un appareil spécifique par son ID
   * @param {string} deviceId - ID de l'appareil
   * @param {Object} options - Options de récupération
   * @returns {Promise<Object>} Appareil normalisé
   */
  async getDevice(deviceId, options = {}) {
    const devices = await this.getDevices(options);
    return devices.find(device => device.id === deviceId);
  }

  /**
   * Fusionne les données des deux sources
   * Utile pour avoir les données temps réel de Firebase avec les statistiques du serveur
   * @returns {Promise<Array>} Liste d'appareils fusionnés
   */
  async getMergedDevices() {
    try {
      const [firebaseDevices, localDevices] = await Promise.allSettled([
        this.getFirebaseDevices(),
        this.getLocalDevices()
      ]);

      const devicesMap = new Map();

      // Ajouter les appareils Firebase
      if (firebaseDevices.status === 'fulfilled') {
        firebaseDevices.value.forEach(device => {
          devicesMap.set(device.id, device);
        });
      }

      // Fusionner ou remplacer avec les appareils locaux
      if (localDevices.status === 'fulfilled') {
        localDevices.value.forEach(device => {
          const existing = devicesMap.get(device.id);
          if (existing) {
            // Stratégie de fusion: préférer local pour les stats et les données récentes, firebase pour les noms et autres
            // Créer un objet qui contient les données du périphérique fusionnées
            const mergedDevice = {
              ...existing,
              // Conserver les noms et autres champs de Firebase
              name: existing.name,
              // Prendre les données temps réel de la source la plus récente
              temperature: this._getNewestValue(existing, device, 'temperature'),
              humidity: this._getNewestValue(existing, device, 'humidity'),
              // Conserver les stats du serveur local
              stats: device.stats || (device.readings_count ? {
                readingsCount: device.readings_count,
                minTemperature: device.min_temperature,
                maxTemperature: device.max_temperature
              } : undefined)
            };
            devicesMap.set(device.id, mergedDevice);
          } else {
            devicesMap.set(device.id, device);
          }
        });
      }

      return Array.from(devicesMap.values());
    } catch (error) {
      console.error('Failed to merge devices:', error);
      throw error;
    }
  }

  /**
   * Vide le cache des appareils
   */
  clearCache() {
    this.cache.clear();
    console.log('Device cache cleared');
  }

  /**
   * Détermine quelle valeur utiliser en se basant sur la plus récente
   * @param {Object} firebaseDevice - Appareil depuis Firebase
   * @param {Object} localDevice - Appareil depuis le serveur local
   * @param {string} property - Propriété à comparer
   * @returns {*} La valeur la plus récente pour cette propriété
   * @private
   */
  _getNewestValue(firebaseDevice, localDevice, property) {
    // Récupérer les timestamps de chaque source
    const firebaseTime = new Date(firebaseDevice.lastSeen || firebaseDevice.last_seen || firebaseDevice.timestamp || 0);
    const localTime = new Date(localDevice.lastUpdate || localDevice.last_update || localDevice.created_at || 0);

    // Comparer les timestamps et retourner la valeur la plus récente
    if (localTime > firebaseTime) {
      return localDevice[property] !== undefined ? localDevice[property] : firebaseDevice[property];
    } else {
      return firebaseDevice[property] !== undefined ? firebaseDevice[property] : localDevice[property];
    }
  }
}
