/**
 * Service pour gérer les opérations Firebase Cloud Functions
 * Centralise les appels aux Cloud Functions Firebase
 */
import config from '../config/api.config';
import { API_ENDPOINTS } from '../config/api.endpoints';

/**
 * Classe pour gérer les appels aux Cloud Functions Firebase
 */
class FirebaseService {
  constructor() {
    this.endpoints = API_ENDPOINTS;
    this.listeners = new Map();
    this.pollingIntervals = new Map();
  }

  /**
   * Vérifie si les Cloud Functions Firebase sont accessibles
   * @returns {Promise<boolean>} True si Firebase est disponible
   */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      // Utiliser GET avec cache: 'no-store' au lieu de HEAD pour éviter les problèmes avec le Service Worker
      const response = await fetch(this.endpoints.FIREBASE_HEALTH, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-purpose': 'availability-check'
        },
        cache: 'no-store',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Firebase Cloud Functions ne sont pas accessibles:', error.message);
      return false;
    }
  }  /**
   * Récupère des données depuis une Cloud Function Firebase
   * @param {string} endpoint - URL de la Cloud Function
   * @param {Object} options - Options pour la requête fetch
   * @returns {Promise<Object>} Données récupérées
   */
  async fetchFromCloudFunction(endpoint, options = {}) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(),
        options.timeout || config.firebase.timeout || 10000);

      const response = await fetch(endpoint, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Erreur lors de l'appel à la Cloud Function ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Récupère l'état du système depuis Firebase
   * @returns {Promise<Object>} État du système
   */
  async getSystemHealth() {
    return this.fetchFromCloudFunction(this.endpoints.FIREBASE_HEALTH);
  }

  /**
   * Récupère les appareils depuis Firebase
   * @returns {Promise<Array>} Liste des appareils
   */
  async getDevices() {
    try {
      const healthData = await this.getSystemHealth();
      console.log('Firebase healthData:', healthData);

      if (healthData && healthData.devices) {
        if (Array.isArray(healthData.devices)) {
          console.log(`Firebase healthData contient ${healthData.devices.length} devices`);

          // Afficher un exemple de device
          if (healthData.devices.length > 0) {
            console.log('Exemple de device Firebase:', healthData.devices[0]);
            console.log('Champs disponibles:', Object.keys(healthData.devices[0]).join(', '));
          }
        } else {
          console.log('Firebase healthData.devices n\'est pas un tableau:', typeof healthData.devices);
        }
      } else {
        console.log('Firebase healthData ne contient pas de devices ou est invalide');
      }

      return healthData.devices || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des appareils:', error);
      return [];
    }
  }

  /**
   * Configure un polling périodique à une Cloud Function
   * @param {string} endpoint - URL de la Cloud Function
   * @param {Function} callback - Fonction à appeler lors des changements
   * @param {number} interval - Intervalle en ms entre les appels (défaut: 30s)
   * @returns {string} ID unique du polling
   */
  startPolling(endpoint, callback, interval = 30000) {
    try {
      const pollingId = Date.now().toString();

      const poll = async () => {
        try {
          const data = await this.fetchFromCloudFunction(endpoint);
          callback(data);
        } catch (error) {
          console.warn(`Erreur pendant le polling de ${endpoint}:`, error.message);
          // Continuer le polling malgré l'erreur
        }
      };

      // Premier appel immédiat
      poll();

      // Configurer l'intervalle
      const intervalId = setInterval(poll, interval);
      this.pollingIntervals.set(pollingId, intervalId);

      return pollingId;
    } catch (error) {
      console.error(`Erreur lors de la configuration du polling pour ${endpoint}:`, error);
      return null;
    }
  }

  /**
   * Arrête un polling
   * @param {string} pollingId - ID du polling à arrêter
   */
  stopPolling(pollingId) {
    const intervalId = this.pollingIntervals.get(pollingId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(pollingId);
    }
  }

  /**
   * Arrête tous les pollings
   */
  stopAllPolling() {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }
}

// Exporter une instance unique du service
export default new FirebaseService();
