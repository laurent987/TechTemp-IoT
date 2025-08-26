import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Alert,
  AlertIcon,
  Spinner,
  Text,
  VStack,
  HStack,
  Badge,
  Flex,
  useToast,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import {
  CheckCircleIcon,
  WarningIcon,
  MinusIcon,
  RepeatIcon,
  InfoIcon
} from '@chakra-ui/icons';

const SystemMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [useRealTime, setUseRealTime] = useState(false);
  const toast = useToast();

  const fetchSystemHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      // Choisir entre API temps réel local ou Firebase
      const apiUrl = useRealTime
        ? 'http://192.168.0.42:8080/api/system/health'
        : 'https://us-central1-techtemp-49c7f.cloudfunctions.net/getSystemHealth';

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
  };

  // Auto-refresh avec dépendance sur useRealTime
  useEffect(() => {
    fetchSystemHealth();

    let interval;
    if (autoRefresh) {
      // Refresh plus fréquent pour l'API locale (5s vs 30s)
      const refreshInterval = useRealTime ? 5000 : 30000;
      interval = setInterval(fetchSystemHealth, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, useRealTime]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'green';
      case 'online': return 'green';  // Online = vert comme healthy
      case 'warning': return 'yellow';
      case 'critical': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return CheckCircleIcon;
      case 'online': return CheckCircleIcon;  // Online = icône check verte
      case 'warning': return WarningIcon;
      case 'critical': return MinusIcon;
      default: return InfoIcon;
    }
  };

  const formatLastSeen = (timestamp) => {
    // Détecter si c'est un timestamp Unix (en secondes) ou une chaîne ISO
    let date;
    if (typeof timestamp === 'number') {
      // Timestamp Unix en secondes -> convertir en millisecondes
      date = new Date(timestamp * 1000);
    } else {
      // Chaîne ISO ou timestamp en millisecondes
      date = new Date(timestamp);
    }
    return date.toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getMinutesSinceLastReading = (lastSeen) => {
    const now = new Date();
    let lastSeenDate;
    if (typeof lastSeen === 'number') {
      // Timestamp Unix en secondes -> convertir en millisecondes
      lastSeenDate = new Date(lastSeen * 1000);
    } else {
      // Chaîne ISO ou timestamp en millisecondes
      lastSeenDate = new Date(lastSeen);
    }
    return Math.round((now - lastSeenDate) / (1000 * 60));
  };

  if (loading && !systemHealth) {
    return (
      <Flex justify="center" align="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text>Chargement de l'état du système...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={6} bg="gray.50" minH="100vh">
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="blue.600">
            🖥️ Monitoring Système IoT
          </Heading>
          <HStack spacing={4}>
            <Text fontSize="sm" color="gray.600">
              Source:
              <Badge ml={2} colorScheme={useRealTime ? "green" : "blue"}>
                {useRealTime ? "Temps Réel" : "Firebase"}
              </Badge>
            </Text>
            <Button
              size="sm"
              variant={useRealTime ? "solid" : "outline"}
              colorScheme="green"
              onClick={() => setUseRealTime(!useRealTime)}
            >
              {useRealTime ? "🚀 Temps Réel" : "☁️ Firebase"}
            </Button>
            <Text fontSize="sm" color="gray.600">
              Auto-refresh:
              <Badge ml={2} colorScheme={autoRefresh ? "green" : "gray"}>
                {autoRefresh ? "ON" : "OFF"}
              </Badge>
              <Text fontSize="xs" color="gray.500">
                {useRealTime ? "5s" : "30s"}
              </Text>
            </Text>
            <Button
              size="sm"
              variant={autoRefresh ? "solid" : "outline"}
              colorScheme="blue"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Pause" : "Start"}
            </Button>
            <Button
              size="sm"
              leftIcon={<RepeatIcon />}
              onClick={fetchSystemHealth}
              isLoading={loading}
              colorScheme="blue"
              variant="outline"
            >
              Actualiser
            </Button>
          </HStack>
        </Flex>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {systemHealth && (
          <>
            {/* Vue d'ensemble */}
            <Card>
              <CardHeader>
                <Heading size="md">Vue d'ensemble</Heading>
                <Text fontSize="sm" color="gray.600">
                  Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
                </Text>
              </CardHeader>
              <CardBody>
                <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
                  <GridItem>
                    <Stat>
                      <StatLabel>Statut Global</StatLabel>
                      <HStack>
                        <Icon
                          as={getStatusIcon(systemHealth.global_status)}
                          color={`${getStatusColor(systemHealth.global_status)}.500`}
                        />
                        <StatNumber
                          color={`${getStatusColor(systemHealth.global_status)}.600`}
                          textTransform="capitalize"
                        >
                          {systemHealth.global_status}
                        </StatNumber>
                      </HStack>
                    </Stat>
                  </GridItem>

                  <GridItem>
                    <Stat>
                      <StatLabel>Devices Online</StatLabel>
                      <StatNumber color="blue.600">
                        {systemHealth.summary.online} / {systemHealth.summary.total_devices}
                      </StatNumber>
                      <StatHelpText>devices connectés</StatHelpText>
                    </Stat>
                  </GridItem>

                  <GridItem>
                    <Stat>
                      <StatLabel>Lectures/Heure</StatLabel>
                      <StatNumber color="green.600">
                        {useRealTime
                          ? (systemHealth.devices?.reduce((sum, device) => sum + (device.readings_last_hour || 0), 0) || 0)
                          : (systemHealth.data_flow?.readings_last_hour || 0)
                        }
                      </StatNumber>
                      <StatHelpText>dernière heure</StatHelpText>
                    </Stat>
                  </GridItem>

                  <GridItem>
                    <Stat>
                      <StatLabel>Alertes</StatLabel>
                      <StatNumber color={(systemHealth.alerts?.length || 0) > 0 ? "red.600" : "green.600"}>
                        {systemHealth.alerts?.length || 0}
                      </StatNumber>
                      <StatHelpText>problèmes détectés</StatHelpText>
                    </Stat>
                  </GridItem>
                </Grid>

                {/* Résumé des statuts */}
                <HStack spacing={4} mt={4}>
                  <Badge colorScheme="green">
                    ✅ {systemHealth.summary.online} Online
                  </Badge>
                  {systemHealth.summary.total_devices - systemHealth.summary.online > 0 && (
                    <Badge colorScheme="red">
                      🔴 {systemHealth.summary.total_devices - systemHealth.summary.online} Offline
                    </Badge>
                  )}
                  {(systemHealth.alerts?.length || 0) > 0 && (
                    <Badge colorScheme="yellow">
                      ⚠️ {systemHealth.alerts?.length || 0} Alertes
                    </Badge>
                  )}
                </HStack>
              </CardBody>
            </Card>

            {/* Tableau des devices */}
            <Card>
              <CardHeader>
                <HStack justify="space-between">
                  <Heading size="md">État des Devices</Heading>
                  <Badge colorScheme={useRealTime ? "green" : "blue"} variant="subtle">
                    {useRealTime ? "📡 Temps Réel - Dernières valeurs mesurées" : "📊 Firebase - Moyennes sur 1 heure"}
                  </Badge>
                </HStack>
              </CardHeader>
              <CardBody>
                <Box overflowX="auto">
                  <Table variant="simple" size="sm">
                    <Thead bg="gray.50">
                      <Tr>
                        <Th>Statut</Th>
                        <Th>Device</Th>
                        <Th>Room ID</Th>
                        <Th>Room</Th>
                        <Th>Dernière donnée</Th>
                        <Th isNumeric>Lectures/h</Th>
                        <Th isNumeric>{useRealTime ? "Temp. instantanée (°C)" : "Temp. moy. 1h (°C)"}</Th>
                        <Th isNumeric>{useRealTime ? "Humid. instantanée (%)" : "Humid. moy. 1h (%)"}</Th>
                        <Th>Problèmes</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {systemHealth.devices
                        .sort((a, b) => a.sensor_id - b.sensor_id) // Tri par sensor_id croissant
                        .map((device, index) => (
                          <Tr key={device.sensor_id} bg={index % 2 === 0 ? "white" : "gray.50"}>
                            <Td>
                              <Tooltip label={`Statut: ${device.status}`}>
                                <HStack>
                                  <Icon
                                    as={getStatusIcon(device.status)}
                                    color={`${getStatusColor(device.status)}.500`}
                                  />
                                  <Badge
                                    colorScheme={getStatusColor(device.status)}
                                    variant="subtle"
                                    textTransform="capitalize"
                                  >
                                    {device.status}
                                  </Badge>
                                </HStack>
                              </Tooltip>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" variant="outline">
                                Device {device.sensor_id}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme="orange" variant="outline">
                                Room {device.room_id}
                              </Badge>
                            </Td>
                            <Td fontWeight="medium">
                              {device.room_name}
                            </Td>
                            <Td>
                              <VStack spacing={0} align="start">
                                <Text fontSize="sm">
                                  {formatLastSeen(device.last_seen)}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                  il y a {getMinutesSinceLastReading(device.last_seen)} min
                                </Text>
                              </VStack>
                            </Td>
                            <Td isNumeric>
                              <Badge
                                colorScheme={(useRealTime ? device.readings_last_hour : device.recent_count) > 5 ? "green" : "yellow"}
                              >
                                {useRealTime ? device.readings_last_hour : device.recent_count}
                              </Badge>
                            </Td>
                            <Td isNumeric fontFamily="mono">
                              {useRealTime
                                ? device.last_temperature?.toFixed(1)
                                : device.avg_temperature?.toFixed(1)
                              }°
                            </Td>
                            <Td isNumeric fontFamily="mono">
                              {useRealTime
                                ? device.last_humidity?.toFixed(0)
                                : device.avg_humidity?.toFixed(1)
                              }%
                            </Td>
                            <Td>
                              <Badge colorScheme="green" variant="subtle">
                                OK
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                    </Tbody>
                  </Table>
                </Box>
              </CardBody>
            </Card>

            {/* Alertes et Statistiques */}
            {(systemHealth.alerts?.length || 0) > 0 && (
              <Card>
                <CardHeader>
                  <Heading size="md">🚨 Alertes Système</Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    {(systemHealth.alerts || []).map((alert, index) => (
                      <Alert key={index} status="warning">
                        <AlertIcon />
                        <VStack spacing={1} align="start">
                          <Text fontWeight="bold">{alert.type}</Text>
                          <Text fontSize="sm">{alert.message}</Text>
                          <Text fontSize="xs" color="gray.600">
                            Sensor: {alert.sensor_id} | Device: {alert.device}
                          </Text>
                        </VStack>
                      </Alert>
                    ))}
                  </VStack>
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader>
                <Heading size="md">📊 Résumé Système</Heading>
              </CardHeader>
              <CardBody>
                <Grid templateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={4}>
                  <Stat>
                    <StatLabel>Total Devices</StatLabel>
                    <StatNumber color="blue.600">
                      {systemHealth.summary.total_devices}
                    </StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel>Devices Online</StatLabel>
                    <StatNumber color="green.600">
                      {systemHealth.summary.online}
                    </StatNumber>
                  </Stat>

                  <Stat>
                    <StatLabel>Lectures/Heure</StatLabel>
                    <StatNumber color="purple.600">
                      {useRealTime
                        ? (systemHealth.devices?.reduce((sum, device) => sum + (device.readings_last_hour || 0), 0) || 0)
                        : (systemHealth.data_flow?.readings_last_hour || 0)
                      }
                    </StatNumber>
                  </Stat>
                </Grid>
              </CardBody>
            </Card>
          </>
        )}
      </VStack>
    </Box>
  );
};

export default SystemMonitoring;
