import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Icon,
  Badge,
  Box
} from '@chakra-ui/react';
import { getStatusIcon } from '../../utils/systemMonitoringHelpers';

const SensorsCard = ({
  systemHealth,
  fallbackData,
  realTimeAvailable = false
}) => {
  // Données des capteurs (priorité au temps réel si disponible)
  const devices = realTimeAvailable && systemHealth?.devices?.length > 0
    ? systemHealth.devices
    : fallbackData?.devices || [];

  // Statistiques calculées
  const totalDevices = systemHealth?.summary?.total_devices || devices.length;
  const onlineDevices = systemHealth?.summary?.online || devices.filter(d => d.status === 'online' || d.status === 'healthy').length;
  const warningDevices = systemHealth?.summary?.warning || devices.filter(d => d.status === 'warning').length;
  const offlineDevices = systemHealth?.summary?.offline || devices.filter(d => d.status === 'offline' || d.status === 'critical').length;

  // Alertes système
  const alerts = systemHealth?.alerts || [];
  const hasAlerts = alerts.length > 0;

  return (
    <Card>
      <CardHeader>
        <Heading size="md">📡 État des Capteurs</Heading>
        <Text fontSize="sm" color="gray.600">
          Monitoring en temps réel des dispositifs IoT
        </Text>
      </CardHeader>
      <CardBody>
        <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={4}>

          {/* Capteurs actifs */}
          <GridItem>
            <Stat>
              <StatLabel>📊 Capteurs Actifs</StatLabel>
              <HStack>
                <Icon
                  as={getStatusIcon(onlineDevices > 0 ? 'healthy' : 'critical')}
                  color={onlineDevices > 0 ? 'green.500' : 'red.500'}
                />
                <StatNumber color={onlineDevices > 0 ? 'green.600' : 'red.600'}>
                  {onlineDevices} / {totalDevices}
                </StatNumber>
              </HStack>
              <StatHelpText>
                Test: {systemHealth ? 'summary.online' : 'Devices Firebase'}
                <br />
                {offlineDevices > 0 ?
                  `${offlineDevices} hors ligne` :
                  onlineDevices > 0 ?
                    'Tous connectés' :
                    'Aucun capteur détecté'
                }
              </StatHelpText>
            </Stat>
          </GridItem>

          {/* État détaillé */}
          <GridItem>
            <Stat>
              <StatLabel>⚠️ État Détaillé</StatLabel>
              <HStack>
                <Icon
                  as={getStatusIcon(warningDevices > 0 ? 'warning' : offlineDevices > 0 ? 'critical' : 'healthy')}
                  color={warningDevices > 0 ? 'orange.500' : offlineDevices > 0 ? 'red.500' : 'green.500'}
                />
                <StatNumber color={warningDevices > 0 ? 'orange.600' : offlineDevices > 0 ? 'red.600' : 'green.600'}>
                  {warningDevices > 0 ? `${warningDevices} WARNING` :
                    offlineDevices > 0 ? `${offlineDevices} OFFLINE` :
                      'TOUS OK'}
                </StatNumber>
              </HStack>
              <StatHelpText>
                Test: Analyse statuts individuels
                <br />
                {realTimeAvailable ?
                  'Données temps réel du Pi' :
                  'Données archivées Firebase'
                }
              </StatHelpText>
            </Stat>
          </GridItem>

          {/* Alertes système */}
          <GridItem>
            <Stat>
              <StatLabel>🚨 Alertes Système</StatLabel>
              <HStack>
                <Icon
                  as={getStatusIcon(hasAlerts ? 'critical' : 'healthy')}
                  color={hasAlerts ? 'red.500' : 'green.500'}
                />
                <StatNumber color={hasAlerts ? 'red.600' : 'green.600'}>
                  {alerts.length}
                </StatNumber>
              </HStack>
              <StatHelpText>
                Test: alerts.length
                <br />
                {hasAlerts ?
                  'Problèmes détectés' :
                  systemHealth ?
                    'Aucune alerte' :
                    'Surveillance inactive'
                }
              </StatHelpText>
            </Stat>
          </GridItem>
        </Grid>

        {/* Résumé compact des capteurs */}
        <Box mt={4} pt={4} borderTop="1px" borderColor="gray.200">
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme={onlineDevices > 0 ? 'green' : 'red'} variant="solid">
              📊 Actifs: {onlineDevices}/{totalDevices}
            </Badge>
            {warningDevices > 0 && (
              <Badge colorScheme="orange" variant="solid">
                ⚠️ Warning: {warningDevices}
              </Badge>
            )}
            {offlineDevices > 0 && (
              <Badge colorScheme="red" variant="solid">
                ❌ Offline: {offlineDevices}
              </Badge>
            )}
            <Badge colorScheme={hasAlerts ? 'red' : 'green'} variant="outline">
              🚨 Alertes: {alerts.length}
            </Badge>
            <Badge colorScheme={realTimeAvailable ? 'green' : 'orange'} variant="outline">
              📡 {realTimeAvailable ? 'Temps réel' : 'Archive'}
            </Badge>
          </HStack>
        </Box>
      </CardBody>
    </Card>
  );
};

export default SensorsCard;
