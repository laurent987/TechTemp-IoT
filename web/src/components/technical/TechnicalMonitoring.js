import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  Spinner,
  Text,
  VStack,
  Flex,
  useToast,
  Heading
} from '@chakra-ui/react';
import { API_ENDPOINTS } from '../../utils/systemMonitoringHelpers';
import { useDevicesData, useDeviceAlerts } from '../../hooks/useDevicesData';
import TechnicalOverviewCard from './TechnicalOverviewCard';
import TechnicalDevicesTable from './TechnicalDevicesTable';
import TechnicalAlertsCard from './TechnicalAlertsCard';

const TechnicalMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [firebaseData, setFirebaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useRealTime, setUseRealTime] = useState(true);
  const [readingInProgress, setReadingInProgress] = useState(new Set());
  const [updatedDevices, setUpdatedDevices] = useState(new Set());
  const toast = useToast();

  // Utiliser notre hook personnalisé pour traiter les données des devices
  const devicesData = useDevicesData(systemHealth?.devices, useRealTime);
  const deviceAlerts = useDeviceAlerts(devicesData.devices);

  // Filtrer pour ne garder que les alertes techniques
  const technicalAlerts = [...systemHealth?.alerts || [], ...deviceAlerts.filter(alert =>
    alert.type?.includes('Offline') ||
    alert.type?.includes('Données') ||
    alert.type?.includes('Système')
  )];

  const fetchSystemHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = useRealTime ? API_ENDPOINTS.LOCAL_HEALTH : API_ENDPOINTS.FIREBASE_HEALTH;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSystemHealth(data);
    } catch (err) {
      setError(err.message);
      toast({
        title: "Erreur",
        description: `${useRealTime ? 'API Locale' : 'Firebase'}: ${err.message}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [useRealTime, toast]);

  const fetchFirebaseData = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.FIREBASE_HEALTH);
      if (!response.ok) {
        console.warn('Impossible de récupérer les données Firebase pour validation');
        return;
      }
      const data = await response.json();
      setFirebaseData(data);
    } catch (err) {
      console.warn('Erreur lors de la récupération des données Firebase:', err.message);
    }
  }, []);

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
    if (!useRealTime) {
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
        description: `Commande envoyée avec succès ${sensorId ? `au capteur ${sensorId}` : 'à tous les capteurs'}`,
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
        fetchSystemHealth();
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
  }, [useRealTime, systemHealth, toast, fetchSystemHealth, markDeviceAsUpdated]);

  const handleToggleRealTime = useCallback(() => {
    setUseRealTime(!useRealTime);
  }, [useRealTime]);

  useEffect(() => {
    fetchSystemHealth();
    fetchFirebaseData();
  }, [fetchSystemHealth, fetchFirebaseData]);

  if (loading && !systemHealth) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Chargement de l'état technique...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={{ base: 0.5, md: 6 }} bg="gray.50" w="100%">
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">
        {/* Header */}
        <Flex
          direction={{ base: "column", lg: "row" }}
          justify={{ lg: "space-between" }}
          align={{ base: "stretch", lg: "center" }}
          gap={4}
        >
          <Heading size="lg" color="blue.600">
            ⚙️ Technical Monitoring
          </Heading>
        </Flex>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {systemHealth && (
          <>
            <TechnicalOverviewCard
              systemHealth={systemHealth}
              firebaseData={firebaseData}
              technicalAlerts={technicalAlerts}
            />

            <TechnicalAlertsCard alerts={technicalAlerts} />

            <TechnicalDevicesTable
              devices={devicesData.devices}
              useRealTime={useRealTime}
              readingInProgress={readingInProgress}
              updatedDevices={updatedDevices}
              onTriggerReading={triggerImmediateReading}
              onToggleRealTime={handleToggleRealTime}
            />
          </>
        )}
      </VStack>
    </Box>
  );
};

export default TechnicalMonitoring;
