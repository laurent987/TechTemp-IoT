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
  Alert,
  AlertIcon,
  Spinner,
  useColorModeValue
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { formatLastSeen } from '../../utils/systemMonitoringHelpers';

// Animation pour les valeurs mises à jour
const pulseAnimation = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(72, 187, 120, 0.7); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(72, 187, 120, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(72, 187, 120, 0); }
`;

// Animation pour la lecture en cours
const shimmerAnimation = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
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

  // Composant pour les valeurs avec cadre coloré et animations (simplifié)
  const ValueBox = ({ label, value, unit, isReading, isUpdated, icon }) => {
    // Fonction pour formater correctement les valeurs
    const formatValue = (val) => {
      if (val === null || val === undefined) return 'N/A';

      // Convertir en nombre si c'est une chaîne
      const numValue = typeof val === 'string' ? parseFloat(val) : val;

      // Vérifier si c'est un nombre valide
      if (isNaN(numValue)) return 'N/A';

      // Arrondir à 1 décimale
      return numValue.toFixed(1);
    };

    return (
      <Box
        flex={1}
        p={4}
        borderRadius="lg"
        borderWidth="1px"
        borderColor="gray.200"
        bg="white"
        position="relative"
        overflow="hidden"
        transition="all 0.3s ease"
        transform={isUpdated ? "scale(1.02)" : "scale(1)"}
        animation={isUpdated ? `${pulseAnimation} 1s ease-out` : undefined}
        minH="120px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        _before={isReading ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
          animation: `${shimmerAnimation} 1.5s infinite`
        } : undefined}
      >
        <VStack spacing={2}>
          <HStack justify="center">
            <Text fontSize="lg">{icon}</Text>
            <Text fontSize="md" fontWeight="medium" color="gray.600">
              {label}
            </Text>
          </HStack>
          <Text
            fontSize="3xl"
            fontWeight="bold"
            color="gray.700"
            textAlign="center"
          >
            {value !== null && value !== undefined ? `${formatValue(value)}${unit}` : 'N/A'}
          </Text>
        </VStack>
      </Box>
    );
  };

  return (
    <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
      {devices.map((device) => {
        const deviceAlerts = getDeviceAlerts(device.sensor_id);
        const isReading = readingInProgress.has(device.sensor_id) || readingInProgress.has('all');
        const isUpdated = updatedDevices.has(device.sensor_id);
        const hasAlerts = deviceAlerts.length > 0;

        return (
          <Card
            key={device.sensor_id}
            variant={isUpdated ? "filled" : hasAlerts ? "outline" : "elevated"}
            borderColor={hasAlerts ? "orange.300" : "gray.200"}
            borderWidth={hasAlerts ? 2 : 1}
            bg={isUpdated ? "green.50" : hasAlerts ? "orange.50" : "white"}
          >
            <CardHeader pb={3}>
              <HStack justify="space-between">
                <HStack>
                  <Text fontSize="xl">{getRoomIcon(device.room_name)}</Text>
                  <Heading size="xs" color="gray.700">{device.room_name}</Heading>
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

                {/* Température et Humidité avec cadres épurés */}
                <HStack spacing={4}>
                  <ValueBox
                    label="Température"
                    value={device.temperature}
                    unit="°C"
                    isReading={isReading}
                    isUpdated={isUpdated}
                    icon="🌡️"
                  />

                  <ValueBox
                    label="Humidité"
                    value={device.humidity}
                    unit="%"
                    isReading={isReading}
                    isUpdated={isUpdated}
                    icon="💧"
                  />
                </HStack>

                {/* Alertes spécifiques à cette pièce */}
                {deviceAlerts.length > 0 && (
                  <VStack spacing={2} align="stretch">
                    {deviceAlerts.slice(0, 2).map((alert, index) => (
                      <Alert key={index} status="warning" size="sm" borderRadius="md">
                        <AlertIcon boxSize="12px" />
                        <Text fontSize="xs">{alert.message}</Text>
                      </Alert>
                    ))}
                    {deviceAlerts.length > 2 && (
                      <Text fontSize="xs" color="gray.600" textAlign="center">
                        +{deviceAlerts.length - 2} autre(s) alerte(s)
                      </Text>
                    )}
                  </VStack>
                )}

                {/* Footer avec infos temporelles - au-dessus du bouton */}
                <HStack justify="space-between" pt={2} borderTop="1px" borderColor="gray.100">
                  <Text fontSize="sm" color="gray.500">
                    Dernière lecture : {getLastSeenTime(device.last_seen)}
                  </Text>
                  <Text fontSize="sm" color="gray.500" fontWeight="medium">
                    {getMinutesSinceLastSeen(device.last_seen)}
                  </Text>
                </HStack>

                {/* Action de lecture avec animation - toujours en bas */}
                <Button
                  size="lg"
                  colorScheme={hasAlerts ? "orange" : "blue"}
                  variant={hasAlerts ? "solid" : "outline"}
                  leftIcon={isReading ? <Spinner size="sm" /> : undefined}
                  onClick={() => onTriggerReading(device.sensor_id)}
                  isLoading={isReading}
                  loadingText="Lecture en cours..."
                  transform={isUpdated ? "scale(1.02)" : "scale(1)"}
                  transition="all 0.2s ease"
                  _hover={{
                    transform: "scale(1.05)",
                    boxShadow: "lg"
                  }}
                  _active={{
                    transform: "scale(0.98)"
                  }}
                  animation={isReading ? `${shimmerAnimation} 2s infinite` : undefined}
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
