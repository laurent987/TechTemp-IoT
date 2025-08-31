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
  Box,
  Spinner
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

// Animation de satisfaction quand les nouvelles données arrivent
const newDataPulse = keyframes`
  0% { transform: scale(1); }
  30% { transform: scale(1.08); }
  60% { transform: scale(1.02); }
  100% { transform: scale(1); }
`;

const EnvironmentalDevicesGrid = ({
  devices,
  environmentalAlerts,
  onTriggerReading,
  readingInProgress,
  updatedDevices
}) => {

  const getDeviceAlerts = (deviceId) => {
    return environmentalAlerts.filter(alert => alert.sensor_id === deviceId);
  };

  const getMinutesSinceLastSeen = (lastSeen) => {
    if (!lastSeen) return "Inconnue";

    let timestamp;
    if (typeof lastSeen === "object" && lastSeen._seconds) {
      timestamp = lastSeen._seconds * 1000;
    } else if (typeof lastSeen === "number") {
      // Si c'est déjà en millisecondes
      if (lastSeen > 1000000000000) {
        timestamp = lastSeen;
      } else {
        // Si c'est en secondes
        timestamp = lastSeen * 1000;
      }
    } else if (typeof lastSeen === "string") {
      timestamp = new Date(lastSeen).getTime();
    } else {
      return "Inconnue";
    }

    const now = Date.now();
    const diffMs = now - timestamp;

    // Vérifier si le timestamp est valide
    if (diffMs < 0 || isNaN(diffMs)) {
      return "Inconnue";
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return "à l'instant";
    if (diffMinutes === 1) return "il y a 1 minute";
    if (diffMinutes < 60) return `il y a ${diffMinutes} minutes`;

    const hours = Math.floor(diffMinutes / 60);
    if (hours === 1) return "il y a 1 heure";
    if (hours < 24) return `il y a ${hours} heures`;

    const days = Math.floor(hours / 24);
    if (days === 1) return "il y a 1 jour";
    if (days < 30) return `il y a ${days} jours`;

    return "Très ancienne";
  };

  const getLastSeenTime = (lastSeen) => {
    if (!lastSeen) return "Inconnue";

    let timestamp;
    if (typeof lastSeen === "object" && lastSeen._seconds) {
      timestamp = lastSeen._seconds * 1000;
    } else if (typeof lastSeen === "number") {
      // Si c'est déjà en millisecondes
      if (lastSeen > 1000000000000) {
        timestamp = lastSeen;
      } else {
        // Si c'est en secondes
        timestamp = lastSeen * 1000;
      }
    } else if (typeof lastSeen === "string") {
      timestamp = new Date(lastSeen).getTime();
    } else {
      return "Inconnue";
    }

    // Vérifier si le timestamp est valide
    if (isNaN(timestamp)) {
      return "Inconnue";
    }

    const date = new Date(timestamp);
    const now = new Date();

    // Si c'est aujourd'hui, afficher seulement l'heure
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Si c'est hier
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Hier ${date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    }

    // Sinon, afficher date + heure
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const ValueBox = ({ label, value, unit, isReading, isUpdated, icon, color = "gray.700", borderColor = "gray.200" }) => {
    return (
      <Box
        flex={1}
        p={4}
        borderRadius="lg"
        borderWidth="2px"
        borderColor={borderColor}
        bg="white"
        position="relative"
        overflow="hidden"
        minH="120px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        transition="all 0.2s ease"
      >
        <VStack spacing={2}>
          <HStack>
            <Text fontSize="2xl">{icon}</Text>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={color}
              textAlign="center"
              animation={isUpdated ? `${newDataPulse} 0.8s ease-out` : undefined}
            >
              {value !== null && value !== undefined ? (
                `${formatValue(value)}${unit}`
              ) : (
                <Spinner size="md" color="blue.500" thickness="3px" />
              )}
            </Text>
          </HStack>
          <Text fontSize="xs" fontWeight="semibold" color="gray.600" textAlign="center">
            {label}
          </Text>
        </VStack>
      </Box>
    );
  };

  return (
    <>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
        {devices.map((device) => {
          const deviceAlerts = getDeviceAlerts(device.sensor_id);
          const isReading = readingInProgress.has(device.sensor_id) || readingInProgress.has('all');
          const isUpdated = updatedDevices.has(device.sensor_id);
          const hasAlerts = deviceAlerts.length > 0;

          // Déterminer la couleur de bordure selon le niveau d'alerte le plus critique
          const getCardStyle = () => {
            if (hasAlerts) {
              // Trouver le niveau d'alerte le plus critique
              const hasError = deviceAlerts.some(alert => alert.level === 'error');
              const hasWarning = deviceAlerts.some(alert => alert.level === 'warning');

              let borderColor = "blue.300"; // info par défaut
              if (hasError) borderColor = "red.400";
              else if (hasWarning) borderColor = "orange.400";

              return {
                bg: "white", // Fond normal
                borderColor: borderColor,
                borderWidth: 2,
                variant: "outline"
              };
            }
            return {
              bg: "white",
              borderColor: "gray.200",
              borderWidth: 2,
              variant: "elevated"
            };
          };

          const cardStyle = getCardStyle();

          return (
            <Card
              key={device.sensor_id}
              variant={cardStyle.variant}
              borderColor={"gray.200"}
              borderWidth={cardStyle.borderWidth}
              bg={cardStyle.bg}
              boxShadow={hasAlerts ? "lg" : "md"}
              _hover={{ transform: "translateY(-2px)", boxShadow: "xl" }}
              transition="all 0.2s ease"
            >
              <CardHeader pb={3}>
                <HStack justify="space-between">
                  <HStack>
                    <Text fontSize="xl">{getRoomIcon(device.room_name)}</Text>
                    <Heading size="md" color="gray.700">{device.room_name}</Heading>
                  </HStack>
                  {hasAlerts && (
                    <Badge
                      colorScheme={
                        deviceAlerts.some(alert => alert.level === 'error') ? 'red' :
                          deviceAlerts.some(alert => alert.level === 'warning') ? 'orange' :
                            'gray'
                      }
                      variant="solid"
                      fontSize="sm"
                    >
                      {deviceAlerts.length} alerte{deviceAlerts.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </HStack>
              </CardHeader>

              <CardBody pt={5}>
                <VStack spacing={5} align="stretch">

                  {/* Température et Humidité avec cadres épurés */}
                  <HStack spacing={4}>
                    {(() => {
                      // Déterminer les couleurs de bordure selon les alertes
                      const tempAlerts = deviceAlerts.filter(alert =>
                        alert.type?.includes('Température')
                      );
                      const humidityAlerts = deviceAlerts.filter(alert =>
                        alert.type?.includes('Humidité')
                      );

                      const getTempBorderColor = () => {
                        if (tempAlerts.some(a => a.level === 'error')) return 'red.400';
                        if (tempAlerts.some(a => a.level === 'warning')) return 'orange.400';
                        return 'gray.200';
                      };

                      const getHumidityBorderColor = () => {
                        if (humidityAlerts.some(a => a.level === 'error')) return 'red.400';
                        if (humidityAlerts.some(a => a.level === 'warning')) return 'orange.400';
                        return 'gray.200';
                      };

                      return (
                        <>
                          <ValueBox
                            label="Température"
                            value={device.temperature}
                            unit="°C"
                            isReading={isReading}
                            isUpdated={isUpdated}
                            icon="🌡️"
                            color="red.500"
                            borderColor={getTempBorderColor()}
                          />

                          <ValueBox
                            label="Humidité"
                            value={device.humidity}
                            unit="%"
                            isReading={isReading}
                            isUpdated={isUpdated}
                            icon="💧"
                            color="blue.500"
                            borderColor={getHumidityBorderColor()}
                          />
                        </>
                      );
                    })()}
                  </HStack>

                  {/* Action de lecture - seulement si onTriggerReading est fourni */}
                  {onTriggerReading && (
                    <Button
                      size="lg"
                      colorScheme="blue"
                      variant="outline"
                      leftIcon={isReading ? <Spinner size="sm" /> : undefined}
                      onClick={() => onTriggerReading(device.sensor_id)}
                      isLoading={isReading}
                      loadingText="Lecture en cours..."
                      _hover={{
                        transform: "scale(1.05)",
                        boxShadow: "lg"
                      }}
                      _active={{
                        transform: "scale(0.98)"
                      }}
                    >
                      📡 Faire une mesure
                    </Button>
                  )}

                  {/* Footer avec infos temporelles - au-dessus du bouton */}
                  <HStack justify="space-between" pt={2}>
                    <Text fontSize="sm" color="gray.500">
                      Dernière mesure : {getLastSeenTime(device.last_seen)}
                    </Text>
                    <Text fontSize="sm" color="gray.500" fontWeight="medium">
                      {getMinutesSinceLastSeen(device.last_seen)}
                    </Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          );
        })}
      </Grid>
      {/* Espace en bas pour permettre de scroller plus haut */}
      <Box h="200px" />
    </>
  );
};

export default EnvironmentalDevicesGrid;
