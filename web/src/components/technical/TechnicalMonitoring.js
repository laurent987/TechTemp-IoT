import React, { useEffect, useState } from 'react';
import {
  Box,
  Alert,
  AlertIcon,
  Text,
  VStack,
  Heading,
  Card,
  CardBody,
  Badge,
  HStack,
  Divider,
  Code,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useBreakpointValue,
  Collapse,
  IconButton
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon } from '@chakra-ui/icons';

import { useSystemHealth } from '../../hooks/useSystemHealth';
import { useFirebaseDevices } from '../../hooks/useFirebaseDevices';
import { formatLastSeen, getStatusColor } from '../../utils/systemMonitoringHelpers';
import RaspberryPiCard from './RaspberryPiCard';
import FirebaseCard from './FirebaseCard';
import StandardCard from '../common/StandardCard';

const TechnicalMonitoring = () => {
  // Hook pour la santé système
  const {
    systemHealth,
    loading,
    error,
    realTimeAvailable,
    fetchSystemHealth
  } = useSystemHealth();

  // Données Firebase pour comparaison
  const firebaseDevicesData = useFirebaseDevices();

  // État de l'accordéon mobile
  const [expandedDevices, setExpandedDevices] = useState(new Set());
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Test initial unique
  useEffect(() => {
    console.log('🔧 TechnicalMonitoring - Test diagnostic initial');
    fetchSystemHealth(null, 'technical-diagnostic');
  }, [fetchSystemHealth]);

  // Fonction pour basculer l'accordéon mobile
  const toggleDevice = (deviceId) => {
    setExpandedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  // Fonction pour obtenir le badge de statut avec alertes
  const getStatusBadge = (device, index) => {
    let status = device.status || 'unknown';
    let colorScheme = getStatusColor(status);

    // Vérifier s'il y a des alertes pour ce dispositif
    const deviceAlerts = systemHealth?.alerts?.filter(alert =>
      alert.sensor_id === device.sensor_id ||
      alert.device_id === device.sensor_id
    ) || [];

    const hasAlerts = deviceAlerts.length > 0;

    // Modifier le statut si alertes
    if (hasAlerts && status === 'online') {
      status = 'warning';
      colorScheme = 'orange';
    }

    const statusIcon = {
      'online': '🟢',
      'healthy': '🟢',
      'offline': '🔴',
      'warning': '🟡',
      'critical': '🔴'
    };

    return (
      <Badge colorScheme={colorScheme} variant="subtle">
        {statusIcon[status] || '⚪'} {status}
        {hasAlerts && <Text as="span" ml={1}>🚨</Text>}
      </Badge>
    );
  };

  return (
    <Box p={{ base: 0.5, md: 6 }} bg="gray.50" w="100%">
      <VStack spacing={{ base: 4, md: 6 }} align="stretch">

        {/* Header simple */}
        <StandardCard
          title="⚙️ Technical Monitoring"
          subtitle="Diagnostic technique du système TechTemp"
          titleColor="blue.600"
        >
        </StandardCard>

        {/* États des composants système - 3 cards séparées */}
        <RaspberryPiCard
          systemHealth={systemHealth}
          realTimeAvailable={realTimeAvailable}
        />

        <FirebaseCard
          fallbackData={firebaseDevicesData}
          realTimeAvailable={realTimeAvailable}
          systemHealth={systemHealth}
        />

        {/* Erreur détaillée si problème */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">🔧 Diagnostic Technique - Problème détecté</Text>
              <Text fontSize="sm" color="red.600" mt={1}>{error}</Text>
              <Divider my={2} />
              <Text fontSize="xs" color="gray.600">
                <strong>Actions requises :</strong>
                <br />1. Vérifier l'alimentation du Raspberry Pi
                <br />2. Contrôler le service TechTemp sur le Pi
                <br />3. Tester la connectivité réseau
                <br />4. Vérifier les logs du serveur
              </Text>
            </Box>
          </Alert>
        )}

        {/* Table des dispositifs responsive */}
        <StandardCard
          title={`📋 État des Capteurs (${realTimeAvailable && systemHealth?.devices?.length > 0 ? systemHealth.devices.length : firebaseDevicesData.devices?.length || 0})`}
          titleColor="gray.700"
        >
          <VStack spacing={4} align="stretch">
            <HStack spacing={2}>
              <Badge colorScheme={realTimeAvailable ? 'green' : 'orange'} variant="outline">
                {realTimeAvailable ? 'Raspberry Pi' : 'Firebase Backup'}
              </Badge>
              {systemHealth?.alerts?.length > 0 && (
                <Badge colorScheme="red" variant="solid">
                  🚨 {systemHealth.alerts.length} alerte{systemHealth.alerts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </HStack>

            {/* Tableau responsive des dispositifs */}
            {(() => {
              const devicesToShow = realTimeAvailable && systemHealth?.devices?.length > 0
                ? systemHealth.devices
                : firebaseDevicesData.devices || [];

              if (devicesToShow.length === 0) {
                return (
                  <Text color="red.500" textAlign="center" py={4}>
                    ❌ Aucun dispositif accessible (ni Raspberry Pi ni Firebase)
                  </Text>
                );
              }

              // Version mobile accordéon
              if (isMobile) {
                return (
                  <VStack spacing={2} align="stretch">
                    {devicesToShow.map((device, index) => {
                      const isExpanded = expandedDevices.has(device.sensor_id);

                      return (
                        <Card key={device.sensor_id || index} size="sm" variant="outline">
                          <CardBody p={3}>
                            {/* Ligne principale - toujours visible */}
                            <HStack
                              justify="space-between"
                              cursor="pointer"
                              onClick={() => toggleDevice(device.sensor_id)}
                            >
                              <HStack spacing={3} flex={1}>
                                <IconButton
                                  icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                                  size="xs"
                                  variant="ghost"
                                  aria-label="Expand device details"
                                />
                                <VStack spacing={0} align="start">
                                  <Text fontWeight="bold" fontSize="sm">
                                    {device.room_name || `Dispositif ${index + 1}`}
                                  </Text>
                                  <HStack spacing={2}>
                                    {getStatusBadge(device, index)}
                                    <Text fontSize="xs" color="gray.600">
                                      ID: {device.sensor_id || 'N/A'}
                                    </Text>
                                  </HStack>
                                </VStack>
                              </HStack>
                            </HStack>

                            {/* Détails - collapsible */}
                            <Collapse in={isExpanded}>
                              <Box mt={3} pt={3} borderTop="1px" borderColor="gray.200">
                                <VStack spacing={2} align="stretch">
                                  <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.600">Device ID:</Text>
                                    <Text fontSize="xs" fontFamily="mono">{device.sensor_id || 'N/A'}</Text>
                                  </HStack>
                                  <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.600">Room ID:</Text>
                                    <Text fontSize="xs" fontFamily="mono">{device.room_id || 'N/A'}</Text>
                                  </HStack>
                                  <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.600">Température:</Text>
                                    <Text fontSize="xs">
                                      {device.temperature !== undefined && device.temperature !== null && !isNaN(device.temperature) ? `${Number(device.temperature).toFixed(1)}°C` : 'N/A'}
                                    </Text>
                                  </HStack>
                                  <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.600">Humidité:</Text>
                                    <Text fontSize="xs">
                                      {device.humidity !== undefined && device.humidity !== null && !isNaN(device.humidity) ? `${Number(device.humidity).toFixed(1)}%` : 'N/A'}
                                    </Text>
                                  </HStack>
                                  <HStack justify="space-between">
                                    <Text fontSize="xs" color="gray.600">Dernière lecture:</Text>
                                    <Text fontSize="xs">{formatLastSeen(device.last_seen)}</Text>
                                  </HStack>
                                </VStack>
                              </Box>
                            </Collapse>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </VStack>
                );
              }

              // Version desktop tableau
              return (
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Pièce</Th>
                      <Th>Statut</Th>
                      <Th>Device ID</Th>
                      <Th>Room ID</Th>
                      <Th>Température</Th>
                      <Th>Humidité</Th>
                      <Th>Dernière lecture</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {devicesToShow.map((device, index) => (
                      <Tr key={device.sensor_id || index}>
                        <Td fontWeight="medium">{device.room_name || `Dispositif ${index + 1}`}</Td>
                        <Td>{getStatusBadge(device, index)}</Td>
                        <Td fontFamily="mono" fontSize="sm">{device.sensor_id || 'N/A'}</Td>
                        <Td fontFamily="mono" fontSize="sm">{device.room_id || 'N/A'}</Td>
                        <Td>
                          {device.temperature !== undefined && device.temperature !== null && !isNaN(device.temperature) ? `${Number(device.temperature).toFixed(1)}°C` : 'N/A'}
                        </Td>
                        <Td>
                          {device.humidity !== undefined && device.humidity !== null && !isNaN(device.humidity) ? `${Number(device.humidity).toFixed(1)}%` : 'N/A'}
                        </Td>
                        <Td fontSize="sm">{formatLastSeen(device.last_seen)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              );
            })()}
          </VStack>
        </StandardCard>
      </VStack>
    </Box>
  );
};

export default TechnicalMonitoring;
