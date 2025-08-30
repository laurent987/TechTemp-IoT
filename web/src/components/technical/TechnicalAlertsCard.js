import React from 'react';
import {
  Alert,
  AlertIcon,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge
} from '@chakra-ui/react';

const TechnicalAlertsCard = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Heading size="md">✅ Statut Technique</Heading>
        </CardHeader>
        <CardBody>
          <Alert status="success">
            <AlertIcon />
            <VStack spacing={1} align="start">
              <Text fontWeight="bold">Aucune alerte technique</Text>
              <Text fontSize="sm">Infrastructure et capteurs fonctionnent normalement</Text>
            </VStack>
          </Alert>
        </CardBody>
      </Card>
    );
  }

  const getAlertStatus = (alertType) => {
    if (alertType?.includes('Critique') || alertType?.includes('Offline')) return 'error';
    if (alertType?.includes('Données') || alertType?.includes('Obsolètes')) return 'warning';
    return 'info';
  };

  const getAlertIcon = (alertType) => {
    if (alertType?.includes('Offline')) return '📡';
    if (alertType?.includes('Données')) return '⏰';
    if (alertType?.includes('Système')) return '⚙️';
    return '🔧';
  };

  return (
    <Card>
      <CardHeader>
        <HStack justify="space-between">
          <Heading size="md">🚨 Alertes Techniques ({alerts.length})</Heading>
          <Badge colorScheme="orange" variant="solid">
            TECHNIQUE
          </Badge>
        </HStack>
        <Text fontSize="sm" color="gray.600">
          Problèmes d'infrastructure, connectivité et fonctionnement des capteurs
        </Text>
      </CardHeader>
      <CardBody>
        <VStack spacing={3} align="stretch">
          {alerts.map((alert, index) => (
            <Alert key={index} status={getAlertStatus(alert.type)}>
              <AlertIcon />
              <VStack spacing={1} align="start" flex={1}>
                <HStack>
                  <Text fontWeight="bold">
                    {getAlertIcon(alert.type)} {alert.type}
                  </Text>
                  <Badge colorScheme="gray" size="sm">
                    ID: {alert.sensor_id}
                  </Badge>
                </HStack>
                <Text fontSize="sm">{alert.message}</Text>
                {alert.room_name && (
                  <Text fontSize="xs" color="gray.600">
                    📍 {alert.room_name} • Device: {alert.sensor_id} • Room: {alert.room_id || 'N/A'}
                  </Text>
                )}
              </VStack>
            </Alert>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default TechnicalAlertsCard;
