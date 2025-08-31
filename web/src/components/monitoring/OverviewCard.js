import React from 'react';
import {
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
import StandardCard from '../common/StandardCard';

const OverviewCard = ({ systemHealth, deviceAlerts = [] }) => {
  // Calculer les statistiques d'alertes
  const systemAlerts = systemHealth.alerts?.length || 0;
  const environmentAlerts = deviceAlerts.length || 0;
  const totalAlerts = systemAlerts + environmentAlerts;

  return (
    <StandardCard
      title="📊 Vue d'ensemble"
      subtitle={`Dernière mise à jour: ${new Date().toLocaleString('fr-FR')}`}
    >
      {/* Section 1: Statut Technique */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={6} mb={6}>
        <GridItem>
          <Stat>
            <StatLabel>🔧 Statut Technique</StatLabel>
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
            <StatHelpText>Hardware, software, connectivité</StatHelpText>
          </Stat>
        </GridItem>

        <GridItem>
          <Stat>
            <StatLabel>📡 Devices Connectés</StatLabel>
            <StatNumber color="blue.600">
              {systemHealth.summary.online} / {systemHealth.summary.total_devices}
            </StatNumber>
            <StatHelpText>
              {systemHealth.summary.total_devices - systemHealth.summary.online > 0
                ? `${systemHealth.summary.total_devices - systemHealth.summary.online} offline`
                : 'Tous en ligne'}
            </StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* Section 2: Alertes Global */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4} mb={4}>
        <GridItem>
          <Stat>
            <StatLabel>🚨 Alertes Total</StatLabel>
            <StatNumber color={totalAlerts > 0 ? "red.600" : "green.600"}>
              {totalAlerts}
            </StatNumber>
            <StatHelpText>
              {totalAlerts === 0 ? 'Aucun problème' : 'Problèmes détectés'}
            </StatHelpText>
          </Stat>
        </GridItem>

        <GridItem>
          <Stat>
            <StatLabel>⚙️ Alertes Système</StatLabel>
            <StatNumber color={systemAlerts > 0 ? "orange.600" : "green.600"}>
              {systemAlerts}
            </StatNumber>
            <StatHelpText>Technique/Connectivité</StatHelpText>
          </Stat>
        </GridItem>

        <GridItem>
          <Stat>
            <StatLabel>🌡️ Alertes Environnement</StatLabel>
            <StatNumber color={environmentAlerts > 0 ? "red.600" : "green.600"}>
              {environmentAlerts}
            </StatNumber>
            <StatHelpText>Température/Humidité</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* Section 3: Badges de statut */}
      <HStack spacing={2} flexWrap="wrap">
        <Badge colorScheme="green" variant="subtle">
          ✅ {systemHealth.summary.online} Online
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

        {environmentAlerts > 0 && (
          <Badge colorScheme="red" variant="subtle">
            🌡️ {environmentAlerts} Environnement
          </Badge>
        )}

        {totalAlerts === 0 && (
          <Badge colorScheme="green" variant="solid">
            🎉 Tout fonctionne parfaitement
          </Badge>
        )}
      </HStack>
    </StandardCard>
  );
};

export default OverviewCard;
