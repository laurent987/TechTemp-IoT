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
            🖥️ Monitoring Système IoT
          </Heading>
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={4}
            align={{ md: "center" }}
          >
            <HStack spacing={2} flexWrap="wrap">
              <Text fontSize="sm" color="gray.600" flexShrink={0}>
                Source:
              </Text>
              <Badge colorScheme={useRealTime ? "green" : "blue"}>
                {useRealTime ? "Temps Réel" : "Firebase"}
              </Badge>
              <Button
                size="sm"
                variant={useRealTime ? "solid" : "outline"}
                colorScheme="green"
                onClick={() => setUseRealTime(!useRealTime)}
                fontSize={{ base: "xs", md: "sm" }}
              >
                {useRealTime ? "🚀 Temps Réel" : "☁️ Firebase"}
              </Button>
            </HStack>

            <HStack spacing={2} flexWrap="wrap">
              <VStack spacing={0} align="start">
                <HStack spacing={1}>
                  <Text fontSize="sm" color="gray.600" flexShrink={0}>
                    Auto-refresh:
                  </Text>
                  <Badge colorScheme={autoRefresh ? "green" : "gray"}>
                    {autoRefresh ? "ON" : "OFF"}
                  </Badge>
                </HStack>
                <Text fontSize="xs" color="gray.500">
                  {useRealTime ? "5s" : "30s"}
                </Text>
              </VStack>
              <Button
                size="sm"
                variant={autoRefresh ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => setAutoRefresh(!autoRefresh)}
                fontSize={{ base: "xs", md: "sm" }}
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
                fontSize={{ base: "xs", md: "sm" }}
              >
                <Text display={{ base: "none", md: "block" }}>Actualiser</Text>
                <Text display={{ base: "block", md: "none" }}>↻</Text>
              </Button>
            </HStack>
          </Flex>
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
                <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
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
                      <StatHelpText>{useRealTime ? "temps réel (total)" : "dernière heure"}</StatHelpText>
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

            {/* Cartes des devices - Une carte par room */}
            <Box>
              <Heading size="md" mb={4}>État des Devices</Heading>
              <Badge colorScheme={useRealTime ? "green" : "blue"} variant="subtle" mb={4}>
                {useRealTime ? "📡 Temps Réel - Dernières valeurs mesurées" : "📊 Firebase - Moyennes sur 1 heure"}
              </Badge>

              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={{ base: 4, md: 6 }}>
                {systemHealth.devices
                  .sort((a, b) => a.sensor_id - b.sensor_id)
                  .map((device) => (
                    <Card key={device.sensor_id} variant="outline" bg="white" overflow="hidden">
                      {/* Header simplifié avec juste le nom et status */}
                      <CardHeader bg="blue.50" py={3}>
                        <Flex justify="space-between" align="center">
                          <Heading size="lg" color="blue.700" fontWeight="600">
                            {device.room_name}
                          </Heading>
                          <HStack spacing={2}>
                            <Icon
                              as={getStatusIcon(device.status)}
                              color={`${getStatusColor(device.status)}.500`}
                              boxSize={4}
                            />
                            <Text fontSize="sm" fontWeight="medium" color={`${getStatusColor(device.status)}.600`} textTransform="capitalize">
                              {device.status}
                            </Text>
                          </HStack>
                        </Flex>
                      </CardHeader>

                      <CardBody p={{ base: 3, md: 4 }}>
                        <VStack spacing={{ base: 3, md: 4 }} align="stretch">
                          {/* Conteneur principal pour stats temp/humidité */}
                          <Box py={{ base: 3, md: 4 }}>
                            <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 3, md: 6 }}>
                              {/* Température */}
                              <VStack spacing={2}>
                                <HStack spacing={2} align="baseline">
                                  <Text fontSize={{ base: "xl", md: "3xl" }}>🌡️</Text>
                                  <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="red.500" fontFamily="mono">
                                    {useRealTime
                                      ? device.last_temperature?.toFixed(1)
                                      : device.avg_temperature?.toFixed(1)
                                    }
                                  </Text>
                                  <Text fontSize={{ base: "lg", md: "xl" }} color="red.400" fontWeight="medium">°C</Text>
                                </HStack>
                              </VStack>

                              {/* Humidité */}
                              <VStack spacing={2}>
                                <HStack spacing={2} align="baseline">
                                  <Text fontSize={{ base: "xl", md: "3xl" }}>💧</Text>
                                  <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color="blue.500" fontFamily="mono">
                                    {useRealTime
                                      ? device.last_humidity?.toFixed(0)
                                      : device.avg_humidity?.toFixed(1)
                                    }
                                  </Text>
                                  <Text fontSize={{ base: "lg", md: "xl" }} color="blue.400" fontWeight="medium">%</Text>
                                </HStack>
                              </VStack>
                            </Grid>
                          </Box>

                          {/* Informations techniques compactes */}
                          <Grid templateColumns="repeat(3, 1fr)" gap={{ base: 2, md: 3 }}>
                            {/* Device info */}
                            <VStack spacing={1} align="center" p={{ base: 1.5, md: 2 }} bg="gray.50" borderRadius="md">
                              <Text fontSize="xs" color="gray.500" fontWeight="medium">DEVICE</Text>
                              <Badge colorScheme="blue" variant="solid" fontSize="xs">
                                {device.sensor_id}
                              </Badge>
                            </VStack>

                            {/* Room info */}
                            <VStack spacing={1} align="center" p={{ base: 1.5, md: 2 }} bg="gray.50" borderRadius="md">
                              <Text fontSize="xs" color="gray.500" fontWeight="medium">ROOM</Text>
                              <Badge colorScheme="orange" variant="solid" fontSize="xs">
                                {device.room_id}
                              </Badge>
                            </VStack>

                            {/* Lectures */}
                            <VStack spacing={1} align="center" p={{ base: 1.5, md: 2 }} bg="gray.50" borderRadius="md">
                              <Text fontSize="xs" color="gray.500" fontWeight="medium">LECTURES</Text>
                              <Badge
                                colorScheme={(useRealTime ? device.readings_last_hour : device.recent_count) > 5 ? "green" : "yellow"}
                                variant="solid"
                                fontSize="xs"
                              >
                                {useRealTime ? device.readings_last_hour : device.recent_count}/h
                              </Badge>
                            </VStack>
                          </Grid>

                          {/* Footer avec dernière mise à jour */}
                          <Box pt={2}>
                            <Flex justify="space-between" align="center">
                              <VStack spacing={0} align="start">
                                <Text fontSize="xs" color="gray.500">Dernière donnée</Text>
                                <Text fontSize="xs" fontFamily="mono" color="gray.700">
                                  {formatLastSeen(device.last_seen)}
                                </Text>
                              </VStack>
                              <VStack spacing={0} align="end">
                                <Text fontSize="xs" color="gray.500">Il y a</Text>
                                <Text fontSize="xs" fontWeight="medium" color="gray.700">
                                  {getMinutesSinceLastReading(device.last_seen)} min
                                </Text>
                              </VStack>
                            </Flex>
                          </Box>
                        </VStack>
                      </CardBody>
                    </Card>
                  ))}
              </Grid>
            </Box>            {/* Alertes et Statistiques */}
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
                <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }} gap={4}>
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
