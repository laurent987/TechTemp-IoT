import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  VStack,
  Text,
  Badge,
  Heading,
  Icon,
  Spinner
} from '@chakra-ui/react';
import { pulseGlow, shimmer, bounceIn } from '../../utils/animations';
import {
  getStatusColor,
  getStatusIcon,
  formatLastSeen,
  getMinutesSinceLastReading,
  getHumidityColor
} from '../../utils/systemMonitoringHelpers';

const DeviceCard = ({ device, useRealTime, readingInProgress, updatedDevices, onTriggerReading }) => {
  // Log complet très détaillé
  console.log('🔍 DEVICE CARD DEBUG 🔍');
  console.log('------------------------------------');
  console.log(`Device ID: ${device.sensor_id}`);
  console.log(`Room: ${device.room_name} (ID: ${device.room_id})`);
  console.log(`Status: ${device.status}`);
  console.log(`Mode temps réel: ${useRealTime ? 'OUI' : 'NON'}`);
  console.log('VALEURS DE TEMPÉRATURE:');
  console.log(`- temperature: ${device.temperature} (type: ${typeof device.temperature})`);
  console.log(`- last_temperature: ${device.last_temperature} (type: ${typeof device.last_temperature})`);
  console.log('VALEURS D\'HUMIDITÉ:');
  console.log(`- humidity: ${device.humidity} (type: ${typeof device.humidity})`);
  console.log(`- last_humidity: ${device.last_humidity} (type: ${typeof device.last_humidity})`);
  console.log('AUTRES PROPRIÉTÉS:');
  console.log(`- temperaturePrecision: ${device.temperaturePrecision}`);
  console.log(`- humidityPrecision: ${device.humidityPrecision}`);
  console.log(`- last_seen: ${device.last_seen}`);
  console.log('OBJET COMPLET:');
  console.log(JSON.stringify(device, null, 2));
  console.log('------------------------------------');
  
  const isReading = readingInProgress.has(device.sensor_id);
  const isUpdated = updatedDevices.has(device.sensor_id);

  return (
    <Card variant="outline" bg="white" overflow="hidden">
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
          <Box
            py={{ base: 3, md: 4 }}
            animation={isUpdated ? `${pulseGlow} 2s ease-in-out` : "none"}
            transition="all 0.3s ease"
          >
            <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 3, md: 6 }}>
              {/* Température */}
              <MetricBox
                isReading={isReading}
                isUpdated={isUpdated}
                borderColor={isReading ? "red.200" : "red.100"}
                hoverBorderColor="red.300"
                animationDelay="0s"
              >
                <MetricContent
                  icon="🌡️"
                  value={(() => {
                    console.log(`DeviceCard parsing - Valeurs pour device ${device.sensor_id}:`, {
                      last_temp_raw: device.last_temperature,
                      temp_raw: device.temperature,
                      last_temp_type: typeof device.last_temperature,
                      temp_type: typeof device.temperature
                    });
                    
                    // Utiliser last_temperature en priorité s'il est disponible
                    if (device.last_temperature !== undefined && device.last_temperature !== null) {
                      // S'assurer que c'est un nombre
                      const temp = typeof device.last_temperature === 'number' 
                        ? device.last_temperature 
                        : parseFloat(device.last_temperature);
                      return isNaN(temp) ? 'N/A' : temp.toFixed(1);
                    }
                    // Sinon utiliser temperature s'il est disponible
                    else if (device.temperature !== undefined && device.temperature !== null) {
                      // S'assurer que c'est un nombre
                      const temp = typeof device.temperature === 'number' 
                        ? device.temperature 
                        : parseFloat(device.temperature);
                      return isNaN(temp) ? 'N/A' : temp.toFixed(1);
                    }
                    // Si aucune des deux propriétés n'est disponible ou sont null/undefined
                    return 'N/A';
                  })()}
                  unit="°C"
                  color="red.500"
                  unitColor="red.400"
                  label="Température"
                />
              </MetricBox>

              {/* Humidité */}
              <MetricBox
                isReading={isReading}
                isUpdated={isUpdated}
                borderColor={isReading ? "blue.200" : "blue.100"}
                hoverBorderColor="blue.300"
                animationDelay="0.2s"
              >
                <MetricContent
                  icon="💧"
                  value={(() => {
                    console.log(`DeviceCard parsing - Humidité pour device ${device.sensor_id}:`, {
                      last_hum_raw: device.last_humidity,
                      hum_raw: device.humidity,
                      last_hum_type: typeof device.last_humidity,
                      hum_type: typeof device.humidity
                    });
                    
                    // Utiliser last_humidity en priorité s'il est disponible
                    if (device.last_humidity !== undefined && device.last_humidity !== null) {
                      // S'assurer que c'est un nombre
                      const hum = typeof device.last_humidity === 'number' 
                        ? device.last_humidity 
                        : parseFloat(device.last_humidity);
                      return isNaN(hum) ? 'N/A' : hum.toFixed(0);
                    }
                    // Sinon utiliser humidity s'il est disponible
                    else if (device.humidity !== undefined && device.humidity !== null) {
                      // S'assurer que c'est un nombre
                      const hum = typeof device.humidity === 'number' 
                        ? device.humidity 
                        : parseFloat(device.humidity);
                      return isNaN(hum) ? 'N/A' : hum.toFixed(0);
                    }
                    // Si aucune des deux propriétés n'est disponible ou sont null/undefined
                    return 'N/A';
                  })()}
                  unit="%"
                  color={getHumidityColor(device.last_humidity || device.humidity)}
                  unitColor="blue.400"
                  label="Humidité"
                />
              </MetricBox>
            </Grid>
          </Box>

          {/* Informations techniques */}
          <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 2, md: 3 }}>
            <InfoBox label="DEVICE" value={device.sensor_id} colorScheme="blue" />
            <InfoBox label="ROOM" value={device.room_id} colorScheme="orange" />
          </Grid>

          {/* Footer */}
          <Box pt={2}>
            <Flex justify="space-between" align="center" mb={3}>
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

            {useRealTime && (
              <Button
                size="sm"
                width="100%"
                onClick={() => onTriggerReading(device.sensor_id)}
                colorScheme={isReading ? "blue" : "green"}
                variant={isReading ? "solid" : "outline"}
                fontSize="sm"
                isLoading={isReading}
                loadingText="Lecture en cours..."
                spinner={<Spinner size="sm" />}
                isDisabled={isReading}
              >
                {isReading ? "⏳ Lecture en cours..." : "📡 Lecture immédiate"}
              </Button>
            )}
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

const MetricBox = ({ children, isReading, isUpdated, borderColor, hoverBorderColor, animationDelay }) => (
  <Box
    p={{ base: 3, md: 4 }}
    bg="white"
    borderRadius="xl"
    border="2px solid"
    borderColor={borderColor}
    position="relative"
    overflow="hidden"
    _hover={{
      transform: "translateY(-2px)",
      boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
      borderColor: hoverBorderColor
    }}
    transition="all 0.3s ease"
    animation={isUpdated ? `${bounceIn} 0.6s ease-out ${animationDelay} both` : "none"}
  >
    {isReading && (
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        background="linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)"
        animation={`${shimmer} 1.5s infinite ${animationDelay}`}
        zIndex="1"
      />
    )}
    {children}
  </Box>
);

const MetricContent = ({ icon, value, unit, color, unitColor, label }) => (
  <VStack spacing={2} position="relative" zIndex="2">
    <HStack spacing={2} align="baseline">
      <Text fontSize={{ base: "xl", md: "2xl" }} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))">
        {icon}
      </Text>
      <Text
        fontSize={{ base: "2xl", md: "3xl" }}
        fontWeight="bold"
        color={color}
        fontFamily="mono"
        textShadow="0 2px 4px rgba(0,0,0,0.1)"
        transition="all 0.3s ease"
      >
        {value}
      </Text>
      <Text fontSize={{ base: "lg", md: "xl" }} color={unitColor} fontWeight="medium">
        {unit}
      </Text>
    </HStack>
    <Text fontSize="xs" color="gray.500" fontWeight="medium">
      {label}
    </Text>
  </VStack>
);

const InfoBox = ({ label, value, colorScheme }) => (
  <VStack spacing={1} align="center" p={{ base: 1.5, md: 2 }} bg="gray.50" borderRadius="md">
    <Text fontSize="xs" color="gray.500" fontWeight="medium">{label}</Text>
    <Badge colorScheme={colorScheme} variant="solid" fontSize="xs">
      {value}
    </Badge>
  </VStack>
);

export default DeviceCard;
