import { useMemo } from 'react';

/**
 * Calcule la différence en heures entre maintenant et un timestamp
 * @param {number|string} timestamp - Timestamp à comparer
 * @returns {number|null} Différence en heures, ou null si invalide
 */
const getHoursSinceTimestamp = (timestamp) => {
  if (!timestamp) return null;

  let date;
  if (typeof timestamp === 'number') {
    // Timestamp Unix (secondes) - convertir en millisecondes
    date = new Date(timestamp * 1000);
  } else {
    // Format string (ISO)
    date = new Date(timestamp);
  }

  // Vérifier que la date est valide
  if (isNaN(date.getTime())) {
    console.warn(`Timestamp invalide:`, timestamp);
    return null;
  }

  const now = new Date();
  return (now - date) / (1000 * 60 * 60);
};

/**
 * Transforme les données du device pour uniformiser les champs selon le mode
 * @param {Object} device - Les données brutes du device
 * @param {boolean} useRealTime - Mode temps réel (true) ou Firebase (false)
 * @returns {Object} Device avec des champs uniformisés
 */
const transformDeviceData = (device, useRealTime) => {
  // Déterminer quels champs utiliser selon le mode
  let temperature, humidity;

  if (useRealTime) {
    // Mode temps réel : utiliser last_temperature/last_humidity
    temperature = device.last_temperature;
    humidity = device.last_humidity;
  } else {
    // Mode Firebase : utiliser avg_temperature/avg_humidity
    temperature = device.avg_temperature;
    humidity = device.avg_humidity;
  }

  return {
    ...device,
    temperature: temperature,
    humidity: humidity,
    temperaturePrecision: useRealTime ? 1 : 1,
    humidityPrecision: useRealTime ? 0 : 1,
    _original: {
      last_temperature: device.last_temperature,
      avg_temperature: device.avg_temperature,
      last_humidity: device.last_humidity,
      avg_humidity: device.avg_humidity
    }
  };
};

/**
 * Transforme une liste de devices
 * @param {Array} devices - Liste des devices
 * @param {boolean} useRealTime - Mode temps réel ou Firebase
 * @returns {Array} Liste des devices transformés
 */
const transformDevicesData = (devices, useRealTime) => {
  if (!devices || !Array.isArray(devices)) {
    return [];
  }
  return devices.map(device => transformDeviceData(device, useRealTime));
};

/**
 * Valide qu'un device a les champs requis
 * @param {Object} device - Device à valider
 * @returns {boolean} True si le device est valide
 */
const validateDeviceData = (device) => {
  const requiredFields = ['sensor_id', 'room_name', 'room_id', 'status', 'last_seen'];
  return requiredFields.every(field => device && device[field] !== undefined);
};

/**
 * Obtient un device avec des valeurs par défaut si certains champs manquent
 * @param {Object} device - Device potentiellement incomplet
 * @returns {Object} Device avec des valeurs par défaut
 */
const getDeviceWithDefaults = (device) => {
  return {
    sensor_id: device.sensor_id || 'unknown',
    room_name: device.room_name || 'Salle inconnue',
    room_id: device.room_id || 'N/A',
    status: device.status || 'unknown',
    last_seen: device.last_seen || new Date().toISOString(),
    temperature: device.temperature ?? null,
    humidity: device.humidity ?? null,
    temperaturePrecision: device.temperaturePrecision || 1,
    humidityPrecision: device.humidityPrecision || 1,
    ...device
  };
};

/**
 * Hook personnalisé pour gérer les données des devices
 * @param {Array} rawDevices - Données brutes des devices
 * @param {boolean} useRealTime - Mode temps réel ou Firebase
 * @returns {Object} Données transformées et métadonnées
 */
export const useDevicesData = (rawDevices, useRealTime) => {
  const processedData = useMemo(() => {
    if (!rawDevices || !Array.isArray(rawDevices)) {
      return {
        devices: [],
        validDevices: [],
        invalidDevices: [],
        stats: {
          total: 0,
          valid: 0,
          invalid: 0,
          online: 0,
          offline: 0
        }
      };
    }

    // Valider et nettoyer les données
    const validDevices = [];
    const invalidDevices = [];

    rawDevices.forEach((device, index) => {
      if (validateDeviceData(device)) {
        validDevices.push(getDeviceWithDefaults(device));
      } else {
        console.warn(`Device à l'index ${index} invalide:`, device);
        invalidDevices.push(device);
      }
    });

    // Transformer les données valides
    const transformedDevices = transformDevicesData(validDevices, useRealTime);

    // Trier les devices pour maintenir un ordre cohérent
    // Tri par room_name puis par sensor_id pour assurer la cohérence
    const sortedDevices = transformedDevices.sort((a, b) => {
      // D'abord trier par nom de pièce
      const roomComparison = (a.room_name || '').localeCompare(b.room_name || '');
      if (roomComparison !== 0) return roomComparison;

      // Ensuite par sensor_id si même pièce
      return (a.sensor_id || 0) - (b.sensor_id || 0);
    });

    // Calculer les statistiques
    const onlineDevices = sortedDevices.filter(d => d.status === 'online' || d.status === 'healthy');
    const stats = {
      total: sortedDevices.length,
      valid: validDevices.length,
      invalid: invalidDevices.length,
      online: onlineDevices.length,
      offline: sortedDevices.length - onlineDevices.length
    };

    return {
      devices: sortedDevices,
      validDevices,
      invalidDevices,
      stats
    };
  }, [rawDevices, useRealTime]);

  return processedData;
};

/**
 * Hook pour obtenir un device spécifique par ID
 * @param {Array} devices - Liste des devices
 * @param {number|string} deviceId - ID du device recherché
 * @returns {Object|null} Device trouvé ou null
 */
export const useDeviceById = (devices, deviceId) => {
  return useMemo(() => {
    if (!devices || !Array.isArray(devices) || !deviceId) {
      return null;
    }

    return devices.find(device =>
      device.sensor_id === deviceId ||
      device.sensor_id === parseInt(deviceId)
    ) || null;
  }, [devices, deviceId]);
};

/**
 * Hook pour filtrer les devices par statut
 * @param {Array} devices - Liste des devices
 * @param {string|Array} status - Statut(s) à filtrer
 * @returns {Array} Devices filtrés
 */
export const useDevicesByStatus = (devices, status) => {
  return useMemo(() => {
    if (!devices || !Array.isArray(devices) || !status) {
      return [];
    }

    const statusArray = Array.isArray(status) ? status : [status];

    return devices.filter(device =>
      statusArray.includes(device.status)
    );
  }, [devices, status]);
};

/**
 * Hook pour obtenir les alertes des devices
 * @param {Array} devices - Liste des devices
 * @returns {Array} Liste des alertes
 */
export const useDeviceAlerts = (devices) => {
  return useMemo(() => {
    if (!devices || !Array.isArray(devices)) {
      return [];
    }

    const alerts = [];

    devices.forEach(device => {
      // Alerte si device offline
      if (device.status !== 'online' && device.status !== 'healthy') {
        alerts.push({
          type: 'Device Offline',
          level: 'error',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Le device ${device.sensor_id} (${device.room_name}) est hors ligne`
        });
      }

      // Alerte si dernière lecture trop ancienne
      if (device.last_seen) {
        const diffHours = getHoursSinceTimestamp(device.last_seen);

        if (diffHours !== null) {
          // Alertes par niveaux de gravité
          if (diffHours > 24) {
            alerts.push({
              type: 'Données Obsolètes',
              level: 'error',
              sensor_id: device.sensor_id,
              room_name: device.room_name,
              message: `Aucune donnée reçue depuis ${Math.round(diffHours)}h (${Math.round(diffHours / 24)}j)`
            });
          } else if (diffHours > 6) {
            alerts.push({
              type: 'Données Obsolètes',
              level: 'warning',
              sensor_id: device.sensor_id,
              room_name: device.room_name,
              message: `Aucune donnée reçue depuis ${Math.round(diffHours)}h`
            });
          } else if (diffHours > 2) {
            alerts.push({
              type: 'Données Anciennes',
              level: 'info',
              sensor_id: device.sensor_id,
              room_name: device.room_name,
              message: `Dernière lecture il y a ${Math.round(diffHours)}h`
            });
          }
        }
      }

      // Alertes sur les valeurs de température (seuils plus réalistes)
      if (device.temperature !== null && device.temperature !== undefined) {
        if (device.temperature > 35) {
          alerts.push({
            type: 'Température Critique',
            level: 'error',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Température critique: ${device.temperature}°C`
          });
        } else if (device.temperature > 26) {
          alerts.push({
            type: 'Température Élevée',
            level: 'warning',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Température élevée: ${device.temperature}°C`
          });
        } else if (device.temperature < 5) {
          alerts.push({
            type: 'Température Critique',
            level: 'error',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Température critique: ${device.temperature}°C`
          });
        } else if (device.temperature < 18) {
          alerts.push({
            type: 'Température Basse',
            level: 'warning',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Température basse: ${device.temperature}°C`
          });
        }
      }

      // Alertes sur l'humidité (seuils plus réalistes)
      if (device.humidity !== null && device.humidity !== undefined) {
        if (device.humidity > 85) {
          alerts.push({
            type: 'Humidité Critique',
            level: 'error',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Humidité critique: ${device.humidity}% (risque de moisissure)`
          });
        } else if (device.humidity > 66) {
          alerts.push({
            type: 'Humidité Élevée',
            level: 'warning',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Humidité élevée: ${device.humidity}%`
          });
        } else if (device.humidity < 15) {
          alerts.push({
            type: 'Humidité Critique',
            level: 'error',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Humidité critique: ${device.humidity}% (air très sec)`
          });
        } else if (device.humidity < 30) {
          alerts.push({
            type: 'Humidité Basse',
            level: 'warning',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Humidité basse: ${device.humidity}%`
          });
        }
      }

      // Alerte si aucune données de température/humidité disponibles
      if ((device.temperature === null || device.temperature === undefined) &&
        (device.humidity === null || device.humidity === undefined)) {
        alerts.push({
          type: 'Données Manquantes',
          level: 'warning',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Aucune donnée de température/humidité disponible`
        });
      }
    });

    return alerts;
  }, [devices]);
};
