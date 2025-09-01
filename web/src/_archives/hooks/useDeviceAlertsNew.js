import { useMemo } from 'react';
import { useDevices } from '../data/hooks/useDevices';

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
 * Hook wrapper pour compatibilité avec le code existant
 * Version moderne du hook useDeviceAlerts utilisant la nouvelle architecture
 */
export const useDeviceAlertsNew = () => {
  const { devices, loading, error } = useDevices();

  return useMemo(() => {
    if (loading || error || !devices || !Array.isArray(devices)) {
      return [];
    }

    const alerts = [];

    devices.forEach(device => {
      // Alerte si device offline
      if (device.status !== 'online' && device.status !== 'healthy') {
        alerts.push({
          type: 'Device Offline',
          level: 'error',
          sensor_id: device.id,
          room_name: device.room,
          message: `Le device ${device.id} (${device.room}) est hors ligne`
        });
      }

      // Alerte si dernière lecture trop ancienne
      if (device.lastSeen) {
        const diffHours = getHoursSinceTimestamp(device.lastSeen);

        if (diffHours !== null) {
          // Alertes par niveaux de gravité
          if (diffHours > 24) {
            alerts.push({
              type: 'Données Obsolètes',
              level: 'error',
              sensor_id: device.id,
              room_name: device.room,
              message: `Aucune donnée reçue depuis ${Math.round(diffHours)}h (${Math.round(diffHours / 24)}j)`
            });
          } else if (diffHours > 6) {
            alerts.push({
              type: 'Données Obsolètes',
              level: 'warning',
              sensor_id: device.id,
              room_name: device.room,
              message: `Aucune donnée reçue depuis ${Math.round(diffHours)}h`
            });
          } else if (diffHours > 2) {
            alerts.push({
              type: 'Données Anciennes',
              level: 'info',
              sensor_id: device.id,
              room_name: device.room,
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
            sensor_id: device.id,
            room_name: device.room,
            message: `Température critique: ${device.temperature}°C`
          });
        } else if (device.temperature > 26) {
          alerts.push({
            type: 'Température Élevée',
            level: 'warning',
            sensor_id: device.id,
            room_name: device.room,
            message: `Température élevée: ${device.temperature}°C`
          });
        } else if (device.temperature < 5) {
          alerts.push({
            type: 'Température Critique',
            level: 'error',
            sensor_id: device.id,
            room_name: device.room,
            message: `Température critique: ${device.temperature}°C`
          });
        } else if (device.temperature < 18) {
          alerts.push({
            type: 'Température Basse',
            level: 'warning',
            sensor_id: device.id,
            room_name: device.room,
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
            sensor_id: device.id,
            room_name: device.room,
            message: `Humidité critique: ${device.humidity}% (risque de moisissure)`
          });
        } else if (device.humidity > 66) {
          alerts.push({
            type: 'Humidité Élevée',
            level: 'warning',
            sensor_id: device.id,
            room_name: device.room,
            message: `Humidité élevée: ${device.humidity}%`
          });
        } else if (device.humidity < 15) {
          alerts.push({
            type: 'Humidité Critique',
            level: 'error',
            sensor_id: device.id,
            room_name: device.room,
            message: `Humidité critique: ${device.humidity}% (air très sec)`
          });
        } else if (device.humidity < 30) {
          alerts.push({
            type: 'Humidité Basse',
            level: 'warning',
            sensor_id: device.id,
            room_name: device.room,
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
          sensor_id: device.id,
          room_name: device.room,
          message: `Aucune donnée de température/humidité disponible`
        });
      }
    });

    return alerts;
  }, [devices, loading, error]);
};
