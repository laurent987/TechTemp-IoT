import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter pour normaliser les données depuis Firebase
 */
export class FirebaseAdapter extends BaseAdapter {
  constructor() {
    super('firebase');
  }

  /**
   * Normalise un device depuis Firebase
   * @param {Object} firebaseData - Données brutes de Firebase
   * @returns {Object|null} Device normalisé
   */
  normalizeDevice(firebaseData) {
    if (!firebaseData) return null;

    // Extraction des données avec fallbacks
    const extractValue = (possibleKeys) => {
      for (const key of possibleKeys) {
        if (firebaseData[key] !== undefined && firebaseData[key] !== null) {
          return this.cleanValue(firebaseData[key]);
        }
      }
      return null;
    };

    // Recherche extensive des données selon plusieurs formats possibles
    const temperature = extractValue([
      'temperature_immediate',
      'temp',
      'temperature',
      'last_temperature',
      'avg_temperature',
      'current_temperature',
      'temp_c',
      'value_temperature'
    ]);

    const humidity = extractValue([
      'humidity_immediate',
      'humidity',
      'last_humidity',
      'avg_humidity',
      'current_humidity',
      'rh',
      'value_humidity'
    ]);

    const co2 = extractValue([
      'co2_immediate',
      'co2',
      'carbon_dioxide',
      'last_co2',
      'avg_co2'
    ]);

    const pressure = extractValue([
      'pressure_immediate',
      'pressure',
      'barometric_pressure',
      'last_pressure',
      'avg_pressure'
    ]);

    return {
      // Identifiants
      id: firebaseData.id || firebaseData.uid || firebaseData.deviceId,
      name: firebaseData.name || firebaseData.device_name || 'Unknown Device',

      // Données environnementales
      temperature,
      humidity,
      co2,
      pressure,

      // Qualité de l'air calculée si disponible
      airQuality: this.calculateAirQuality(co2),

      // Métadonnées
      lastSeen: this.normalizeTimestamp(
        firebaseData.last_seen ||
        firebaseData.lastUpdate ||
        firebaseData.timestamp
      ),
      status: this.normalizeStatus(firebaseData.status, firebaseData.last_seen),
      room: firebaseData.room || firebaseData.location || 'Unknown',

      // Alertes si présentes
      alerts: this.normalizeAlerts(firebaseData.alerts),

      // Données brutes pour debug (seulement en dev)
      ...(process.env.NODE_ENV === 'development' && {
        _raw: firebaseData,
      }),
      _source: this.source
    };
  }

  /**
   * Normalise le statut d'un device
   */
  normalizeStatus(status, lastSeen) {
    // Si pas de statut, déterminer par lastSeen
    if (!status && lastSeen) {
      const lastSeenDate = new Date(lastSeen);
      const now = new Date();
      const diffMinutes = (now - lastSeenDate) / (1000 * 60);

      if (diffMinutes < 5) return 'active';
      if (diffMinutes < 30) return 'warning';
      return 'inactive';
    }

    // Mapping des statuts Firebase
    const statusMap = {
      'online': 'active',
      'offline': 'inactive',
      'error': 'error',
      'warning': 'warning',
      'active': 'active',
      'inactive': 'inactive'
    };

    return statusMap[status?.toLowerCase()] || 'unknown';
  }

  /**
   * Calcule la qualité de l'air basée sur le CO2
   */
  calculateAirQuality(co2) {
    if (!co2) return null;

    if (co2 < 400) return 'excellent';
    if (co2 < 1000) return 'good';
    if (co2 < 2000) return 'moderate';
    if (co2 < 5000) return 'poor';
    return 'hazardous';
  }

  /**
   * Normalise les alertes
   */
  normalizeAlerts(alerts) {
    if (!alerts) return [];

    const alertsArray = Array.isArray(alerts) ? alerts : Object.values(alerts);

    // Filtrer les alertes nulles ou invalides
    return alertsArray
      .filter(alert => alert != null)
      .map(alert => ({
        id: alert.id || alert.uid || `auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: alert.type || 'info',
        message: alert.message || alert.text || 'Alert information not available',
        severity: alert.severity || 'low',
        timestamp: this.normalizeTimestamp(alert.timestamp || alert.created_at || new Date().toISOString()),
        deviceId: alert.device_id || alert.deviceId || 'unknown'
      }));
  }

  /**
   * Normalise une collection de devices
   */
  normalizeDevices(firebaseDevices) {
    if (!firebaseDevices) return [];

    // Firebase peut retourner un objet ou un array
    const devicesArray = Array.isArray(firebaseDevices)
      ? firebaseDevices
      : Object.entries(firebaseDevices).map(([id, device]) => ({
        ...device,
        id: device.id || id
      }));

    return devicesArray
      .map(device => this.normalizeDevice(device))
      .filter(Boolean); // Enlever les null
  }

  /**
   * Normalise les readings historiques
   */
  normalizeReadings(firebaseReadings) {
    if (!firebaseReadings) return [];

    const readingsArray = Array.isArray(firebaseReadings)
      ? firebaseReadings
      : Object.values(firebaseReadings);

    return readingsArray.map(reading => ({
      timestamp: this.normalizeTimestamp(reading.timestamp || reading.time),
      temperature: this.cleanValue(reading.temperature_immediate || reading.temp),
      humidity: this.cleanValue(reading.humidity_immediate || reading.humidity),
      co2: this.cleanValue(reading.co2_immediate || reading.co2),
      pressure: this.cleanValue(reading.pressure_immediate || reading.pressure),
      deviceId: reading.device_id || reading.deviceId,
      ...(process.env.NODE_ENV === 'development' && {
        _raw: reading
      }),
      _source: this.source
    }));
  }
}
