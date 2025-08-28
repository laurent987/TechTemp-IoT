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

const OverviewCard = ({ systemHealth }) => (
  <Card>
    <CardHeader>
      <Heading size="md">Vue d'ensemble</Heading>
      <Text fontSize="sm" color="gray.600">
        Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
      </Text>
    </CardHeader>
    <CardBody>
      <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
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
            <StatLabel>Alertes</StatLabel>
            <StatNumber color={(systemHealth.alerts?.length || 0) > 0 ? "red.600" : "green.600"}>
              {systemHealth.alerts?.length || 0}
            </StatNumber>
            <StatHelpText>problèmes détectés</StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

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
);

export default OverviewCard;
