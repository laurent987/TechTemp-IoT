import { useMemo } from 'react';
import { useDevices } from '../data/hooks/useDevices';

/**
 * Hook wrapper pour compatibilité avec le code existant
 * Émule le comportement des anciens hooks pour faciliter la migration
 * Utilisé pour les listes de devices
 */
export const useDevicesDataNew = (rawDevices, useRealTime) => {
  // Utiliser les nouveaux hooks au lieu des données brutes passées en paramètre
  const { devices, loading, error, refreshData } = useDevices();
  
  return useMemo(() => {
    if (loading || error || !devices || !Array.isArray(devices)) {
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

    // Transformer les données du nouveau format vers l'ancien format
    const transformedDevices = devices.map(device => ({
      sensor_id: device.id,
      room_name: device.room,
      room_id: device.roomId || device.room,
      status: device.status || 'unknown',
      last_seen: device.lastSeen || new Date().toISOString(),
      temperature: device.temperature,
      humidity: device.humidity,
      temperaturePrecision: 1,
      humidityPrecision: 0,
      _original: {
        last_temperature: device.temperature,
        avg_temperature: device.temperature,
        last_humidity: device.humidity,
        avg_humidity: device.humidity
      }
    }));

    // Trier les devices pour maintenir un ordre cohérent
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
      valid: sortedDevices.length,
      invalid: 0,
      online: onlineDevices.length,
      offline: sortedDevices.length - onlineDevices.length
    };

    return {
      devices: sortedDevices,
      validDevices: sortedDevices,
      invalidDevices: [],
      stats,
      refetch: refreshData
    };
  }, [devices, loading, error, refreshData]);
};

/**
 * Hook de compatibilité pour un appareil spécifique
 */
export const useDeviceDataNew = (deviceId) => {
  const { devices, loading, error } = useDevices();
  const device = devices.find(d => d.id === deviceId);

  return {
    device,
    isLoading: loading,
    error
  };
};
