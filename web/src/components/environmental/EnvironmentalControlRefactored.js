import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  Text,
  VStack,
  Flex,
  Heading,
  Switch,
  FormControl,
  FormLabel,
  HStack,
  Card,
  CardBody,
  Button
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { useDevicesData, useDeviceAlerts } from '../../hooks/useDevicesData';
import { useFirebaseDevices } from '../../hooks/useFirebaseDevices';
import { useSystemHealth } from '../../hooks/useSystemHealth';
import { useDeviceReadings } from '../../hooks/useDeviceReadings';
import { useReadingsData } from '../../useReadingsData';
import EnvironmentalOverviewCard from './EnvironmentalOverviewCard';
import EnvironmentalDevicesGrid from './EnvironmentalDevicesGrid';
import ReadingsChart from '../../ReadingsChart';

const EnvironmentalControl = () => {
  // Hooks personnalisés pour la logique métier
  const systemHealthHook = useSystemHealth();
  const {
    systemHealth,
    loading,
    error,
    useRealTimeForDevices,
    realTimeAvailable,
    testingRealTime,
    refreshCurrentMode,
    testRealTimeConnection,
    handleToggleDevicesRealTime,
    fetchSystemHealth
  } = systemHealthHook;

  // Hook pour les lectures de capteurs
  const deviceReadingsHook = useDeviceReadings(
    systemHealth,
    useRealTimeForDevices,
    refreshCurrentMode
  );
  const { readingInProgress, updatedDevices, triggerImmediateReading } = deviceReadingsHook;

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

  // Données pour la vue d'ensemble (Firebase direct, indépendant)
  const overviewDevicesData = useFirebaseDevices();

  // Données pour les devices avec option real-time (dépend de systemHealth)
  const devicesData = useDevicesData(systemHealth?.devices, useRealTimeForDevices);

  // Alertes pour la vue d'ensemble (basées sur Firebase)
  const overviewDeviceAlerts = useDeviceAlerts(overviewDevicesData.devices);
  const overviewEnvironmentalAlerts = overviewDeviceAlerts.filter(alert =>
    alert.type?.includes('Température') ||
    alert.type?.includes('Humidité')
  );

  // Alertes pour les devices (basées sur les données courantes)
  const deviceAlerts = useDeviceAlerts(devicesData.devices);
  const environmentalAlerts = deviceAlerts.filter(alert =>
    alert.type?.includes('Température') ||
    alert.type?.includes('Humidité')
  );

  const selectedRoomNames = rooms
    .filter(r => selectedRooms.includes(r.id))
    .map(r => r.name);

  // Fonction wrapper pour convertir les noms en IDs
  const handleSelectedRoomsChange = useCallback((roomNames) => {
    const roomIds = rooms
      .filter(r => roomNames.includes(r.name))
      .map(r => r.id);
    setSelectedRooms(roomIds);
  }, [rooms, setSelectedRooms]);

  // Chargement initial au montage du composant
  useEffect(() => {
    console.log('🚀 EnvironmentalControl monté, démarrage fetchSystemHealth');
    fetchSystemHealth(null, 'useEffect-mount');
  }, [fetchSystemHealth]);

  return (
    <Box p={{ base: 0.5, md: 6 }} bg="gray.50" w="100%">
      <VStack spacing={{ base: 4, md: 5 }} align="stretch">

        {error && (
          <Alert status="error">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Erreur de connexion</Text>
              <Text fontSize="sm">{error}</Text>
              <Text fontSize="xs" mt={2} color="gray.600">
                Vérifiez que les services suivants sont démarrés :
                <br />• Serveur API local (port 8080)
                <br />• Base de données Firebase
                <br />• Connectivité réseau
              </Text>
            </Box>
          </Alert>
        )}

        {!systemHealth && !loading && (
          <Card>
            <CardBody>
              <VStack spacing={4} align="center" py={8}>
                <Text fontSize="4xl">📡</Text>
                <Heading size="md" color="gray.600">Aucune donnée disponible</Heading>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Impossible de récupérer les données des capteurs.
                  <br />Vérifiez la connexion aux services.
                </Text>
                <Button
                  colorScheme="blue"
                  onClick={refreshCurrentMode}
                  size="sm"
                >
                  Réessayer
                </Button>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Section 1: Vue d'ensemble - Firebase seulement, affichage immédiat */}
        <EnvironmentalOverviewCard
          devices={overviewDevicesData.devices}
          environmentalAlerts={overviewEnvironmentalAlerts}
          loading={overviewDevicesData.loading}
        />

        {/* Section 2: Graphiques & Tendances */}
        <Card>
          <CardBody>
            <Box>
              <ReadingsChart
                data={chartData}
                loading={chartLoading}
                error={chartError}
                selectedRooms={selectedRoomNames}
                startDate={startTimestamp}
                endDate={endTimestamp}
                rooms={rooms}
                setSelectedRooms={handleSelectedRoomsChange}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
            </Box>
          </CardBody>
        </Card>

        {/* Section 3: Contrôle par pièce */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="md" color="blue.700">
                  Contrôle par pièce
                </Heading>
                <HStack spacing={4}>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    variant="outline"
                    onClick={refreshCurrentMode}
                    isLoading={loading}
                    leftIcon={<RepeatIcon />}
                  >
                    Actualiser
                  </Button>
                  {!realTimeAvailable && (
                    <Button
                      size="sm"
                      colorScheme="orange"
                      variant="outline"
                      onClick={testRealTimeConnection}
                      isLoading={testingRealTime}
                      loadingText="Test en cours..."
                    >
                      Tester temps réel
                    </Button>
                  )}
                  <FormControl display="flex" alignItems="center" w="auto">
                    <FormLabel htmlFor="devices-realtime-switch" mb="0" fontSize="sm" color="gray.500">
                      Temps réel
                      {!realTimeAvailable && (
                        <Text as="span" color="orange.500" fontSize="xs" ml={1}>
                          (indisponible)
                        </Text>
                      )}
                    </FormLabel>
                    <Switch
                      id="devices-realtime-switch"
                      size="sm"
                      isChecked={useRealTimeForDevices}
                      onChange={handleToggleDevicesRealTime}
                      colorScheme={realTimeAvailable ? "green" : "orange"}
                      isDisabled={!realTimeAvailable}
                    />
                  </FormControl>
                </HStack>
              </Flex>

              <EnvironmentalDevicesGrid
                devices={devicesData.devices}
                environmentalAlerts={environmentalAlerts}
                onTriggerReading={useRealTimeForDevices ? triggerImmediateReading : null}
                readingInProgress={readingInProgress}
                updatedDevices={updatedDevices}
              />
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default EnvironmentalControl;
