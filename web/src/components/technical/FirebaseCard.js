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
  Badge,
  Box
} from '@chakra-ui/react';
import { getStatusIcon, getHoursSinceTimestamp } from '../../utils/systemMonitoringHelpers';
import StandardCard from '../common/StandardCard';

const FirebaseCard = ({
  fallbackData,
  realTimeAvailable = false,
  systemHealth
}) => {
  // Calculs pour les données Firebase
  const firebaseDevices = fallbackData?.devices || [];
  const mostRecentReading = firebaseDevices.reduce((latest, device) => {
    if (!device.last_seen) return latest;
    const deviceTime = new Date(device.last_seen);
    return (!latest || deviceTime > latest) ? deviceTime : latest;
  }, null);

  const dataFreshness = mostRecentReading ? getHoursSinceTimestamp(mostRecentReading) : null;

  return (
    <StandardCard
      title="🗄️ Base de Données Firebase"
      subtitle="Cloud Firestore - Stockage et synchronisation des données"
    >
      <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={4}>

        {/* Test 1: Connectivité Cloud */}
        <GridItem>
          <Stat>
            <StatLabel>🌐 Connectivité Cloud</StatLabel>
            <HStack>
              <Icon
                as={getStatusIcon(firebaseDevices.length > 0 ? 'healthy' : 'critical')}
                color={firebaseDevices.length > 0 ? 'green.500' : 'red.500'}
              />
              <StatNumber color={firebaseDevices.length > 0 ? 'green.600' : 'red.600'}>
                {firebaseDevices.length > 0 ? 'ACCESSIBLE' : 'INACCESSIBLE'}
              </StatNumber>
            </HStack>
            <StatHelpText>
              Test: Cloud Functions API
              <br />
              {firebaseDevices.length > 0 ?
                `${firebaseDevices.length} devices reçus` :
                'Requête Cloud Functions échoue'
              }
            </StatHelpText>
          </Stat>
        </GridItem>

        {/* Test 2: Fraîcheur des données */}
        <GridItem>
          <Stat>
            <StatLabel>🕒 Fraîcheur des Données</StatLabel>
            <HStack>
              <Icon
                as={getStatusIcon(dataFreshness < 1 ? 'healthy' : dataFreshness < 24 ? 'warning' : 'critical')}
                color={dataFreshness < 1 ? 'green.500' : dataFreshness < 24 ? 'orange.500' : 'red.500'}
              />
              <StatNumber color={dataFreshness < 1 ? 'green.600' : dataFreshness < 24 ? 'orange.600' : 'red.600'}>
                {mostRecentReading ?
                  (dataFreshness < 1 ? `${Math.round(dataFreshness * 60)} MIN` : `${Math.round(dataFreshness)} H`) :
                  'AUCUNE'
                }
              </StatNumber>
            </HStack>
            <StatHelpText>
              Test: Analyse champ 'last_seen'
              <br />
              {mostRecentReading ?
                `Âge: ${dataFreshness?.toFixed(1)}h` :
                'Pas de timestamp trouvé'
              }
            </StatHelpText>
          </Stat>
        </GridItem>

        {/* Test 3: Fréquence d'acquisition */}
        <GridItem>
          <Stat>
            <StatLabel>📊 Fréquence d'Acquisition</StatLabel>
            <StatNumber color="blue.600">
              {realTimeAvailable ?
                (systemHealth?.data_flow?.readings_last_hour ?
                  `${systemHealth.data_flow.readings_last_hour}/H` :
                  'TEMPS RÉEL'
                ) :
                ((() => {
                  if (!firebaseDevices.length) return 'N/A';
                  const avgDataAge = firebaseDevices.reduce((sum, device) => {
                    if (!device.last_seen) return sum;
                    const age = getHoursSinceTimestamp(device.last_seen);
                    return sum + (age || 0);
                  }, 0) / firebaseDevices.length;
                  return avgDataAge < 0.5 ? '~15 MIN' : avgDataAge < 2 ? '~1H' : '>2H';
                })())
              }
            </StatNumber>
            <StatHelpText>
              Test: {realTimeAvailable ? 'data_flow.readings_last_hour' : 'Moyenne âge des données'}
              <br />
              {realTimeAvailable ?
                'Serveur Pi en temps réel' :
                'Estimation via Firebase'
              }
            </StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* Résumé compact Firebase */}
      <Box mt={4} pt={4} borderTop="1px" borderColor="gray.200">
        <HStack spacing={2} flexWrap="wrap">
          <Badge colorScheme={firebaseDevices.length > 0 ? 'green' : 'red'} variant="solid">
            🌐 Cloud: {firebaseDevices.length > 0 ? 'OK' : 'KO'}
          </Badge>
          <Badge colorScheme={dataFreshness < 1 ? 'green' : dataFreshness < 24 ? 'orange' : 'red'} variant="solid">
            🕒 Données: {mostRecentReading ? (dataFreshness < 1 ? 'FRAIS' : 'ANCIEN') : 'VIDE'}
          </Badge>
          <Badge colorScheme="blue" variant="outline">
            📊 {firebaseDevices.length} capteurs archivés
          </Badge>
          <Badge colorScheme={realTimeAvailable ? 'green' : 'orange'} variant="outline">
            📡 Source: {realTimeAvailable ? 'Pi' : 'Firebase'}
          </Badge>
        </HStack>
      </Box>
    </StandardCard>
  );
};

export default FirebaseCard;
