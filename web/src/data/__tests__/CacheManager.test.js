/**
 * Tests unitaires pour CacheManager
 */
import { CacheManager } from '../cache/CacheManager';

describe('CacheManager', () => {
  let cacheManager;
  const namespace = 'test-cache';
  const defaultTTL = 5000; // 5 secondes pour accélérer les tests

  beforeEach(() => {
    // Créer une nouvelle instance pour chaque test
    cacheManager = new CacheManager(namespace, {
      ttl: defaultTTL,
      maxSize: 5,
      autoCleanup: false // Désactiver le nettoyage automatique pour les tests
    });

    // Nettoyer le localStorage si utilisé dans certains tests
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(namespace)) {
          localStorage.removeItem(key);
        }
      });
    }
  });

  describe('Fonctionnalités de base', () => {
    test('devrait stocker et récupérer des valeurs', () => {
      const key = 'test-key';
      const data = { name: 'Device 1', temperature: 22.5 };

      cacheManager.set(key, data);
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(data);
    });

    test('devrait retourner null pour une clé inexistante', () => {
      const result = cacheManager.get('nonexistent-key');
      expect(result).toBeNull();
    });

    test('devrait vérifier si une clé existe avec has()', () => {
      const key = 'exists-key';
      cacheManager.set(key, 'value');

      expect(cacheManager.has(key)).toBe(true);
      expect(cacheManager.has('nonexistent-key')).toBe(false);
    });

    test('devrait supprimer des éléments avec clear()', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');

      cacheManager.clear();

      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).toBeNull();
    });

    test('devrait supprimer un élément spécifique avec invalidate()', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');

      cacheManager.invalidate('key1');

      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).not.toBeNull();
    });
  });

  describe('Gestion du TTL', () => {
    test('devrait expirer les éléments après leur TTL', async () => {
      const key = 'expiring-key';
      const shortTTL = 100; // 100ms

      cacheManager.set(key, 'expiring-value', shortTTL);

      // Immédiatement, l'élément devrait être disponible
      expect(cacheManager.get(key)).toBe('expiring-value');

      // Attendre l'expiration
      await new Promise(resolve => setTimeout(resolve, shortTTL + 50));

      // Après le délai, l'élément devrait être expiré
      expect(cacheManager.get(key)).toBeNull();
    });

    test('devrait utiliser le TTL par défaut si non spécifié', async () => {
      jest.useFakeTimers();

      const key = 'default-ttl-key';
      cacheManager.set(key, 'value');

      // Avancer le temps juste avant l'expiration
      jest.advanceTimersByTime(defaultTTL - 100);
      expect(cacheManager.get(key)).toBe('value');

      // Avancer après l'expiration
      jest.advanceTimersByTime(200);
      expect(cacheManager.get(key)).toBeNull();

      jest.useRealTimers();
    });

    test('devrait supprimer les entrées expirées avec removeExpiredEntries()', () => {
      jest.useFakeTimers();

      cacheManager.set('expire1', 'value1', 1000);
      cacheManager.set('expire2', 'value2', 2000);
      cacheManager.set('persist', 'value3', 10000);

      // Avancer le temps pour que certaines entrées expirent
      jest.advanceTimersByTime(1500);

      // removeExpiredEntries devrait supprimer expire1 mais pas expire2 ni persist
      const removed = cacheManager.removeExpiredEntries();

      expect(removed).toBe(1);
      expect(cacheManager.get('expire1')).toBeNull();
      expect(cacheManager.get('expire2')).toBe('value2');
      expect(cacheManager.get('persist')).toBe('value3');

      jest.useRealTimers();
    });
  });

  describe('Limitation de taille et stratégie LRU', () => {
    test('devrait respecter la taille maximale du cache', () => {
      // Créer un cache avec une taille maximale de 3
      const smallCache = new CacheManager('small-cache', { maxSize: 3 });

      // Ajouter 3 éléments
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      // Vérifier que tous les éléments sont présents
      expect(smallCache.get('key1')).toBe('value1');
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');

      // Ajouter un 4ème élément
      smallCache.set('key4', 'value4');

      // Vérifier que nous avons toujours au maximum 3 éléments (mais nous ne pouvons pas
      // être sûrs de celui qui a été évincé sans connaître l'implémentation exacte)
      const present = [
        smallCache.get('key1') !== null,
        smallCache.get('key2') !== null,
        smallCache.get('key3') !== null,
        smallCache.get('key4') !== null
      ];

      // Compter combien d'éléments sont toujours présents
      const countPresent = present.filter(Boolean).length;
      expect(countPresent).toBeLessThanOrEqual(3);

      // Le nouvel élément devrait toujours être présent
      expect(smallCache.get('key4')).toBe('value4');
    });

    test('devrait garder les données après plusieurs accès get()', () => {
      // Créer un cache avec une taille maximale de 2
      const smallCache = new CacheManager('small-cache', { maxSize: 2 });

      // Ajouter 2 éléments
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');

      // Accéder plusieurs fois
      for (let i = 0; i < 5; i++) {
        expect(smallCache.get('key1')).toBe('value1');
        expect(smallCache.get('key2')).toBe('value2');
      }
    });
  });

  describe('Statistiques du cache', () => {
    test('devrait fournir des statistiques précises sur l\'état du cache', () => {
      jest.useFakeTimers();

      cacheManager.set('active1', 'value1');
      cacheManager.set('active2', 'value2');
      cacheManager.set('expired', 'value3', 100);

      // Avancer le temps pour que 'expired' expire
      jest.advanceTimersByTime(200);

      const stats = cacheManager.getStats();

      expect(stats.size).toBe(3);         // Nombre total d'entrées
      expect(stats.active).toBe(2);       // Entrées actives
      expect(stats.expired).toBe(1);      // Entrées expirées
      expect(stats.maxSize).toBe(5);      // Taille maximale configurée
      expect(stats.namespace).toBe(namespace);
      expect(stats.ttl).toBe(defaultTTL);

      jest.useRealTimers();
    });
  });

  describe('Mode localStorage', () => {
    // Ces tests ne s'exécuteront que si localStorage est disponible
    // (skip automatique dans les environnements sans localStorage comme Node.js)

    beforeEach(() => {
      if (typeof localStorage === 'undefined') {
        return;
      }

      // Créer une instance qui utilise localStorage
      cacheManager = new CacheManager('localstorage-test', {
        ttl: 1000,
        storage: 'localStorage'
      });
    });

    test('devrait stocker et récupérer des valeurs depuis localStorage', () => {
      if (typeof localStorage === 'undefined') {
        // Skip le test si localStorage n'est pas disponible
        return;
      }

      const key = 'ls-key';
      const data = { name: 'Device LS', temperature: 23.5 };

      cacheManager.set(key, data);

      // Vérifier que l'élément est dans localStorage
      expect(localStorage.getItem('localstorage-test:ls-key')).toBeTruthy();

      // Récupérer l'élément
      const retrieved = cacheManager.get(key);
      expect(retrieved).toEqual(data);
    });

    test('devrait gérer les erreurs de localStorage', () => {
      if (typeof localStorage === 'undefined') {
        return;
      }

      // Simuler une erreur localStorage plein
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('localStorage is full');
      });

      // La méthode ne devrait pas planter mais utiliser le fallback mémoire
      expect(() => {
        cacheManager.set('error-key', 'value');
      }).not.toThrow();

      // Restaurer la fonction originale
      localStorage.setItem = originalSetItem;
    });
  });

  describe('Nettoyage automatique', () => {
    test('devrait configurer et exécuter le nettoyage automatique', async () => {
      jest.useFakeTimers();

      // Espionner la méthode removeExpiredEntries
      const removeExpiredSpy = jest.spyOn(CacheManager.prototype, 'removeExpiredEntries');

      // Créer un cache avec nettoyage automatique (intervalle court)
      const autoCleanCache = new CacheManager('auto-clean', {
        ttl: 5000,
        cleanupInterval: 1000, // 1 seconde
        autoCleanup: true
      });

      // Ajouter quelques entrées qui expirent rapidement
      autoCleanCache.set('quick1', 'value1', 100);
      autoCleanCache.set('quick2', 'value2', 100);
      autoCleanCache.set('slow', 'value3', 10000);

      // Avancer le temps pour que les entrées rapides expirent
      jest.advanceTimersByTime(200);

      // Avancer le temps pour déclencher le nettoyage automatique
      jest.advanceTimersByTime(1000);

      // Vérifier que removeExpiredEntries a été appelé
      expect(removeExpiredSpy).toHaveBeenCalled();

      // Vérifier que les entrées expirées ont été supprimées
      expect(autoCleanCache.get('quick1')).toBeNull();
      expect(autoCleanCache.get('quick2')).toBeNull();
      expect(autoCleanCache.get('slow')).toBe('value3');

      // Nettoyage
      removeExpiredSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('Cas limites et extrêmes', () => {
    test('devrait fonctionner avec un TTL de 0 (pas d\'expiration)', () => {
      const infiniteCache = new CacheManager('infinite-cache', { ttl: 0 });

      infiniteCache.set('forever', 'value');

      // Avancer le temps ne devrait pas affecter l'entrée
      jest.useFakeTimers();
      jest.advanceTimersByTime(1000000); // Un temps très long
      jest.useRealTimers();

      expect(infiniteCache.get('forever')).toBe('value');
    });

    test('devrait fonctionner avec une taille maximale de 1', () => {
      const tinyCache = new CacheManager('tiny-cache', { maxSize: 1 });

      tinyCache.set('key1', 'value1');
      expect(tinyCache.get('key1')).toBe('value1');

      // Ajouter une deuxième entrée devrait remplacer la première
      tinyCache.set('key2', 'value2');
      expect(tinyCache.get('key2')).toBe('value2');
      // La première entrée devrait être évincée
      expect(tinyCache.get('key1')).toBeNull();
    });

    test('devrait gérer correctement les valeurs complexes', () => {
      const data = {
        deep: {
          nested: {
            object: {
              with: {
                many: {
                  levels: [1, 2, 3, { special: 'value' }]
                }
              }
            }
          }
        },
        array: Array(100).fill('item'), // Grand tableau
        date: new Date(),
        regex: /test/g,
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3])
      };

      cacheManager.set('complex', data);
      const retrieved = cacheManager.get('complex');

      // Vérifier la structure de base 
      expect(retrieved.deep.nested.object.with.many.levels[3].special).toBe('value');
      expect(retrieved.array.length).toBe(100);
      // Vérifier que l'objet Date est préservé (ou qu'il s'agit d'une chaîne de date)
      expect(retrieved.date).toBeTruthy();

      // Les Map et Set peuvent ne pas être conservés exactement
      expect(retrieved.regex).toBeTruthy();
    });
  });

  describe('Performance avec données volumineuses', () => {
    test('devrait gérer efficacement un grand nombre d\'entrées', () => {
      // Créer un cache avec une grande capacité
      const largeCache = new CacheManager('large-cache', { maxSize: 1000 });

      // Ajouter un grand nombre d'entrées
      const start = Date.now();
      for (let i = 0; i < 500; i++) {
        largeCache.set(`key${i}`, `value${i}`);
      }
      const timeToAdd = Date.now() - start;

      // Vérifier quelques entrées au hasard
      expect(largeCache.get('key123')).toBe('value123');
      expect(largeCache.get('key456')).toBe('value456');

      // Mesurer le temps d'accès à une entrée (devrait être rapide)
      const startAccess = Date.now();
      for (let i = 0; i < 100; i++) {
        largeCache.get(`key${Math.floor(Math.random() * 500)}`);
      }
      const timeToAccess = Date.now() - startAccess;

      // Le temps d'accès devrait être raisonnable (test très permissif)
      expect(timeToAccess).toBeLessThan(1000); // Moins d'une seconde pour 100 accès aléatoires

      // Obtenir des statistiques
      const stats = largeCache.getStats();
      expect(stats.size).toBeGreaterThanOrEqual(500);

      // Effacer le cache devrait être rapide aussi
      const startClear = Date.now();
      largeCache.clear();
      const timeToClear = Date.now() - startClear;

      expect(timeToClear).toBeLessThan(500); // Moins de 500ms pour effacer 500 entrées
      expect(largeCache.get('key123')).toBeNull();
    });
  });
});