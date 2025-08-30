import { useState, useCallback } from 'react';
import { useToast } from '@chakra-ui/react';
import { API_ENDPOINTS } from '../utils/systemMonitoringHelpers';

/**
 * Hook pour gérer les lectures immédiates des capteurs
 * Centralise la logique de déclenchement de lectures et de marquage des devices
 */
export const useDeviceReadings = (systemHealth, useRealTimeForDevices, onRefresh) => {
  const [readingInProgress, setReadingInProgress] = useState(new Set());
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
    setReadingInProgress(prev => new Set([...prev, readingKey]));

    try {
      const body = sensorId ? JSON.stringify({ sensor_id: sensorId }) : "{}";
      const response = await fetch(API_ENDPOINTS.TRIGGER_READING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
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

        setReadingInProgress(prev => {
          const newSet = new Set(prev);
          newSet.delete(readingKey);
          return newSet;
        });
      }, 2000);

    } catch (err) {
      setReadingInProgress(prev => {
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
    readingInProgress,
    updatedDevices,
    triggerImmediateReading,
    markDeviceAsUpdated
  };
};
