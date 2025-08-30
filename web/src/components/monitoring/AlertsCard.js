import React from 'react';
import {
  Alert,
  AlertIcon,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack
} from '@chakra-ui/react';

const AlertsCard = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Heading size="md">🎉 Statut des Alertes</Heading>
        </CardHeader>
        <CardBody>
          <Alert status="success">
            <AlertIcon />
            <VStack spacing={1} align="start">
              <Text fontWeight="bold">Aucune alerte active</Text>
              <Text fontSize="sm">Tous les systèmes fonctionnent normalement</Text>
            </VStack>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  // Séparer les alertes par type
  const systemAlerts = alerts.filter(alert =>
    alert.type?.includes('Offline') ||
    alert.type?.includes('Système') ||
    alert.type?.includes('Données')
  );

  const environmentAlerts = alerts.filter(alert =>
    alert.type?.includes('Température') ||
    alert.type?.includes('Humidité')
  );

  const getAlertStatus = (alertType) => {
    if (alertType?.includes('Critique')) return 'error';
    if (alertType?.includes('Élevé') || alertType?.includes('Basse')) return 'warning';
    if (alertType?.includes('Offline')) return 'error';
    if (alertType?.includes('Données')) return 'warning';
    return 'info';
  };

  const getAlertIcon = (alertType) => {
    if (alertType?.includes('Température')) return '🌡️';
    if (alertType?.includes('Humidité')) return '💧';
    if (alertType?.includes('Offline')) return '📡';
    if (alertType?.includes('Données')) return '⏰';
    return '⚠️';
  };

  return (
    <Card>
      <CardHeader>
        <Heading size="md">🚨 Alertes Détectées ({alerts.length})</Heading>
        <Text fontSize="sm" color="gray.600">
          {systemAlerts.length} système • {environmentAlerts.length} environnement
        </Text>
      </CardHeader>
      <CardBody>
        <VStack spacing={4} align="stretch">
          {/* Alertes Système */}
          {systemAlerts.length > 0 && (
            <VStack spacing={2} align="stretch">
              <Text fontWeight="bold" color="orange.600" fontSize="sm">
                ⚙️ ALERTES SYSTÈME ({systemAlerts.length})
              </Text>
              {systemAlerts.map((alert, index) => (
                <Alert key={`system-${index}`} status={getAlertStatus(alert.type)}>
                  <AlertIcon />
                  <VStack spacing={1} align="start" flex={1}>
                    <Text fontWeight="bold">
                      {getAlertIcon(alert.type)} {alert.type}
                    </Text>
                    <Text fontSize="sm">{alert.message}</Text>
                    {alert.room_name && (
                      <Text fontSize="xs" color="gray.600">
                        📍 {alert.room_name} (Sensor {alert.sensor_id})
                      </Text>
                    )}
                  </VStack>
                </Alert>
              ))}
            </VStack>
          )}

          {/* Alertes Environnement */}
          {environmentAlerts.length > 0 && (
            <VStack spacing={2} align="stretch">
              <Text fontWeight="bold" color="red.600" fontSize="sm">
                🌡️ ALERTES ENVIRONNEMENT ({environmentAlerts.length})
              </Text>
              {environmentAlerts.map((alert, index) => (
                <Alert key={`env-${index}`} status={getAlertStatus(alert.type)}>
                  <AlertIcon />
                  <VStack spacing={1} align="start" flex={1}>
                    <Text fontWeight="bold">
                      {getAlertIcon(alert.type)} {alert.type}
                    </Text>
                    <Text fontSize="sm">{alert.message}</Text>
                    {alert.room_name && (
                      <Text fontSize="xs" color="gray.600">
                        📍 {alert.room_name} (Sensor {alert.sensor_id})
                      </Text>
                    )}
                  </VStack>
                </Alert>
              ))}
            </VStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default AlertsCard;
