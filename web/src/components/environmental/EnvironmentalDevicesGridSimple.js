import React from 'react';
import {
  Grid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Box
} from '@chakra-ui/react';

const EnvironmentalDevicesGrid = ({
  devices = [],
  environmentalAlerts = [],
  onTriggerReading,
  readingInProgress = new Set(),
  updatedDevices = new Set()
}) => {

  const getDeviceAlerts = (deviceId) => {
    return environmentalAlerts.filter(alert => alert.sensor_id === deviceId);
  };

  const getRoomIcon = (roomName) => {
    const name = roomName.toLowerCase();
    if (name.includes('cuisine') || name.includes('kitchen')) return '🍳';
    if (name.includes('salon') || name.includes('living')) return '🛋️';
    if (name.includes('eetkamer') || name.includes('dining')) return '🍽️';
    if (name.includes('chambre') || name.includes('bedroom')) return '🛏️';
    if (name.includes('bureau') || name.includes('office')) return '💼';
    if (name.includes('salle de bain') || name.includes('bathroom')) return '🚿';
    if (name.includes('cave') || name.includes('garage')) return '🏠';
    return '🏠';
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return 'N/A';
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(numValue)) return 'N/A';
    return numValue.toFixed(1);
  };

  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
      {devices.map((device) => {
        const deviceAlerts = getDeviceAlerts(device.sensor_id);
        const hasAlerts = deviceAlerts.length > 0;

        return (
          <Card
            key={device.sensor_id}
            variant={hasAlerts ? "outline" : "elevated"}
            borderColor={hasAlerts ? "orange.300" : "gray.200"}
            borderWidth={hasAlerts ? 2 : 1}
            bg={hasAlerts ? "orange.50" : "white"}
          >
            <CardHeader pb={3}>
              <HStack justify="space-between">
                <HStack>
                  <Text fontSize="3xl">{getRoomIcon(device.room_name)}</Text>
                  <Heading size="md" color="gray.700">{device.room_name}</Heading>
                </HStack>
                {hasAlerts && (
                  <Badge colorScheme="orange" variant="solid" fontSize="sm">
                    {deviceAlerts.length} alerte{deviceAlerts.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </HStack>
            </CardHeader>

            <CardBody pt={0}>
              <VStack spacing={5} align="stretch">

                {/* Température et Humidité */}
                <HStack spacing={4}>
                  <Box flex={1} p={4} borderRadius="lg" borderWidth="1px" borderColor="gray.200" bg="white">
                    <VStack spacing={2}>
                      <HStack justify="center">
                        <Text fontSize="lg">🌡️</Text>
                        <Text fontSize="md" fontWeight="medium" color="gray.600">Température</Text>
                      </HStack>
                      <Text fontSize="3xl" fontWeight="bold" color="gray.700" textAlign="center">
                        {device.temperature !== null ? `${formatValue(device.temperature)}°C` : 'N/A'}
                      </Text>
                    </VStack>
                  </Box>

                  <Box flex={1} p={4} borderRadius="lg" borderWidth="1px" borderColor="gray.200" bg="white">
                    <VStack spacing={2}>
                      <HStack justify="center">
                        <Text fontSize="lg">💧</Text>
                        <Text fontSize="md" fontWeight="medium" color="gray.600">Humidité</Text>
                      </HStack>
                      <Text fontSize="3xl" fontWeight="bold" color="gray.700" textAlign="center">
                        {device.humidity !== null ? `${formatValue(device.humidity)}%` : 'N/A'}
                      </Text>
                    </VStack>
                  </Box>
                </HStack>

                {/* Footer temporel */}
                <HStack justify="space-between" pt={2} borderTop="1px" borderColor="gray.100">
                  <Text fontSize="sm" color="gray.500">Dernière lecture : il y a 5 min</Text>
                  <Text fontSize="sm" color="gray.500" fontWeight="medium">14:32</Text>
                </HStack>

                {/* Bouton */}
                <Button
                  size="lg"
                  colorScheme={hasAlerts ? "orange" : "blue"}
                  variant={hasAlerts ? "solid" : "outline"}
                  onClick={() => onTriggerReading && onTriggerReading(device.sensor_id)}
                >
                  {hasAlerts ? '🔄 Vérifier maintenant' : '📊 Nouvelle lecture'}
                </Button>
              </VStack>
            </CardBody>
          </Card>
        );
      })}
    </Grid>
  );
};

export default EnvironmentalDevicesGrid;
