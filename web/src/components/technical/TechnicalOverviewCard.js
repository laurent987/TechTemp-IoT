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
  Badge
} from '@chakra-ui/react';
import { getStatusColor, getStatusIcon } from '../../utils/systemMonitoringHelpers';

const TechnicalOverviewCard = ({ systemHealth, firebaseData, technicalAlerts }) => {
  const systemAlerts = systemHealth.alerts?.length || 0;
  const deviceTechnicalAlerts = technicalAlerts.length - systemAlerts;

  return (
    <Card>
      <CardHeader>
        <Heading size="md">🔧 Vue d'ensemble technique</Heading>
        <Text fontSize="sm" color="gray.600">
          Infrastructure, connectivité et santé des capteurs
        </Text>
      </CardHeader>
      <CardBody>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} gap={6}>
          <GridItem>
            <Stat>
              <StatLabel>Statut Infrastructure</StatLabel>
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
              <StatHelpText>Serveurs, DB, réseau</StatHelpText>
            </Stat>
          </GridItem>

          <GridItem>
            <Stat>
              <StatLabel>Connectivité Capteurs</StatLabel>
              <StatNumber color="blue.600">
                {systemHealth.summary.online} / {systemHealth.summary.total_devices}
              </StatNumber>
              <StatHelpText>
                {systemHealth.summary.total_devices - systemHealth.summary.online > 0
                  ? `${systemHealth.summary.total_devices - systemHealth.summary.online} offline`
                  : 'Tous connectés'}
              </StatHelpText>
            </Stat>
          </GridItem>

          <GridItem>
            <Stat>
              <StatLabel>Alertes Techniques</StatLabel>
              <StatNumber color={technicalAlerts.length > 0 ? "orange.600" : "green.600"}>
                {technicalAlerts.length}
              </StatNumber>
              <StatHelpText>
                Système + Capteurs
              </StatHelpText>
            </Stat>
          </GridItem>

          <GridItem>
            <Stat>
              <StatLabel>Synchronisation</StatLabel>
              <StatNumber color={firebaseData ? "green.600" : "orange.600"}>
                {firebaseData ? 'OK' : 'Partielle'}
              </StatNumber>
              <StatHelpText>
                Local ↔ Firebase
              </StatHelpText>
            </Stat>
          </GridItem>
        </Grid>

        {/* Badges de statut */}
        <HStack spacing={2} flexWrap="wrap" mt={4}>
          <Badge colorScheme={getStatusColor(systemHealth.global_status)} variant="subtle">
            🏗️ Infrastructure {systemHealth.global_status}
          </Badge>

          <Badge colorScheme="green" variant="subtle">
            📡 {systemHealth.summary.online} Connected
          </Badge>

          {systemHealth.summary.total_devices - systemHealth.summary.online > 0 && (
            <Badge colorScheme="red" variant="subtle">
              🔴 {systemHealth.summary.total_devices - systemHealth.summary.online} Offline
            </Badge>
          )}

          {systemAlerts > 0 && (
            <Badge colorScheme="orange" variant="subtle">
              ⚙️ {systemAlerts} Système
            </Badge>
          )}

          {deviceTechnicalAlerts > 0 && (
            <Badge colorScheme="yellow" variant="subtle">
              📡 {deviceTechnicalAlerts} Capteurs
            </Badge>
          )}

          {technicalAlerts.length === 0 && (
            <Badge colorScheme="green" variant="solid">
              ✅ Tout fonctionne parfaitement
            </Badge>
          )}
        </HStack>
      </CardBody>
    </Card>
  );
};

export default TechnicalOverviewCard;
