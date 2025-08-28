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
  if (!alerts || alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <Heading size="md">🚨 Alertes Système</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={3} align="stretch">
          {alerts.map((alert, index) => (
            <Alert key={index} status="warning">
              <AlertIcon />
              <VStack spacing={1} align="start">
                <Text fontWeight="bold">{alert.type}</Text>
                <Text fontSize="sm">{alert.message}</Text>
                <Text fontSize="xs" color="gray.600">
                  Sensor: {alert.sensor_id} | Device: {alert.device}
                </Text>
              </VStack>
            </Alert>
          ))}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default AlertsCard;
