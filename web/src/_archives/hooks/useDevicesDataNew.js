import { useMemo, useState, useEffect } from 'react';
import { useDevices } from '../data/hooks/useDevices';

/**
 * Hook wrapper pour compatibilité avec le code existant
 * Émule le comportement des anciens hooks pour faciliter la migration
 * Utilisé pour les listes de devices
 * 
 * @param {Array} rawDevices - Données brutes des appareils de systemHealth
 * @param {boolean} useRealTime - Indique si on utilise le mode temps réel
 */
export const useDevicesDataNew = (rawDevices, useRealTime) => {
  // SIMPLIFICATION : En mode temps réel, utiliser directement les données brutes 
  // sans passer par la nouvelle architecture
  const { devices: normalizedDevices, loading, error, refresh } = useDevices({
    autoRefresh: !useRealTime, // Ne pas rafraîchir automatiquement en mode temps réel
    refreshInterval: 30000, // Rafraîchir périodiquement en mode Firebase
    source: 'firebase' // En mode non temps réel, utiliser Firebase
  });

  // Effet pour rafraîchir les données Firebase quand on passe en mode non temps réel
  useEffect(() => {
    if (!useRealTime) {
      refresh();
    }
  }, [useRealTime, refresh]);

  return useMemo(() => {
    // En mode temps réel, utiliser rawDevices mais en s'assurant que les propriétés 
    // last_temperature et last_humidity sont correctement définies pour la compatibilité
    if (useRealTime && rawDevices && Array.isArray(rawDevices)) {
      console.log('useDevicesDataNew - Mode temps réel avec rawDevices');
      
      // Calcul des statistiques sur les données brutes
      const onlineDevices = rawDevices.filter(d => d.status === 'online');
      const stats = {
        total: rawDevices.length,
        valid: rawDevices.length,
        invalid: 0,
        online: onlineDevices.length,
        offline: rawDevices.length - onlineDevices.length
      };
      
      // S'assurer que chaque appareil a les deux ensembles de propriétés (normal et "last_")
      const enhancedDevices = rawDevices.map(device => {
        // Logs détaillés AVANT la transformation
        console.log(`[AVANT TRANSFORMATION] Device ${device.sensor_id}:`, {
          original_temperature: device.temperature,
          original_last_temperature: device.last_temperature,
          original_humidity: device.humidity,
          original_last_humidity: device.last_humidity
        });
        
        // Faire la transformation
        const enhanced = {
          ...device,
          // Garantir que last_temperature et last_humidity sont définis même si seuls temperature/humidity le sont
          temperature: device.temperature !== undefined ? device.temperature : device.last_temperature,
          humidity: device.humidity !== undefined ? device.humidity : device.last_humidity,
          last_temperature: device.last_temperature !== undefined ? device.last_temperature : device.temperature,
          last_humidity: device.last_humidity !== undefined ? device.last_humidity : device.humidity
        };
        
        // Logs détaillés APRÈS la transformation
        console.log(`[APRÈS TRANSFORMATION] Device ${device.sensor_id}:`, {
          new_temperature: enhanced.temperature,
          new_last_temperature: enhanced.last_temperature,
          new_humidity: enhanced.humidity,
          new_last_humidity: enhanced.last_humidity
        });
        
        return enhanced;
      });
      
      console.log('useDevicesDataNew - Appareils après amélioration:', enhancedDevices.map(d => ({
        sensor_id: d.sensor_id,
        temperature: d.temperature,
        humidity: d.humidity,
        last_temperature: d.last_temperature,
        last_humidity: d.last_humidity
      })));
      
      return {
        devices: enhancedDevices, // Utiliser les données améliorées
        validDevices: enhancedDevices,
        invalidDevices: [],
        stats,
        refetch: () => {} // Fonction vide car la mise à jour est gérée par SystemMonitoring
      };
    }
    
    // En mode Firebase, utiliser les données normalisées et les transformer
    
    // Gérer les états de chargement et d'erreur pour le mode Firebase
    if (loading || error || !normalizedDevices || !Array.isArray(normalizedDevices)) {
      console.log('useDevicesDataNew - Mode Firebase - État de chargement/erreur, retour tableau vide');
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

    // Transformer les données normalisées vers l'ancien format
    // Cette partie n'est exécutée qu'en mode Firebase (non temps réel)
    const transformedDevices = normalizedDevices.map(device => {
      console.log('useDevicesDataNew - Transformation du device en mode Firebase:', device);
      
      // Transformer les données de la nouvelle architecture
      return {
        // Champs d'identité
        sensor_id: device.id,
        room_name: device.room,
        room_id: device.roomId || parseInt(device.room) || 0,
        
        // Statut
        status: device.status || 'unknown',
        last_seen: device.lastSeen || new Date().toISOString(),
        
        // Données de capteur - FOURNIR À LA FOIS temperature/humidity ET last_temperature/last_humidity
        temperature: device.temperature,
        humidity: device.humidity,
        last_temperature: device.temperature, // Assurer la compatibilité avec les deux formats
        last_humidity: device.humidity,       // Assurer la compatibilité avec les deux formats
        temperaturePrecision: 1,
        humidityPrecision: 0,
        
        // Données originales pour compatibilité
        _original: {
          last_temperature: device.temperature,
          avg_temperature: device.temperature,
          last_humidity: device.humidity,
          avg_humidity: device.humidity
        }
      };
    });

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
      refetch: refresh
    };
  }, [normalizedDevices, rawDevices, loading, error, useRealTime, refresh]);
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
