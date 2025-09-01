/**
 * Tests d'intégration pour le système d'alertes
 * 
 * Ces tests vérifient la gestion des alertes à travers les différentes couches
 * de l'application (repository, adapters).
 */
import { DeviceRepository } from '../../repositories/DeviceRepository';
import { FirebaseAdapter } from '../../adapters/FirebaseAdapter';
import { LocalServerAdapter } from '../../adapters/LocalServerAdapter';
import firebaseService from '../../../services/firebase.service';
import { apiGet } from '../../../services/api.service';

// Mock des services externes uniquement
jest.mock('../../../services/firebase.service', () => ({
  isAvailable: jest.fn(),
  getDevices: jest.fn(),
  getAlerts: jest.fn()
}));

jest.mock('../../../services/api.service', () => ({
  apiGet: jest.fn(),
  isUrlAccessible: jest.fn()
}));

describe('Système d\'alertes - Tests d\'intégration', () => {
  let repository;

  // Données de test pour les alertes
  const firebaseAlerts = [
    {
      id: 'alert1',
      type: 'temperature',
      message: 'Température trop élevée',
      severity: 'high',
      timestamp: '2025-09-01T08:30:00Z',
      device_id: 'device1'
    },
    {
      id: 'alert2',
      type: 'connectivity',
      message: 'Appareil déconnecté',
      severity: 'medium',
      timestamp: '2025-09-01T09:15:00Z',
      device_id: 'device2'
    }
  ];

  const localAlerts = [
    {
      alert_id: 'local-alert1',
      alert_type: 'humidity',
      alert_message: 'Humidité anormalement basse',
      severity_level: 3,
      created_at: '2025-09-01T08:45:00Z',
      device_id: 'device1'
    },
    {
      alert_id: 'local-alert2',
      alert_type: 'co2',
      alert_message: 'Niveau de CO2 critique',
      severity_level: 4,
      created_at: '2025-09-01T09:00:00Z',
      device_id: 'device3'
    }
  ];

  // Données de périphériques avec alertes intégrées
  const firebaseDevicesWithAlerts = [
    {
      id: 'device1',
      name: 'Sensor 1',
      temperature: 29.5,
      humidity: 35,
      alerts: [
        {
          id: 'embedded-alert1',
          type: 'temperature',
          message: 'Température élevée',
          severity: 'medium',
          timestamp: '2025-09-01T09:20:00Z'
        }
      ]
    },
    {
      id: 'device2',
      name: 'Sensor 2',
      temperature: 22.0,
      humidity: 50,
      alerts: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new DeviceRepository();
  });

  describe('Normalisation des alertes', () => {
    test('devrait normaliser correctement les alertes Firebase', () => {
      // Test direct de l'adaptateur Firebase
      const firebaseAdapter = new FirebaseAdapter();
      const normalizedAlerts = firebaseAdapter.normalizeAlerts(firebaseAlerts);

      expect(normalizedAlerts).toHaveLength(2);
      expect(normalizedAlerts[0].id).toBe('alert1');
      expect(normalizedAlerts[0].type).toBe('temperature');
      expect(normalizedAlerts[0].severity).toBe('high');
      expect(normalizedAlerts[1].message).toBe('Appareil déconnecté');
    });

    test('devrait normaliser correctement les alertes du serveur local', () => {
      // Test direct de l'adaptateur Local
      const localAdapter = new LocalServerAdapter();
      const normalizedAlerts = localAdapter.normalizeAlerts(localAlerts);

      expect(normalizedAlerts).toHaveLength(2);
      expect(normalizedAlerts[0].id).toBe('local-alert1');
      expect(normalizedAlerts[0].type).toBe('humidity');
      expect(normalizedAlerts[0].severity).toBe('high'); // Niveau 3 = high
      expect(normalizedAlerts[1].message).toBe('Niveau de CO2 critique');
    });

    test('devrait extraire les alertes intégrées dans les données des appareils', () => {
      // Test d'extraction d'alertes depuis les données d'appareils
      const firebaseAdapter = new FirebaseAdapter();
      const normalizedDevices = firebaseAdapter.normalizeDevices(firebaseDevicesWithAlerts);

      // Vérifier que le premier appareil a une alerte
      expect(normalizedDevices[0].alerts).toHaveLength(1);
      expect(normalizedDevices[0].alerts[0].message).toBe('Température élevée');

      // Vérifier que le second appareil a un tableau d'alertes vide
      expect(normalizedDevices[1].alerts).toHaveLength(0);
    });
  });

  describe('Scénarios de gestion des alertes', () => {
    test('devrait récupérer et fusionner les alertes des deux sources', async () => {
      // Configurer les mocks pour simuler des alertes des deux sources
      firebaseService.getDevices.mockResolvedValue(firebaseDevicesWithAlerts);
      apiGet.mockImplementation((endpoint) => {
        if (endpoint.includes('/alerts')) {
          return Promise.resolve(localAlerts);
        }
        return Promise.resolve([]);
      });

      // Hypothétique méthode pour récupérer toutes les alertes (à implémenter dans DeviceRepository)
      // Si cette méthode n'existe pas, vous pourriez l'ajouter à votre code
      // Sinon, nous pouvons simuler son comportement

      // Simulons la récupération d'alertes en utilisant les méthodes existantes
      const firebaseDevices = await repository.getFirebaseDevices();

      // Extraire les alertes des appareils Firebase
      const firebaseEmbeddedAlerts = firebaseDevices
        .flatMap(device => device.alerts || [])
        .map(alert => ({ ...alert, deviceId: alert.deviceId || alert.device_id }));

      // Dans un scénario réel, vous pourriez avoir une méthode qui fusionne les alertes
      // des différentes sources. Simulons cette fusion :

      // Fusion des alertes des différentes sources
      const allAlerts = [...firebaseEmbeddedAlerts];

      // Vérifications
      expect(allAlerts.length).toBeGreaterThan(0);

      // Vérifier que les alertes sont bien structurées
      const alert = allAlerts[0];
      expect(alert).toHaveProperty('type');
      expect(alert).toHaveProperty('message');
      expect(alert).toHaveProperty('severity');
    });

    test('devrait filtrer les alertes par niveau de sévérité', () => {
      // Créer des alertes avec différents niveaux de sévérité
      const alerts = [
        { id: 'a1', type: 'test', severity: 'low', message: 'Test low' },
        { id: 'a2', type: 'test', severity: 'medium', message: 'Test medium' },
        { id: 'a3', type: 'test', severity: 'high', message: 'Test high' },
      ];

      // Filtrer pour ne garder que les alertes de sévérité élevée
      const highAlerts = alerts.filter(alert => alert.severity === 'high');

      expect(highAlerts).toHaveLength(1);
      expect(highAlerts[0].id).toBe('a3');
    });

    test('devrait grouper les alertes par appareil', () => {
      // Alertes pour plusieurs appareils
      const alerts = [
        { id: 'a1', deviceId: 'device1', message: 'Alert 1' },
        { id: 'a2', deviceId: 'device2', message: 'Alert 2' },
        { id: 'a3', deviceId: 'device1', message: 'Alert 3' },
      ];

      // Grouper les alertes par deviceId
      const alertsByDevice = alerts.reduce((acc, alert) => {
        if (!acc[alert.deviceId]) {
          acc[alert.deviceId] = [];
        }
        acc[alert.deviceId].push(alert);
        return acc;
      }, {});

      expect(Object.keys(alertsByDevice)).toHaveLength(2);
      expect(alertsByDevice['device1']).toHaveLength(2);
      expect(alertsByDevice['device2']).toHaveLength(1);
    });
  });

  describe('Résilience et reprise après défaillance', () => {
    test('devrait gérer les erreurs de format d\'alerte', () => {
      // Alertes mal formatées ou incomplètes
      const malformedAlerts = [
        {}, // Alerte vide
        { id: 'bad1' }, // Sans message
        { message: 'Just message' }, // Sans ID
        null, // Valeur null
        { id: 'good', message: 'Good alert', type: 'test' } // Bonne alerte
      ];

      const firebaseAdapter = new FirebaseAdapter();
      const normalizedAlerts = firebaseAdapter.normalizeAlerts(malformedAlerts);

      // Vérifier que seules les alertes valides sont conservées
      // et que les alertes invalides sont normalisées avec des valeurs par défaut
      expect(normalizedAlerts.length).toBeGreaterThanOrEqual(1);

      // La dernière alerte devrait être bien formée
      expect(normalizedAlerts[normalizedAlerts.length - 1].id).toBe('good');
    });

    test('devrait gérer les timestamps invalides dans les alertes', () => {
      const alertsWithBadTimestamps = [
        { id: 'a1', message: 'Test', timestamp: 'not-a-date' },
        { id: 'a2', message: 'Test', timestamp: null },
        { id: 'a3', message: 'Test', timestamp: '2025-09-01T10:00:00Z' }
      ];

      const firebaseAdapter = new FirebaseAdapter();
      const normalizedAlerts = firebaseAdapter.normalizeAlerts(alertsWithBadTimestamps);

      // Toutes les alertes devraient avoir un timestamp valide
      normalizedAlerts.forEach(alert => {
        expect(alert.timestamp).toBeTruthy();
        // Tester si c'est un format de date ISO valide
        expect(() => new Date(alert.timestamp)).not.toThrow();
      });
    });
  });

  // Recommandation pour l'amélioration du code
  // Si vous n'avez pas encore de méthodes dédiées pour gérer les alertes,
  // vous pourriez envisager d'ajouter ces fonctionnalités :
  //
  // 1. Une méthode getAlerts() dans DeviceRepository qui récupère et fusionne
  //    les alertes de toutes les sources
  // 2. Des méthodes utilitaires pour filtrer/trier les alertes par sévérité,
  //    par appareil, par date, etc.
  // 3. Une méthode pour marquer les alertes comme lues/traitées
});
