import { useMemo } from 'react';
import { transformDevicesData, validateDeviceData, getDeviceWithDefaults } from '../utils/deviceDataTransformer';
import { getHoursSinceTimestamp } from '../utils/systemMonitoringHelpers';

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

    // Calculer les statistiques
    const onlineDevices = transformedDevices.filter(d => d.status === 'online' || d.status === 'healthy');
    const stats = {
      total: transformedDevices.length,
      valid: validDevices.length,
      invalid: invalidDevices.length,
      online: onlineDevices.length,
      offline: transformedDevices.length - onlineDevices.length
    };

    return {
      devices: transformedDevices,
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
        } else if (device.temperature > 28) {
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
        } else if (device.temperature < 15) {
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
        } else if (device.humidity > 70) {
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
