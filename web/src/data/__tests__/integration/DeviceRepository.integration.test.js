/**
 * Tests d'intégration pour DeviceRepository
 * 
 * Ces tests vérifient le fonctionnement du repository avec ses dépendances réelles
 * (adapters et cache) au lieu d'utiliser des mocks.
 */
import { DeviceRepository } from '../../repositories/DeviceRepository';
import { CacheManager } from '../../cache/CacheManager';
import firebaseService from '../../../services/firebase.service';
import { apiGet, isUrlAccessible } from '../../../services/api.service';

// Nous allons partiellement mocker les services externes
// mais utiliser les adaptateurs et cache réels
jest.mock('../../../services/firebase.service', () => ({
  isAvailable: jest.fn(),
  getDevices: jest.fn()
}));

jest.mock('../../../services/api.service', () => ({
  apiGet: jest.fn(),
  isUrlAccessible: jest.fn()
}));

describe('DeviceRepository - Tests d\'intégration', () => {
  let repository;

  // Données de test
  const firebaseDevices = [
    { id: 'device1', name: 'Device 1', temperature_immediate: 22.5, humidity_immediate: 45 },
    { id: 'device2', name: 'Device 2', temp: 23.1, humidity: 50 }
  ];

  const localDevices = [
    { sensor_id: 'device1', room_name: 'Living Room', last_temperature: 22.7, last_humidity: 46 },
    { device_id: 'device2', room_name: 'Bedroom', current_temperature: 23.2, current_humidity: 51 }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Créer une instance réelle du repository
    repository = new DeviceRepository();

    // Injecter un vrai CacheManager avec TTL court pour les tests
    repository.cache = new CacheManager('test-device-repo', {
      ttl: 500,  // 500ms pour accélérer les tests
      maxSize: 10,
      autoCleanup: false
    });
  });

  describe('Intégration avec adaptateurs réels', () => {
    test('devrait normaliser correctement les données Firebase avec l\'adaptateur réel', async () => {
      // Configuration du mock externe
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      // Appel au repository
      const devices = await repository.getFirebaseDevices();

      // Vérification que la normalisation a fonctionné correctement
      expect(devices).toHaveLength(2);
      expect(devices[0].id).toBe('device1');
      expect(devices[0].temperature).toBe(22.5);
      expect(devices[1].id).toBe('device2');
      expect(devices[1].temperature).toBe(23.1);
      expect(devices[0]._source).toBe('firebase');
    });

    test('devrait normaliser correctement les données du serveur local avec l\'adaptateur réel', async () => {
      // Configuration du mock externe
      apiGet.mockResolvedValue(localDevices);

      // Appel au repository
      const devices = await repository.getLocalDevices();

      // Vérification que la normalisation a fonctionné correctement
      expect(devices).toHaveLength(2);
      expect(devices[0].id).toBe('device1');
      expect(devices[0].name).toBe('Living Room Sensor');
      expect(devices[1].id).toBe('device2');
      expect(devices[1].name).toBe('Bedroom Sensor');
      expect(devices[0]._source).toBe('local');
    });

    test('devrait fusionner correctement les données des deux sources', async () => {
      // Configuration des mocks externes
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);
      apiGet.mockResolvedValue(localDevices);

      // Appel à la méthode de fusion
      const mergedDevices = await repository.getMergedDevices();

      // Vérifications
      expect(mergedDevices).toHaveLength(2);

      // Vérifier que les données sont fusionnées correctement
      const device1 = mergedDevices.find(d => d.id === 'device1');
      expect(device1).toBeTruthy();

      // Device1 devrait avoir des propriétés des deux sources
      // Priorité aux données temps réel de Firebase
      expect(device1.temperature).toBe(22.5);
      // Mais avec les statistiques du serveur local
      expect(device1.name).toBe('Device 1'); // Correction: Firebase est prioritaire pour les noms
    });
  });

  describe('Intégration avec cache réel', () => {
    test('devrait mettre en cache et récupérer depuis le cache', async () => {
      // Premier appel - pas de cache
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);

      await repository.getDevices({ source: 'firebase' });
      expect(firebaseService.getDevices).toHaveBeenCalledTimes(1);

      // Deuxième appel - devrait utiliser le cache
      firebaseService.getDevices.mockClear();
      const cachedDevices = await repository.getDevices({ source: 'firebase' });

      expect(firebaseService.getDevices).not.toHaveBeenCalled();
      expect(cachedDevices).toHaveLength(2);
    });

    test('devrait respecter l\'option forceRefresh', async () => {
      // Premier appel - pas de cache
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);
      await repository.getDevices({ source: 'firebase' });

      // Deuxième appel avec forceRefresh
      firebaseService.getDevices.mockClear();
      await repository.getDevices({ source: 'firebase', forceRefresh: true });

      // Le service devrait être appelé à nouveau
      expect(firebaseService.getDevices).toHaveBeenCalledTimes(1);
    });

    test('devrait effacer le cache correctement', async () => {
      // Remplir le cache
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);
      await repository.getDevices({ source: 'firebase' });

      // Effacer le cache
      repository.clearCache();

      // Vérifier que le service est rappelé
      firebaseService.getDevices.mockClear();
      await repository.getDevices({ source: 'firebase' });
      expect(firebaseService.getDevices).toHaveBeenCalledTimes(1);
    });

    test('devrait expirer le cache après le TTL', async () => {
      // Remplir le cache
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);
      await repository.getDevices({ source: 'firebase' });

      // Attendre l'expiration du cache
      await new Promise(resolve => setTimeout(resolve, 600)); // Légèrement plus que le TTL

      // Vérifier que le service est rappelé
      firebaseService.getDevices.mockClear();
      await repository.getDevices({ source: 'firebase' });
      expect(firebaseService.getDevices).toHaveBeenCalledTimes(1);
    });
  });

  describe('Scénarios réels', () => {
    test('devrait utiliser le cache comme fallback en cas d\'erreur', async () => {
      // Premier appel réussi pour remplir le cache
      firebaseService.getDevices.mockResolvedValue(firebaseDevices);
      const initialDevices = await repository.getDevices({ source: 'firebase' });

      // Simuler une erreur réseau
      firebaseService.getDevices.mockRejectedValue(new Error('Network error'));

      // Le deuxième appel devrait utiliser les données en cache
      const devicesAfterError = await repository.getDevices({ source: 'firebase' });

      expect(devicesAfterError).toEqual(initialDevices);
    });

    test('devrait basculer d\'une source à l\'autre en mode auto si la première échoue', async () => {
      // Firebase indisponible
      firebaseService.isAvailable.mockResolvedValue(false);
      // Local disponible
      isUrlAccessible.mockResolvedValue(true);
      // Données locales
      apiGet.mockResolvedValue(localDevices);

      // Appel en mode auto
      const devices = await repository.getDevices({ source: 'auto' });

      // Devrait utiliser le serveur local
      expect(apiGet).toHaveBeenCalled();
      expect(devices[0]._source).toBe('local');
    });
  });
});
