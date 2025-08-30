import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Button
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import { API_ENDPOINTS } from '../../utils/systemMonitoringHelpers';
import { useDevicesData, useDeviceAlerts } from '../../hooks/useDevicesData';
import { useFirebaseDevices } from '../../hooks/useFirebaseDevices';
import { useReadingsData } from '../../useReadingsData';
import EnvironmentalOverviewCard from './EnvironmentalOverviewCard';
import EnvironmentalDevicesGrid from './EnvironmentalDevicesGridFixed';
import ReadingsChart from '../../ReadingsChart';

const EnvironmentalControl = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [useRealTimeForDevices, setUseRealTimeForDevices] = useState(true); // Remettre temps réel par défaut
  const [realTimeAvailable, setRealTimeAvailable] = useState(true); // Track si temps réel dispo
  const [fallbackToastShown, setFallbackToastShown] = useState(false); // Éviter doubles toasts
  const [readingInProgress, setReadingInProgress] = useState(new Set());
  const [updatedDevices, setUpdatedDevices] = useState(new Set());
  const fetchInProgress = useRef(false); // Protection contre appels multiples
  const lastFetchTime = useRef(0); // Protection temporelle additionnelle
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

  const fetchSystemHealth = useCallback(async (forceRealTime = null, callSource = 'unknown') => {
    // Éviter les appels multiples simultanés avec useRef
    if (fetchInProgress.current) {
      console.log(`⏸️ fetchSystemHealth déjà en cours (useRef), skip call from: ${callSource}`);
      return;
    }

    // Protection temporelle: éviter appels trop rapprochés (< 500ms)
    const now = Date.now();
    if (now - lastFetchTime.current < 500) {
      console.log(`⏸️ fetchSystemHealth trop rapide (${now - lastFetchTime.current}ms), skip call from: ${callSource}`);
      return;
    }

    console.log(`🚀 Début fetchSystemHealth from: ${callSource}`);
    fetchInProgress.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    setError(null);

    const useRealTime = forceRealTime !== null ? forceRealTime : useRealTimeForDevices;

    if (useRealTime) {
      // Mode temps réel avec timeout rapide
      try {
        console.log('Test temps réel avec timeout 2s...');

        // Promise avec timeout de 2 secondes
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout 2s')), 2000)
        );

        const fetchPromise = fetch(API_ENDPOINTS.LOCAL_HEALTH);

        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Temps réel disponible:', data);
        setSystemHealth(data);
        setRealTimeAvailable(true);
        setFallbackToastShown(false); // Reset pour permettre future notification

      } catch (err) {
        console.warn('⚠️ Temps réel indisponible, fallback immédiat vers Firebase:', err.message);

        // Fallback immédiat vers Firebase
        try {
          const firebaseResponse = await fetch(API_ENDPOINTS.FIREBASE_HEALTH, {
            timeout: 5000
          });

          if (firebaseResponse.ok) {
            const firebaseData = await firebaseResponse.json();
            console.log('✅ Fallback Firebase réussi');
            setSystemHealth(firebaseData);
            setUseRealTimeForDevices(false);
            setRealTimeAvailable(false);

            // Afficher le toast seulement si pas déjà montré
            if (!fallbackToastShown) {
              console.log('🔔 Affichage toast basculement Firebase (fetchSystemHealth)');
              setFallbackToastShown(true);
              toast({
                title: "Basculement automatique",
                description: "Temps réel indisponible, utilisation de Firebase",
                status: "warning",
                duration: 3000,
                isClosable: true,
              });
            } else {
              console.log('🚫 Toast basculement déjà affiché, skip');
            }

            // Démarrer le test en arrière-plan dans 10 secondes
            setTimeout(() => {
              // Fonction inline pour éviter la dépendance circulaire
              const backgroundTest = async () => {
                try {
                  console.log('🔍 Test temps réel en arrière-plan...');
                  const testResponse = await fetch(API_ENDPOINTS.LOCAL_HEALTH, { timeout: 3000 });

                  if (testResponse.ok) {
                    console.log('✅ Temps réel maintenant disponible !');
                    setRealTimeAvailable(true);
                    setFallbackToastShown(false); // Reset pour permettre future notification

                    toast({
                      title: "Temps réel disponible",
                      description: "Le serveur local est maintenant accessible",
                      status: "success",
                      duration: 4000,
                      isClosable: true,
                    });
                  }
                } catch (testErr) {
                  console.log('⏳ Temps réel toujours indisponible...');
                }
              };
              backgroundTest();
            }, 10000);

          } else {
            throw new Error('Firebase aussi indisponible');
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback Firebase échoué:', fallbackErr.message);
          setError(`Impossible de se connecter aux APIs`);
          setSystemHealth(null);

          toast({
            title: "Connexion impossible",
            description: "Ni le temps réel ni Firebase ne sont disponibles",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        }
      }
    } else {
      // Mode Firebase direct
      try {
        console.log('Connexion Firebase...');
        const response = await fetch(API_ENDPOINTS.FIREBASE_HEALTH, {
          timeout: 5000
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Données Firebase reçues');
        setSystemHealth(data);

      } catch (err) {
        console.warn('Erreur Firebase:', err.message);
        setError(`Impossible de se connecter à Firebase: ${err.message}`);
        setSystemHealth(null);

        toast({
          title: "Connexion impossible",
          description: `Vérifiez que Firebase est accessible: ${err.message}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    }

    setLoading(false);
    fetchInProgress.current = false; // Libérer le verrou
  }, [toast]);

  // Fonction pour tester le temps réel en arrière-plan
  const testRealTimeInBackground = useCallback(async () => {
    try {
      console.log('🔍 Test temps réel en arrière-plan...');

      const response = await fetch(API_ENDPOINTS.LOCAL_HEALTH, {
        timeout: 3000
      });

      if (response.ok) {
        console.log('✅ Temps réel maintenant disponible !');
        setRealTimeAvailable(true);
        setFallbackToastShown(false); // Reset pour permettre future notification

        toast({
          title: "Temps réel disponible",
          description: "Le serveur local est maintenant accessible. Vous pouvez basculer en temps réel.",
          status: "success",
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      console.log('⏳ Temps réel toujours indisponible, nouveau test dans 30s...');
      // Réessayer dans 30 secondes
      setTimeout(() => {
        if (!realTimeAvailable) { // Seulement si toujours pas dispo
          testRealTimeInBackground();
        }
      }, 30000);
    }
  }, [toast, realTimeAvailable]);

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
        fetchSystemHealth(null, 'cleanup-after-reading');
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
  }, [useRealTimeForDevices, systemHealth, toast, fetchSystemHealth, markDeviceAsUpdated]);

  const handleToggleDevicesRealTime = useCallback(() => {
    const newRealTimeMode = !useRealTimeForDevices;

    // Tentative de basculement vers le nouveau mode
    if (newRealTimeMode) {
      toast({
        title: "Tentative de connexion temps réel...",
        description: "Vérification de la disponibilité du serveur local",
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }

    setUseRealTimeForDevices(newRealTimeMode);

    // Recharger avec le nouveau mode (avec fallback automatique si nécessaire)
    fetchSystemHealth(newRealTimeMode, 'mode-change');
  }, [useRealTimeForDevices, toast, fetchSystemHealth]);

  // Chargement initial uniquement au montage du composant
  useEffect(() => {
    console.log('🚀 EnvironmentalControl monté, démarrage fetchSystemHealth');
    // Chargement en arrière-plan, n'affecte pas l'affichage de la vue d'ensemble
    fetchSystemHealth(null, 'useEffect-mount');
  }, []); // Dépendances vides pour éviter la boucle

  return (
    <Box p={{ base: 0.5, md: 6 }} bg="gray.50" w="100%">
      <VStack spacing={{ base: 4, md: 5 }} align="stretch">

        {/* Titre principal de la page (hors card) */}
        {/* <VStack spacing={1} align="start">
          <Heading size="xl" color="green.600">
            Environmental Control
          </Heading>
          <Text fontSize="md" color="gray.600">
            Surveillance et contrôle des conditions environnementales
          </Text>
        </VStack> */}

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
                  onClick={fetchSystemHealth}
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
            {/* Graphiques */}
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
                    onClick={() => fetchSystemHealth(null, 'refresh-button')}
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
                      onClick={() => {
                        setRealTimeAvailable(true);
                        setFallbackToastShown(false); // Reset pour permettre future notification
                        fetchSystemHealth(true, 'reconnect-button');
                      }}
                      isLoading={loading}
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

              {loading && !systemHealth ? (
                <VStack spacing={4} align="center" py={8}>
                  <Spinner size="lg" color="green.500" />
                  <Text color="gray.600">Chargement des dispositifs...</Text>
                </VStack>
              ) : (
                <EnvironmentalDevicesGrid
                  devices={devicesData.devices}
                  environmentalAlerts={environmentalAlerts}
                  onTriggerReading={useRealTimeForDevices ? triggerImmediateReading : null}
                  readingInProgress={readingInProgress}
                  updatedDevices={updatedDevices}
                />
              )}
            </VStack>
          </CardBody>
        </Card>      </VStack>
    </Box>
  );
};

export default EnvironmentalControl;
