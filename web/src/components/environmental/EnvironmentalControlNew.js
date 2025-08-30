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
  Heading,
  Switch,
  FormControl,
  FormLabel,
  HStack,
  Card,
  CardBody,
  Divider
} from '@chakra-ui/react';
import { API_ENDPOINTS } from '../../utils/systemMonitoringHelpers';
import { useDevicesData, useDeviceAlerts } from '../../hooks/useDevicesData';
import { useReadingsData } from '../../useReadingsData';
import EnvironmentalOverviewCard from './EnvironmentalOverviewCard';
import EnvironmentalDevicesGrid from './EnvironmentalDevicesGrid';
import EnvironmentalChartFilters from './EnvironmentalChartFilters';
import ReadingsChart from '../../ReadingsChart';

const EnvironmentalControl = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useRealTime, setUseRealTime] = useState(true);
  const [readingInProgress, setReadingInProgress] = useState(new Set());
  const [updatedDevices, setUpdatedDevices] = useState(new Set());
  const toast = useToast();

  // État pour les graphiques
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Timestamps pour les graphiques
  const startTimestamp = (() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const endTimestamp = (() => {
    const d = new Date(selectedDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();

  // Hook pour les données de lecture (graphiques)
  const {
    rooms,
    selectedRooms,
    setSelectedRooms,
    data: chartData,
    loading: chartLoading,
    error: chartError,
  } = useReadingsData({ startDate: startTimestamp, endDate: endTimestamp });

  // Utiliser notre hook personnalisé pour traiter les données des devices
  const devicesData = useDevicesData(systemHealth?.devices, useRealTime);
  const deviceAlerts = useDeviceAlerts(devicesData.devices);

  // Filtrer pour ne garder que les alertes environnementales
  const environmentalAlerts = deviceAlerts.filter(alert =>
    alert.type?.includes('Température') ||
    alert.type?.includes('Humidité')
  );

  const selectedRoomNames = rooms
    .filter(r => selectedRooms.includes(r.id))
    .map(r => r.name);

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
  }, [fetchSystemHealth]);

  if (loading && !systemHealth) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="green.500" />
          <Text>Chargement du contrôle environnemental...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={{ base: 0.5, md: 6 }} bg="gray.50" w="100%">
      <VStack spacing={{ base: 6, md: 8 }} align="stretch">

        {/* Header dans une card */}
        <Card bg="white" borderWidth={1} borderColor="green.200">
          <CardBody>
            <Flex
              direction={{ base: "column", lg: "row" }}
              justify={{ lg: "space-between" }}
              align={{ base: "stretch", lg: "center" }}
              gap={4}
            >
              <VStack spacing={1} align="start">
                <Heading size="lg" color="green.600">
                  🌡️ Environmental Control
                </Heading>
                <Text fontSize="sm" color="gray.600">
                  Surveillance et contrôle des conditions environnementales
                </Text>
              </VStack>

              <HStack spacing={4}>
                <FormControl display="flex" alignItems="center">
                  <FormLabel htmlFor="realtime-switch" mb="0" fontSize="sm">
                    Temps réel
                  </FormLabel>
                  <Switch
                    id="realtime-switch"
                    isChecked={useRealTime}
                    onChange={handleToggleRealTime}
                    colorScheme="green"
                  />
                </FormControl>
              </HStack>
            </Flex>
          </CardBody>
        </Card>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {systemHealth && (
          <>
            {/* Section 1: Vue d'ensemble */}
            <VStack spacing={2} align="stretch">

              <EnvironmentalOverviewCard
                devices={devicesData.devices}
                environmentalAlerts={environmentalAlerts}
              />
            </VStack>


            {/* Section 2: Graphiques & Tendances */}
            <VStack spacing={4} align="stretch">
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                Graphiques & Tendances
              </Text>

              {/* Filtres pour les graphiques */}
              <EnvironmentalChartFilters
                rooms={rooms}
                selectedRooms={selectedRooms}
                setSelectedRooms={setSelectedRooms}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />

              {/* Graphiques */}
              <Card>
                <CardBody>
                  <ReadingsChart
                    data={chartData}
                    loading={chartLoading}
                    error={chartError}
                    selectedRooms={selectedRoomNames}
                    startDate={startTimestamp}
                    endDate={endTimestamp}
                  />
                </CardBody>
              </Card>
            </VStack>

            <Divider borderColor="green.200" borderWidth="2px" />

            {/* Section 3: Contrôle par pièce */}
            <VStack spacing={4} align="stretch">
              <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" letterSpacing="wide">
                Contrôle par pièce
              </Text>
              <EnvironmentalDevicesGrid
                devices={devicesData.devices}
                environmentalAlerts={environmentalAlerts}
                onTriggerReading={triggerImmediateReading}
                readingInProgress={readingInProgress}
                updatedDevices={updatedDevices}
              />
            </VStack>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default EnvironmentalControl;
