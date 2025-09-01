/**
 * @file index.js
 * @description Point d'entrée pour l'architecture de données
 * Exporte tous les composants nécessaires pour utiliser l'architecture
 */

// Contexte de données
export { DataContext } from './context/DataContext';
export { DataContextProvider } from './context/DataContextProvider';

// Hooks React
export { useDevice } from './hooks/useDevice';
export { useDevices } from './hooks/useDevices';
export { useDeviceData } from './hooks/useDeviceData';

// Repositories
export { DeviceRepository } from './repositories/DeviceRepository';
export { DeviceDataRepository } from './repositories/DeviceDataRepository';

// Adaptateurs
export { BaseAdapter } from './adapters/BaseAdapter';
export { FirebaseAdapter } from './adapters/FirebaseAdapter';
export { LocalServerAdapter } from './adapters/LocalServerAdapter';

// Gestion du cache
export { CacheManager } from './cache/CacheManager';

/**
 * Crée une instance de DataContext configurée
 * @param {Object} options - Options de configuration
 * @returns {DataContext} Instance configurée
 */
export function createDataContext(options = {}) {
  const {
    adapters,
    cacheTTL = 5 * 60 * 1000, // 5 minutes par défaut
    useLocalStorage = false
  } = options;

  // Imports dynamiques pour éviter les références circulaires
  const { CacheManager } = require('./cache/CacheManager');
  const { DeviceRepository } = require('./repositories/DeviceRepository');
  const { DeviceDataRepository } = require('./repositories/DeviceDataRepository');
  const { DataContext } = require('./context/DataContext');
  const { FirebaseAdapter } = require('./adapters/FirebaseAdapter');
  const { LocalServerAdapter } = require('./adapters/LocalServerAdapter');

  // Création du gestionnaire de cache
  const cache = new CacheManager({
    ttl: cacheTTL,
    storage: useLocalStorage ? 'localStorage' : 'memory'
  });

  // Utilise les adaptateurs fournis ou crée les adaptateurs par défaut
  const dataAdapters = adapters || [
    new FirebaseAdapter(),
    new LocalServerAdapter()
  ];

  // Création des repositories
  const deviceRepository = new DeviceRepository({
    adapters: dataAdapters,
    cache
  });

  const deviceDataRepository = new DeviceDataRepository({
    adapters: dataAdapters,
    cache
  });

  // Création et retour du contexte de données
  return new DataContext({
    deviceRepository,
    deviceDataRepository,
    cache
  });
}
