import { useCallback, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import { useDeviceData } from '../data/hooks/useDeviceData';
import { DataContext } from '../data/context/DataContext';

/**
 * Hook wrapper pour compatibilité avec le code existant
 * Version moderne du hook useDeviceReadings utilisant la nouvelle architecture
 */
export const useDeviceReadingsNew = (systemHealth, useRealTimeForDevices, onRefresh) => {
  const [manualReadingInProgress, setManualReadingInProgress] = useState(new Set());
  const [updatedDevices, setUpdatedDevices] = useState(new Set());
  const toast = useToast();

  const markDeviceAsUpdated = useCallback((deviceIds) => {
    const ids = Array.isArray(deviceIds) ? deviceIds : [deviceIds];
    setUpdatedDevices(prev => new Set([...prev, ...ids]));

    setTimeout(() => {
      setUpdatedDevices(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
    }, 3000);
  }, []);

  const triggerImmediateReading = useCallback(async (sensorId = null) => {
    if (!useRealTimeForDevices) {
      toast({
        title: "Erreur",
        description: "La lecture immédiate n'est disponible qu'en mode temps réel",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const readingKey = sensorId || 'all';
    setManualReadingInProgress(prev => new Set([...prev, readingKey]));

    try {
      // Utilisation du DataContext pour le rafraîchissement des données
      // au lieu d'appeler directement l'API
      const dataContext = new DataContext();
      
      if (sensorId) {
        await dataContext.refreshDeviceData(sensorId);
      } else {
        await dataContext.refreshAllData();
      }

      toast({
        title: "Lecture déclenchée",
        description: `Nouvelle lecture ${sensorId ? `pour ${sensorId}` : 'globale'} en cours...`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      setTimeout(() => {
        if (sensorId) {
          markDeviceAsUpdated(sensorId);
        } else if (systemHealth?.devices) {
          const allDeviceIds = systemHealth.devices.map(d => d.sensor_id);
          markDeviceAsUpdated(allDeviceIds);
        }

        if (onRefresh) onRefresh();

        setManualReadingInProgress(prev => {
          const newSet = new Set(prev);
          newSet.delete(readingKey);
          return newSet;
        });
      }, 2000);

    } catch (err) {
      setManualReadingInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(readingKey);
        return newSet;
      });

      toast({
        title: "Erreur",
        description: `Impossible de déclencher la lecture: ${err.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }, [useRealTimeForDevices, systemHealth, toast, markDeviceAsUpdated, onRefresh]);

  return {
    manualReadingInProgress,
    updatedDevices,
    triggerImmediateReading,
    markDeviceAsUpdated
  };
};
