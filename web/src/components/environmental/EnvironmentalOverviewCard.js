import React from 'react';
import {
  Card,
  CardBody,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Badge,
  Progress,
  VStack,
  Spinner,
  Flex,
  Text,
  Heading
} from '@chakra-ui/react';
import StandardCard from '../common/StandardCard';

const EnvironmentalOverviewCard = ({ devices, environmentalAlerts, loading = false }) => {
  // Calculer les statistiques environnementales
  const totalRooms = devices.length;

  // Température moyenne et plages
  const temps = devices.filter(d => d.temperature !== null && d.temperature !== undefined && !isNaN(d.temperature)).map(d => parseFloat(d.temperature));
  const avgTemp = temps.length > 0 ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : null;
  const minTemp = temps.length > 0 ? Math.min(...temps).toFixed(1) : null;
  const maxTemp = temps.length > 0 ? Math.max(...temps).toFixed(1) : null;

  // Humidité moyenne et plages
  const humidities = devices.filter(d => d.humidity !== null && d.humidity !== undefined && !isNaN(d.humidity)).map(d => parseFloat(d.humidity));
  const avgHumidity = humidities.length > 0 ? (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1) : null;
  const minHumidity = humidities.length > 0 ? Math.min(...humidities).toFixed(1) : null;
  const maxHumidity = humidities.length > 0 ? Math.max(...humidities).toFixed(1) : null;

  // Alertes par type avec détails
  const tempAlerts = environmentalAlerts.filter(alert => alert.type?.includes('Température'));
  const humidityAlerts = environmentalAlerts.filter(alert => alert.type?.includes('Humidité'));

  // Récupérer les valeurs problématiques avec room
  const getAlertDetails = (alerts) => {
    return alerts.map(alert => {
      const device = devices.find(d => d.sensor_id === alert.sensor_id);
      return {
        ...alert,
        currentValue: alert.type?.includes('Température') ? device?.temperature : device?.humidity,
        unit: alert.type?.includes('Température') ? '°C' : '%'
      };
    });
  };

  const tempAlertDetails = getAlertDetails(tempAlerts);
  const humidityAlertDetails = getAlertDetails(humidityAlerts);

  // Déterminer les couleurs selon le niveau d'alerte le plus critique
  const getTempColor = () => {
    if (tempAlerts.some(alert => alert.level === 'error')) return 'red.600';
    if (tempAlerts.some(alert => alert.level === 'warning')) return 'orange.500';
    return 'gray.700';
  };

  const getTempSecondaryColor = () => {
    if (tempAlerts.some(alert => alert.level === 'error')) return 'red.500';
    if (tempAlerts.some(alert => alert.level === 'warning')) return 'orange.400';
    return 'gray.600';
  };

  const getHumidityColor = () => {
    if (humidityAlerts.some(alert => alert.level === 'error')) return 'blue.600';
    if (humidityAlerts.some(alert => alert.level === 'warning')) return 'orange.500';
    return 'gray.700';
  };

  const getHumiditySecondaryColor = () => {
    if (humidityAlerts.some(alert => alert.level === 'error')) return 'blue.500';
    if (humidityAlerts.some(alert => alert.level === 'warning')) return 'orange.400';
    return 'gray.600';
  };

  return (
    <StandardCard
      title="Vue d'ensemble environnementale"
      subtitle={`Conditions de confort dans ${totalRooms} pièce(s) surveillée(s)`}
      titleColor="blue.700"
    >
      {/* Section unique: 3 colonnes responsive */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
        {/* Colonne 1: Température */}
        <GridItem>
          <Card
            variant="outline"
            borderColor={tempAlerts.length > 0 ? "red.400" : "red.200"}
            borderWidth={tempAlerts.length > 0 ? "2px" : "1px"}
            bg="white"
            h="full"
          >
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack>
                  <Heading size="sm" color="red.600">TEMPÉRATURE</Heading>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Moyenne:</Text>
                  <Text
                    fontWeight="bold"
                    fontSize="xl"
                    color={getTempColor()}
                  >
                    {loading ? <Spinner size="sm" color="red.500" /> : (avgTemp ? `${avgTemp}°C` : 'N/A')}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Min - Max:</Text>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={getTempSecondaryColor()}
                  >
                    {loading ? <Spinner size="xs" color="red.400" /> : (minTemp && maxTemp ? `${minTemp}°C - ${maxTemp}°C` : 'N/A')}
                  </Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Colonne 2: Humidité */}
        <GridItem>
          <Card
            variant="outline"
            borderColor={humidityAlerts.length > 0 ? "blue.400" : "blue.200"}
            borderWidth={humidityAlerts.length > 0 ? "2px" : "1px"}
            bg="white"
            h="full"
          >
            <CardBody>
              <VStack spacing={3} align="stretch">
                <HStack>
                  <Heading size="sm" color="blue.600">HUMIDITÉ</Heading>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Moyenne:</Text>
                  <Text
                    fontWeight="bold"
                    fontSize="xl"
                    color={getHumidityColor()}
                  >
                    {loading ? <Spinner size="sm" color="blue.500" /> : (avgHumidity ? `${avgHumidity}%` : 'N/A')}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">Min - Max:</Text>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color={getHumiditySecondaryColor()}
                  >
                    {loading ? <Spinner size="xs" color="blue.400" /> : (minHumidity && maxHumidity ? `${minHumidity}% - ${maxHumidity}%` : 'N/A')}
                  </Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Colonne 3: Alertes */}
        <GridItem>
          {loading ? (
            <Card
              variant="outline"
              borderColor="gray.200"
              borderWidth="1px"
              bg="white"
              h="full"
            >
              <CardBody>
                <VStack spacing={3} align="center" justify="center" h="full">
                  <Spinner size="md" color="gray.500" />
                  <Text fontSize="sm" color="gray.600">Chargement des alertes...</Text>
                </VStack>
              </CardBody>
            </Card>
          ) : environmentalAlerts.length > 0 ? (
            <Card
              variant="outline"
              borderColor="orange.400"
              borderWidth="2px"
              bg="white"
              h="full"
            >
              <CardBody>
                <VStack spacing={3} align="stretch">
                  <HStack>
                    <Heading size="sm" color="orange.700">
                      ALERTES ({environmentalAlerts.length})
                    </Heading>
                  </HStack>

                  <VStack spacing={2} align="stretch">
                    {/* Alertes Température */}
                    {tempAlertDetails.map((alert, index) => (
                      <HStack key={`temp-${index}`} justify="space-between" p={2}>
                        <Text fontSize="sm" color="red.700" fontWeight="medium">
                          {alert.room_name}
                        </Text>
                        <Badge colorScheme="red" variant="solid" fontSize="xs">
                          {alert.currentValue?.toFixed(1)}{alert.unit}
                        </Badge>
                      </HStack>
                    ))}

                    {/* Alertes Humidité */}
                    {humidityAlertDetails.map((alert, index) => (
                      <HStack key={`humidity-${index}`} justify="space-between" p={2} >
                        <Text fontSize="sm" color="blue.700" fontWeight="medium">
                          {alert.room_name}
                        </Text>
                        <Badge colorScheme="blue" variant="solid" fontSize="xs">
                          {alert.currentValue?.toFixed(1)}{alert.unit}
                        </Badge>
                      </HStack>
                    ))}
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          ) : (
            <Card
              variant="outline"
              borderColor="green.200"
              borderWidth="1px"
              bg="white"
              h="full"
            >
              <CardBody>
                <VStack spacing={3} align="center" justify="center" h="full">
                  <Text fontSize="2xl">✅</Text>
                  <VStack spacing={1}>
                    <Heading size="sm" color="green.700">STATUT</Heading>
                    <Text fontSize="sm" color="green.600" textAlign="center" fontWeight="medium">
                      Aucune alerte
                    </Text>
                    <Text fontSize="xs" color="gray.500" textAlign="center">
                      Conditions normales
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          )}
        </GridItem>
      </Grid>
    </StandardCard>
  );
};

export default EnvironmentalOverviewCard;
