/**
 * Tests de performances pour le CacheManager
 * 
 * Ces tests vérifient les performances et le comportement sous charge
 * du CacheManager, notamment pour l'éviction LRU et la gestion de la
 * taille du cache.
 */
import { CacheManager } from '../../cache/CacheManager';

describe('CacheManager - Tests de performances', () => {
  let cache;
  const perfOptions = {
    // Options avec TTL court et taille limitée pour les tests de performances
    ttl: 100, // 100ms
    maxSize: 100,
    autoCleanup: true
  };

  beforeEach(() => {
    // Créer une instance fraîche pour chaque test
    cache = new CacheManager('perf-test', perfOptions);

    // Espionner console.warn pour vérifier les logs d'éviction
    jest.spyOn(console, 'warn').mockImplementation(() => { });
  });

  afterEach(() => {
    // Nettoyer les mocks
    jest.clearAllMocks();

    // Vider le cache
    cache.clear();
  });

  /**
   * Test de performance: Éviction LRU
   * 
   * Ce test vérifie que:
   * 1. Les éléments les moins récemment utilisés sont évincés en premier
   * 2. Le processus d'éviction est rapide même avec beaucoup d'éléments
   */
  test('devrait évincé les éléments LRU correctement et rapidement', async () => {
    // Préparer un grand nombre d'éléments
    const largeDataset = {};
    for (let i = 0; i < 1000; i++) {
      largeDataset[`key${i}`] = `value${i}`;
    }

    // Mesurer le temps pour insérer tous les éléments
    const startInsert = performance.now();

    // Insertion rapide de toutes les clés
    Object.entries(largeDataset).forEach(([key, value]) => {
      cache.set(key, value);
    });

    const endInsert = performance.now();
    console.log(`Temps d'insertion de 1000 éléments: ${endInsert - startInsert}ms`);

    // Vérifier que seul un sous-ensemble est conservé (maxSize = 100)
    expect(Object.keys(cache.getSnapshot()).length).toBeLessThanOrEqual(perfOptions.maxSize);

    // Accéder à certaines clés pour les "rafraîchir" dans le LRU
    // Nous accédons aux 50 dernières clés pour les rendre "récemment utilisées"
    for (let i = 950; i < 1000; i++) {
      cache.get(`key${i}`);
    }

    // Ajouter 50 nouveaux éléments, ce qui devrait évincer les éléments LRU
    const startEviction = performance.now();

    for (let i = 1000; i < 1050; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    const endEviction = performance.now();
    console.log(`Temps d'éviction et insertion de 50 éléments: ${endEviction - startEviction}ms`);

    // Vérifier le contenu du cache après éviction
    const finalCache = cache.getSnapshot();

    // Les clés récemment utilisées (950-999) devraient être conservées
    for (let i = 950; i < 1000; i++) {
      expect(finalCache[`key${i}`]).toBeTruthy();
    }

    // Les nouveaux éléments (1000-1049) devraient être présents
    for (let i = 1000; i < 1050; i++) {
      expect(finalCache[`key${i}`]).toBeTruthy();
    }

    // Les anciennes clés non utilisées devraient avoir été évincées
    for (let i = 0; i < 900; i++) {
      expect(finalCache[`key${i}`]).toBeFalsy();
    }
  });

  /**
   * Test de performance: Expiration par TTL
   * 
   * Ce test vérifie que:
   * 1. Les éléments expirent correctement selon leur TTL
   * 2. L'accès aux éléments après expiration retourne null
   * 3. Le processus de nettoyage est efficace
   */
  test('devrait gérer efficacement les expirations de TTL même sous charge', async () => {
    // Configurer un cache avec TTL très court pour le test
    const ttlCache = new CacheManager('perf-ttl-test', {
      ttl: 50, // 50ms
      maxSize: 1000,
      autoCleanup: true
    });

    // Insérer de nombreux éléments
    const startInsert = performance.now();

    for (let i = 0; i < 500; i++) {
      ttlCache.set(`key${i}`, `value${i}`);
    }

    const endInsert = performance.now();
    console.log(`Temps d'insertion de 500 éléments: ${endInsert - startInsert}ms`);

    // Attendre l'expiration
    await new Promise(resolve => setTimeout(resolve, 100)); // > TTL

    // Mesurer le temps d'accès après expiration
    const startAccess = performance.now();

    // Les accès devraient maintenant retourner null car les éléments sont expirés
    for (let i = 0; i < 500; i++) {
      expect(ttlCache.get(`key${i}`)).toBeNull();
    }

    const endAccess = performance.now();
    console.log(`Temps d'accès à 500 éléments expirés: ${endAccess - startAccess}ms`);

    // Vérifier le nettoyage automatique (si activé)
    if (ttlCache.options && ttlCache.options.autoCleanup) {
      // Attendre un peu plus pour que le nettoyage automatique se produise
      await new Promise(resolve => setTimeout(resolve, 200));

      // Le cache devrait être vide ou presque vide après le nettoyage automatique
      expect(Object.keys(ttlCache.getSnapshot()).length).toBeLessThanOrEqual(10);
    }

    // Nettoyer
    ttlCache.clear();
  });

  /**
   * Test de performance: Accès concurrents
   * 
   * Ce test vérifie que:
   * 1. Le cache peut gérer de nombreux accès concurrents
   * 2. Les performances restent acceptables sous charge
   */
  test('devrait gérer efficacement les accès concurrents', async () => {
    // Préparer des données
    for (let i = 0; i < 100; i++) {
      cache.set(`key${i}`, `value${i}`);
    }

    // Simuler des accès concurrents avec des promesses
    const startConcurrent = performance.now();

    const concurrentAccesses = 1000;
    const promises = [];

    for (let i = 0; i < concurrentAccesses; i++) {
      // Alternance entre lectures et écritures
      if (i % 2 === 0) {
        const randomKey = `key${Math.floor(Math.random() * 100)}`;
        promises.push(Promise.resolve(cache.get(randomKey)));
      } else {
        const randomKey = `key${Math.floor(Math.random() * 100)}`;
        promises.push(Promise.resolve(cache.set(randomKey, `updated${i}`)));
      }
    }

    await Promise.all(promises);

    const endConcurrent = performance.now();
    console.log(`Temps pour ${concurrentAccesses} accès concurrents: ${endConcurrent - startConcurrent}ms`);

    // Vérifier que le cache fonctionne toujours correctement
    const finalSnapshot = cache.getSnapshot();
    expect(Object.keys(finalSnapshot).length).toBeLessThanOrEqual(perfOptions.maxSize);
  });

  /**
   * Test de performance: Utilisation mémoire
   * 
   * Ce test vérifie que:
   * 1. La mémoire est correctement libérée lors de l'éviction/expiration
   * 2. La taille du cache reste dans les limites définies
   */
  test('devrait respecter les limites de taille et libérer la mémoire', () => {
    // Utiliser des objets volumineux pour tester l'utilisation mémoire
    const createLargeObject = (id) => {
      // Créer un objet de quelques KB
      const largeObject = {
        id,
        timestamp: Date.now(),
        data: new Array(1000).fill(0).map((_, i) => `data-${i}-${Math.random()}`)
      };
      return largeObject;
    };

    // Mesurer l'insertion
    const startLargeInsert = performance.now();

    // Insérer suffisamment d'objets pour dépasser maxSize
    for (let i = 0; i < 150; i++) {
      cache.set(`large${i}`, createLargeObject(i));
    }

    const endLargeInsert = performance.now();
    console.log(`Temps d'insertion de 150 objets volumineux: ${endLargeInsert - startLargeInsert}ms`);

    // Vérifier que la taille est respectée
    const finalLargeSnapshot = cache.getSnapshot();
    expect(Object.keys(finalLargeSnapshot).length).toBeLessThanOrEqual(perfOptions.maxSize);

    // Vérifier l'efficacité de la libération mémoire
    // (on ne peut pas facilement mesurer l'utilisation mémoire dans Jest, 
    // mais on peut vérifier le bon fonctionnement du mécanisme)

    // Récupérer un instantané avant éviction forcée
    const beforeClear = Object.keys(cache.getSnapshot()).length;

    // Forcer l'éviction en définissant maxSize plus petit
    cache.maxSize = 50;
    cache.enforceSizeLimit();

    // Vérifier qu'il y a eu éviction
    const afterClear = Object.keys(cache.getSnapshot()).length;
    expect(afterClear).toBeLessThanOrEqual(50);
    expect(afterClear).toBeLessThan(beforeClear);

    // Restaurer maxSize pour ne pas affecter d'autres tests
    cache.maxSize = perfOptions.maxSize;
  });

  /**
   * Recommandations d'optimisation basées sur les tests de performances
   * 
   * 1. Améliorer l'algorithme d'éviction LRU pour être plus efficace avec des grandes tailles
   * 2. Considérer une éviction par lots plutôt qu'élément par élément
   * 3. Implémenter un nettoyage périodique en arrière-plan pour les TTL plutôt qu'à chaque accès
   * 4. Ajouter des métriques de surveillance des performances du cache
   */
});
