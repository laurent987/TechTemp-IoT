/**
 * Gestionnaire de cache pour optimiser les performances des requêtes
 * Permet de stocker temporairement les données pour éviter des requêtes redondantes
 * et améliorer la résilience de l'application en cas de perte de connectivité
 */
export class CacheManager {
  constructor(namespace, options = {}) {
    this.namespace = namespace;
    this.options = options; // Stocker les options complètes
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes par défaut
    this.maxSize = options.maxSize || 50;
    this.storage = options.storage || 'memory'; // 'memory' ou 'localStorage'
    this.cache = new Map();
    this.accessTimes = new Map(); // Pour l'algorithme LRU (Least Recently Used)

    // Initialiser le nettoyage automatique si activé
    if (options.autoCleanup !== false) {
      this.setupAutoCleanup(options.cleanupInterval || 60000); // 1 minute par défaut
    }
  }

  /**
   * Génère une clé de cache
   */
  getKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Récupère un élément du cache
   * @param {string} key - Clé du cache
   * @returns {any|null} Données mises en cache ou null si absentes/expirées
   */
  get(key) {
    const fullKey = this.getKey(key);

    if (this.storage === 'localStorage') {
      return this.getFromLocalStorage(fullKey);
    }

    const item = this.cache.get(fullKey);
    if (!item) return null;

    // Vérifier la durée de vie (TTL)
    if (Date.now() > item.expires) {
      this.cache.delete(fullKey);
      this.accessTimes.delete(fullKey);
      return null;
    }

    // Mettre à jour le timestamp d'accès pour LRU
    this.accessTimes.set(fullKey, Date.now());

    return item.data;
  }

  /**
   * Enregistre un élément dans le cache
   * @param {string} key - Clé du cache
   * @param {any} data - Données à mettre en cache
   * @param {number} ttl - Durée de vie en millisecondes (ou valeur par défaut)
   */
  set(key, data, ttl = this.ttl) {
    const fullKey = this.getKey(key);
    const expires = Date.now() + ttl;

    if (this.storage === 'localStorage') {
      this.setToLocalStorage(fullKey, data, expires);
      return;
    }

    // Vérifier la taille maximale et libérer de l'espace si nécessaire
    if (this.cache.size >= this.maxSize && !this.cache.has(fullKey)) {
      this.evictLRU();
    }

    // Mettre à jour le cache et l'horodatage d'accès
    this.cache.set(fullKey, { data, expires });
    this.accessTimes.set(fullKey, Date.now());
  }

  /**
   * Supprime l'élément le moins récemment utilisé (algorithme LRU)
   * @private
   */
  evictLRU() {
    if (this.accessTimes.size === 0) {
      // Fallback: supprimer la première entrée du cache
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
      return;
    }

    // Trouver l'entrée avec le timestamp d'accès le plus ancien
    let oldestKey = null;
    let oldestTime = Infinity;

    this.accessTimes.forEach((accessTime, key) => {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    });

    // Supprimer cette entrée
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  /**
   * Vide le cache
   * @param {string} [keyPattern] - Si fourni, ne supprime que les clés correspondant au pattern
   */
  clear(keyPattern) {
    if (this.storage === 'localStorage') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.namespace) &&
          (!keyPattern || key.includes(keyPattern))) {
          localStorage.removeItem(key);
        }
      });
    } else {
      if (keyPattern) {
        // Suppression sélective
        for (const key of this.cache.keys()) {
          if (key.includes(keyPattern)) {
            this.cache.delete(key);
            this.accessTimes.delete(key);
          }
        }
      } else {
        // Suppression complète
        this.cache.clear();
        this.accessTimes.clear();
      }
    }

    console.log(`Cache '${this.namespace}' ${keyPattern ? `for pattern '${keyPattern}'` : 'completely'} cleared`);
  }

  /**
   * Helpers pour localStorage
   */
  getFromLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() > parsed.expires) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Cache localStorage get error:', error);
      return null;
    }
  }

  setToLocalStorage(key, data, expires) {
    try {
      const valueToStore = JSON.stringify({ data, expires });
      localStorage.setItem(key, valueToStore);
    } catch (error) {
      console.error('Cache localStorage set error:', error);
      // Fallback à la mémoire si localStorage échoue
      this.cache.set(key, { data, expires });
    }
  }

  /**
   * Configure un nettoyage périodique du cache
   * @param {number} interval - Intervalle en millisecondes
   * @private
   */
  setupAutoCleanup(interval) {
    setInterval(() => {
      this.removeExpiredEntries();
    }, interval);
  }

  /**
   * Supprime toutes les entrées expirées
   * @returns {number} Nombre d'entrées supprimées
   */
  removeExpiredEntries() {
    const now = Date.now();
    let removed = 0;

    if (this.storage === 'localStorage') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.namespace)) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.expires && item.expires < now) {
              localStorage.removeItem(key);
              removed++;
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      });
    } else {
      // Pour le cache en mémoire
      for (const [key, item] of this.cache.entries()) {
        if (item.expires < now) {
          this.cache.delete(key);
          this.accessTimes.delete(key);
          removed++;
        }
      }
    }

    return removed;
  }

  /**
   * Vérifie si une clé existe dans le cache et n'est pas expirée
   * @param {string} key - Clé à vérifier
   * @returns {boolean} True si présente et valide
   */
  has(key) {
    const fullKey = this.getKey(key);

    if (this.storage === 'localStorage') {
      const item = localStorage.getItem(fullKey);
      if (!item) return false;

      try {
        const parsed = JSON.parse(item);
        return parsed.expires > Date.now();
      } catch (e) {
        return false;
      }
    }

    const item = this.cache.get(fullKey);
    if (!item) return false;
    return item.expires > Date.now();
  }

  /**
   * Invalidate a specific cache entry
   * @param {string} key - Clé à invalider
   */
  invalidate(key) {
    const fullKey = this.getKey(key);

    if (this.storage === 'localStorage') {
      localStorage.removeItem(fullKey);
    } else {
      this.cache.delete(fullKey);
      this.accessTimes.delete(fullKey);
    }

    console.log(`Cache entry '${key}' invalidated`);
  }

  /**
   * Statistiques du cache
   * @returns {Object} Informations sur l'état du cache
   */
  getStats() {
    const now = Date.now();
    let size = 0;
    let expired = 0;

    if (this.storage === 'localStorage') {
      // Calculer pour localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.namespace)) {
          size++;
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.expires && item.expires < now) {
              expired++;
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      });
    } else {
      // Calculer pour le cache en mémoire
      size = this.cache.size;
      this.cache.forEach((item) => {
        if (item.expires < now) expired++;
      });
    }

    return {
      size,
      active: size - expired,
      expired,
      maxSize: this.maxSize,
      ttl: this.ttl,
      storage: this.storage,
      namespace: this.namespace
    };
  }

  /**
   * Récupère un instantané des données actuelles du cache
   * Utile pour les tests et le débogage
   * @returns {Object} Données du cache sous forme d'objet clé-valeur
   */
  getSnapshot() {
    const snapshot = {};

    if (this.storage === 'localStorage') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.namespace)) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item && item.data) {
              const simpleKey = key.replace(`${this.namespace}:`, '');
              snapshot[simpleKey] = item.data;
            }
          } catch (e) {
            // Ignorer les erreurs de parsing
          }
        }
      });
    } else {
      this.cache.forEach((item, key) => {
        const simpleKey = key.replace(`${this.namespace}:`, '');
        snapshot[simpleKey] = item.data;
      });
    }

    return snapshot;
  }

  /**
   * Force l'application de la limite de taille
   * Utile pour les tests et lorsque maxSize change
   */
  enforceSizeLimit() {
    if (this.storage === 'localStorage') {
      // Pour localStorage, compter les entrées et supprimer si nécessaire
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith(this.namespace));

      if (keys.length <= this.maxSize) return;

      // Récupérer les timestamps d'accès si disponibles
      const accessMap = {};
      keys.forEach(key => {
        try {
          const lsAccessTime = localStorage.getItem(`${key}:access`);
          accessMap[key] = lsAccessTime ? parseInt(lsAccessTime, 10) : 0;
        } catch (e) {
          accessMap[key] = 0;
        }
      });

      // Trier par timestamp d'accès et supprimer les plus anciens
      keys.sort((a, b) => accessMap[a] - accessMap[b]);

      const toRemove = keys.slice(0, keys.length - this.maxSize);
      toRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}:access`);
      });

      console.warn(`Enforced size limit: removed ${toRemove.length} items from localStorage cache`);
    } else {
      // Pour le cache en mémoire
      if (this.cache.size <= this.maxSize) return;

      // Calculer combien d'éléments supprimer
      const itemsToRemove = this.cache.size - this.maxSize;
      console.warn(`Enforcing size limit: removing ${itemsToRemove} items from memory cache`);

      // Supprimer les éléments les moins récemment utilisés
      for (let i = 0; i < itemsToRemove; i++) {
        this.evictLRU();
      }
    }
  }

  /**
   * Permet de modifier les options du cache à la volée
   * @param {Object} newOptions - Nouvelles options à appliquer
   */
  updateOptions(newOptions) {
    if (newOptions.ttl !== undefined) this.ttl = newOptions.ttl;
    if (newOptions.maxSize !== undefined) {
      this.maxSize = newOptions.maxSize;
      this.enforceSizeLimit();
    }

    return this.getStats();
  }
}
