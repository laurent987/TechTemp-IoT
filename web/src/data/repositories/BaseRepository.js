/**
 * @file BaseRepository.js
 * @description Classe de base pour tous les repositories
 * Fournit des fonctionnalités communes et gestion des adaptateurs
 */

import { CacheManager } from '../cache/CacheManager';

/**
 * Classe de base pour les repositories
 */
export class BaseRepository {
  /**
   * Crée une nouvelle instance de BaseRepository
   * @param {Object} options - Options de configuration
   * @param {Array} options.adapters - Liste des adaptateurs
   * @param {CacheManager} [options.cache] - Gestionnaire de cache
   * @param {boolean} [options.fallbackEnabled=true] - Active la redondance
   */
  constructor(options = {}) {
    if (!options.adapters || !Array.isArray(options.adapters) || options.adapters.length === 0) {
      throw new Error('At least one adapter is required');
    }

    this.adapters = options.adapters;
    this.cache = options.cache || new CacheManager();
    this.fallbackEnabled = options.fallbackEnabled !== false;
  }

  /**
   * Tente de récupérer des données via les adaptateurs avec redondance
   * @param {Function} fetchFn - Fonction à exécuter sur chaque adaptateur
   * @param {string} errorMessage - Message d'erreur en cas d'échec
   * @returns {Promise<any>} Données récupérées
   */
  async fetchFromAdapters(fetchFn, errorMessage = 'Failed to fetch data') {
    // Si aucun adaptateur n'est disponible
    if (!this.adapters || this.adapters.length === 0) {
      throw new Error('No adapters available');
    }

    // Essayer les adaptateurs dans l'ordre jusqu'à succès
    let lastError = null;

    for (const adapter of this.adapters) {
      try {
        const result = await fetchFn(adapter);
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`Failed to fetch with adapter ${adapter.source}:`, error.message);
      }
    }

    // Si tous les adaptateurs ont échoué
    throw new Error(`${errorMessage}: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Nettoie le cache du repository
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Vérifie si une source est disponible
   * @param {string} source - Nom de la source
   * @returns {Promise<boolean>} Disponibilité de la source
   */
  async isSourceAvailable(source) {
    try {
      // Implémentation de base à surcharger
      return true;
    } catch (error) {
      console.error(`Source ${source} check failed:`, error);
      return false;
    }
  }
}
