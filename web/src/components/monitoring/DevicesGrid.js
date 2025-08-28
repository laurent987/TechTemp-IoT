import React from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Grid,
  Heading,
  HStack
} from '@chakra-ui/react';
import { RepeatIcon } from '@chakra-ui/icons';
import DeviceCard from './DeviceCard';

const DevicesGrid = ({
  devices,
  useRealTime,
  readingInProgress,
  updatedDevices,
  onTriggerReading,
  onToggleRealTime
}) => {
  return (
    <Card>
      <CardHeader>
        <Flex
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
          gap={4}
          mb={4}
        >
          <Flex align="center" gap={3} wrap="wrap">
            <Heading size="md">État des Devices</Heading>
            <Badge colorScheme={useRealTime ? "green" : "blue"} variant="subtle" fontSize="sm">
              {useRealTime ? "📡 Temps Réel - Valeurs directement mesurées" : "☁️ Firebase - Moyennes sur 1 heure"}
            </Badge>
          </Flex>

          <HStack spacing={2}>
            {useRealTime && (
              <Button
                size="sm"
                colorScheme="orange"
                variant="solid"
                onClick={() => onTriggerReading()}
                fontSize="sm"
                isLoading={readingInProgress.has('all')}
                loadingText="⏳ Lecture en cours..."
                isDisabled={readingInProgress.has('all')}
                leftIcon={<RepeatIcon />}
              >
                {readingInProgress.has('all') ? "⏳ En cours..." : "🚀 Lecture globale"}
              </Button>
            )}

            <Button
              size="sm"
              variant={useRealTime ? "solid" : "outline"}
              colorScheme={useRealTime ? "blue" : "green"}
              onClick={onToggleRealTime}
              fontSize="sm"
            >
              {useRealTime ? "☁️ Voir Firebase" : "📡 Voir en temps réel"}
            </Button>
          </HStack>
        </Flex>
      </CardHeader>

      <CardBody>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }} gap={{ base: 4, md: 6 }}>
          {devices
            .sort((a, b) => a.sensor_id - b.sensor_id)
            .map((device) => (
              <DeviceCard
                key={device.sensor_id}
                device={device}
                useRealTime={useRealTime}
                readingInProgress={readingInProgress}
                updatedDevices={updatedDevices}
                onTriggerReading={onTriggerReading}
              />
            ))}
        </Grid>
      </CardBody>
    </Card>
  );
};

export default DevicesGrid;
