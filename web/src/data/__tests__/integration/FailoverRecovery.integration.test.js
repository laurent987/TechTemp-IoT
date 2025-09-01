/**
 * Tests d'intégration pour les scénarios de reprise après défaillance
 * 
 * Ces tests vérifient comment l'application se comporte lors de différents
 * types de défaillances (réseau, services, etc.) et comment elle récupère.
 */
import { DeviceRepository } from '../../repositories/DeviceRepository';
import firebaseService from '../../../services/firebase.service';
import { apiGet, isUrlAccessible } from '../../../services/api.service';
import { CacheManager } from '../../cache/CacheManager';

// Mock des services externes
jest.mock('../../../services/firebase.service', () => ({
  isAvailable: jest.fn(),
  getDevices: jest.fn()
}));

jest.mock('../../../services/api.service', () => ({
  apiGet: jest.fn(),
  isUrlAccessible: jest.fn()
}));

describe('Reprise après défaillance - Tests d\'intégration', () => {
  let repository;

  // Données de test
  const testDevices = [
    { id: 'device1', name: 'Device 1', temperature: 22.5 },
    { id: 'device2', name: 'Device 2', temperature: 23.1 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Créer un repository avec un cache à TTL court pour les tests
    repository = new DeviceRepository();
    repository.cache = new CacheManager('test-failover', {
      ttl: 500, // 500ms pour les tests
      maxSize: 10,
      autoCleanup: false
    });
  });

  describe('Défaillance des services', () => {
    test('devrait basculer de Firebase vers serveur local quand Firebase échoue', async () => {
      // Première configuration : Firebase OK
      firebaseService.isAvailable.mockResolvedValue(true);
      firebaseService.getDevices.mockResolvedValueOnce(testDevices);

      // Serveur local disponible
      isUrlAccessible.mockResolvedValue(true);
      apiGet.mockResolvedValue(testDevices);

      // Appel initial, devrait utiliser Firebase
      await repository.getDevices({ source: 'auto' });
      expect(firebaseService.getDevices).toHaveBeenCalled();

      // Maintenant, simuler une défaillance de Firebase
      firebaseService.isAvailable.mockResolvedValueOnce(false);

      // Important : forcer le vidage du cache pour ce test
      repository.cache.clear();

      // Réinitialiser le mock de getDevices mais garder isAvailable
      firebaseService.getDevices.mockClear();

      // Deuxième appel, devrait utiliser le serveur local
      await repository.getDevices({ source: 'auto' });
      expect(apiGet).toHaveBeenCalled();
    });

    test('devrait gérer une défaillance complète de tous les services', async () => {
      // Première configuration : Firebase OK pour remplir le cache
      firebaseService.isAvailable.mockResolvedValueOnce(true);
      firebaseService.getDevices.mockResolvedValueOnce(testDevices);

      // Appel initial pour remplir le cache
      const initialDevices = await repository.getDevices({ source: 'auto' });

      // Maintenant, simuler une défaillance de tous les services
      firebaseService.isAvailable.mockResolvedValue(false);
      isUrlAccessible.mockResolvedValue(false);
      firebaseService.getDevices.mockRejectedValue(new Error('Service unavailable'));
      apiGet.mockRejectedValue(new Error('Service unavailable'));

      // Deuxième appel, devrait utiliser le cache
      const devicesFromCache = await repository.getDevices({ source: 'auto' });

      // Les données devraient venir du cache
      expect(devicesFromCache).toEqual(initialDevices);
    });
  });

  describe('Problèmes réseau', () => {
    test('devrait gérer les timeouts', async () => {
      // Simuler un timeout réseau pour Firebase
      firebaseService.getDevices.mockImplementationOnce(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      // Serveur local OK
      isUrlAccessible.mockResolvedValueOnce(true);
      apiGet.mockResolvedValueOnce(testDevices);

      // L'appel devrait basculer vers le serveur local
      const devices = await repository.getDevices({ source: 'auto', fallbackEnabled: true });

      // Vérifier que le fallback a été utilisé
      expect(apiGet).toHaveBeenCalled();
      expect(devices).toHaveLength(2);
    });

    test('devrait gérer les erreurs 404', async () => {
      // Simuler une erreur 404 sur Firebase
      firebaseService.getDevices.mockRejectedValueOnce(new Error('Not Found (404)'));

      // Serveur local OK
      isUrlAccessible.mockResolvedValueOnce(true);
      apiGet.mockResolvedValueOnce(testDevices);

      // L'appel devrait basculer vers le serveur local
      const devices = await repository.getDevices({ source: 'auto', fallbackEnabled: true });

      // Vérifier que le fallback a été utilisé
      expect(apiGet).toHaveBeenCalled();
      expect(devices).toHaveLength(2);
    });

    test('devrait gérer les erreurs de connexion', async () => {
      // Simuler une erreur de connexion pour les deux services
      firebaseService.getDevices.mockRejectedValueOnce(new Error('Connection refused'));
      apiGet.mockRejectedValueOnce(new Error('Connection refused'));

      // Mais d'abord, remplir le cache
      repository.cache.set('devices_auto', testDevices);

      // L'appel devrait retourner les données du cache
      const devices = await repository.getDevices({ source: 'auto' });

      // Vérifier que les données sont toujours disponibles
      expect(devices).toEqual(testDevices);
    });
  });

  describe('Stratégies de résilience', () => {
    test('devrait revenir aux services après une défaillance temporaire', async () => {
      // Première configuration : tout échoue
      firebaseService.isAvailable.mockResolvedValueOnce(false);
      isUrlAccessible.mockResolvedValueOnce(false);

      // Mais le cache est rempli
      repository.cache.set('devices_auto', testDevices);

      // Premier appel, utilise le cache
      await repository.getDevices({ source: 'auto' });

      // Maintenant, les services reviennent
      firebaseService.isAvailable.mockResolvedValueOnce(true);
      firebaseService.getDevices.mockResolvedValueOnce([
        ...testDevices,
        { id: 'device3', name: 'New Device', temperature: 24.0 } // Nouvelle donnée
      ]);

      // Réinitialiser les mocks
      jest.clearAllMocks();

      // Deuxième appel avec forceRefresh, devrait contacter le service
      const updatedDevices = await repository.getDevices({ source: 'auto', forceRefresh: true });

      // Vérifier que Firebase a été appelé
      expect(firebaseService.getDevices).toHaveBeenCalled();

      // Et que les nouvelles données sont présentes
      expect(updatedDevices).toHaveLength(3);
      expect(updatedDevices[2].id).toBe('device3');
    });

    test('devrait continuer à fonctionner après l\'expiration du cache', async () => {
      // Remplir le cache
      repository.cache.set('devices_auto', testDevices);

      // Attendre que le cache expire
      await new Promise(resolve => setTimeout(resolve, 600)); // > TTL

      // Simuler une récupération réussie après l'expiration
      firebaseService.isAvailable.mockResolvedValueOnce(true);
      firebaseService.getDevices.mockResolvedValueOnce(testDevices);

      // L'appel devrait récupérer de nouvelles données
      const devices = await repository.getDevices({ source: 'auto' });

      // Vérifier que Firebase a été appelé
      expect(firebaseService.getDevices).toHaveBeenCalled();

      // Et que les données sont toujours disponibles
      expect(devices).toHaveLength(2);
    });
  });

  describe('Scénarios complexes', () => {
    test('devrait gérer les pannes intermittentes', async () => {
      // Configuration : Firebase intermittent (marche 1 fois sur 2)
      let callCount = 0;
      firebaseService.getDevices.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          return Promise.resolve(testDevices);
        } else {
          return Promise.reject(new Error('Service temporarily unavailable'));
        }
      });

      // Serveur local toujours disponible
      isUrlAccessible.mockResolvedValue(true);
      apiGet.mockResolvedValue(testDevices);

      // Simuler plusieurs appels
      for (let i = 0; i < 4; i++) {
        const devices = await repository.getDevices({ source: 'auto', forceRefresh: true });

        // Les données devraient toujours être disponibles
        expect(devices).toHaveLength(2);

        // Réinitialiser les mocks sauf getDevices (qui garde son compteur)
        jest.clearAllMocks();
        jest.spyOn(firebaseService, 'getDevices').mockImplementation(firebaseService.getDevices);
      }
    });

    test('devrait gérer le cas où les données sont obsolètes partout', async () => {
      // Scénario : données en cache obsolètes, services indisponibles

      // 1. Remplir le cache avec des données obsolètes
      const obsoleteDevices = [
        { id: 'device1', name: 'Old Device 1', temperature: 20.0 }
      ];
      repository.cache.set('devices_auto', obsoleteDevices);

      // 2. Simuler des services indisponibles
      firebaseService.isAvailable.mockResolvedValue(false);
      isUrlAccessible.mockResolvedValue(false);

      // 3. Appel au repository
      const devices = await repository.getDevices({ source: 'auto' });

      // Même des données obsolètes sont meilleures que rien
      expect(devices).toEqual(obsoleteDevices);
    });
  });

  // Recommandations pour l'amélioration du code
  // 
  // 1. Implémentez un mécanisme de retry configurable pour les appels réseau
  // 2. Ajoutez un "circuit breaker" pour éviter de surcharger les services en échec
  // 3. Considérez un mécanisme de synchronisation en arrière-plan pour actualiser le cache
  //    périodiquement, afin de toujours avoir des données récentes
});
