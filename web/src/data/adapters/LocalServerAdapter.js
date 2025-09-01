import { BaseAdapter } from './BaseAdapter';

/**
 * Adapter pour normaliser les données depuis le serveur local
 */
export class LocalServerAdapter extends BaseAdapter {
  constructor() {
    super('local');
  }

  /**
   * Normalise un device depuis le serveur local
   */
  normalizeDevice(serverData) {
    if (!serverData) return null;

    // Le serveur utilise des moyennes (avg_*)
    const temperature = this.cleanValue(
      serverData.last_temperature ||
      serverData.temp ||
      serverData.avg_temperature ||
      serverData.current_temperature ||
      serverData.temperature
    );

    const humidity = this.cleanValue(
      serverData.last_humidity ||
      serverData.rh ||
      serverData.avg_humidity ||
      serverData.current_humidity ||
      serverData.humidity
    );

    const co2 = this.cleanValue(
      serverData.avg_co2 ||
      serverData.current_co2 ||
      serverData.co2
    );

    const pressure = this.cleanValue(
      serverData.avg_pressure ||
      serverData.current_pressure ||
      serverData.pressure
    );

    return {
      // Identifiants
      id: serverData.sensor_id || serverData.device_id || serverData.id,
      name: serverData.room_name ? `${serverData.room_name} Sensor` : (serverData.device_name || serverData.name || 'Unknown Device'),

      // Données environnementales
      temperature,
      humidity,
      co2,
      pressure,

      // Qualité de l'air
      airQuality: this.calculateAirQuality(co2),

      // Métadonnées
      lastSeen: this.normalizeTimestamp(
        serverData.last_seen ||
        serverData.updated_at ||
        serverData.last_update ||
        serverData.timestamp
      ),
      status: this.normalizeStatus(serverData.status || serverData.device_status, serverData.is_online),
      room: serverData.room_name || serverData.location || 'Unknown',

      // Stats additionnelles du serveur
      stats: {
        minTemp: serverData.min_temperature,
        maxTemp: serverData.max_temperature,
        avgTemp: serverData.avg_temperature,
        readingsCount: serverData.readings_count,
        lastHourAvg: {
          temperature: serverData.last_hour_avg_temp,
          humidity: serverData.last_hour_avg_humidity,
          co2: serverData.last_hour_avg_co2
        }
      },

      // Alertes
      alerts: this.normalizeAlerts(serverData.alerts || serverData.active_alerts),

      // Debug info
      ...(process.env.NODE_ENV === 'development' && {
        _raw: serverData,
      }),
      _source: this.source
    };
  }

  /**
   * Normalise le statut depuis les codes du serveur
   */
  normalizeStatus(status, isOnline) {
    // Le serveur peut utiliser un boolean is_online
    if (isOnline !== undefined) {
      return isOnline ? 'active' : 'inactive';
    }

    // Le serveur utilise des codes numériques
    const statusMap = {
      1: 'active',
      0: 'inactive',
      '-1': 'error',
      2: 'warning',
      // Strings au cas où
      'online': 'active',
      'offline': 'inactive',
      'healthy': 'active',
      'error': 'error',
      'warning': 'warning'
    };

    return statusMap[status] || 'unknown';
  }

  /**
   * Calcule la qualité de l'air
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
   * Normalise les alertes du serveur
   */
  normalizeAlerts(alerts) {
    if (!alerts) return [];

    const alertsArray = Array.isArray(alerts) ? alerts : Object.values(alerts);

    return alertsArray.map(alert => ({
      id: alert.alert_id || alert.id,
      type: alert.alert_type || alert.type || 'info',
      message: alert.alert_message || alert.message,
      severity: this.normalizeSeverity(alert.severity_level || alert.severity),
      timestamp: this.normalizeTimestamp(alert.created_at || alert.timestamp),
      deviceId: alert.device_id
    }));
  }

  /**
   * Normalise les niveaux de sévérité
   */
  normalizeSeverity(severity) {
    if (typeof severity === 'number') {
      if (severity >= 3) return 'high';
      if (severity >= 2) return 'medium';
      return 'low';
    }
    return severity || 'low';
  }

  /**
   * Normalise une collection de devices
   */
  normalizeDevices(serverDevices) {
    if (!serverDevices) return [];

    // Le serveur retourne généralement un array
    const devices = serverDevices.data || serverDevices.devices || serverDevices;

    if (!Array.isArray(devices)) {
      return Object.values(devices)
        .map(device => this.normalizeDevice(device))
        .filter(Boolean);
    }

    return devices
      .map(device => this.normalizeDevice(device))
      .filter(Boolean);
  }

  /**
   * Normalise les readings historiques
   */
  normalizeReadings(serverReadings) {
    if (!serverReadings) return [];

    const readings = serverReadings.data || serverReadings.readings || serverReadings;
    const readingsArray = Array.isArray(readings) ? readings : Object.values(readings);

    return readingsArray.map(reading => this.normalizeReading(reading));
  }

  /**
   * Normalise une lecture individuelle
   */
  normalizeReading(reading) {
    if (!reading) return null;

    return {
      timestamp: this.normalizeTimestamp(reading.timestamp || reading.time),
      temperature: this.cleanValue(reading.temperature || reading.temp),
      humidity: this.cleanValue(reading.humidity || reading.rh),
      co2: this.cleanValue(reading.co2),
      pressure: this.cleanValue(reading.pressure),
      deviceId: reading.sensor_id || reading.device_id,
      ...(process.env.NODE_ENV === 'development' && {
        _raw: reading
      }),
      _source: this.source
    };
  }
}
