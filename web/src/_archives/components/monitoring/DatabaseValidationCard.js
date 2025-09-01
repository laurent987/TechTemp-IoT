import React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  Grid,
  Box,
  HStack,
  Badge
} from '@chakra-ui/react';

const DatabaseValidationCard = ({ firebaseData, systemHealth }) => (
  <Card>
    <CardHeader>
      <Heading size="md">📊 Validation Base de Données</Heading>
      <Text fontSize="sm" color="gray.600">
        Vérification des lectures enregistrées (objectif: 12 lectures/capteur/heure)
      </Text>
    </CardHeader>
    <CardBody>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={4}>
        {(firebaseData?.devices || systemHealth?.devices)?.map((device) => {
          const fbDevice = firebaseData?.devices?.find(d => d.sensor_id === device.sensor_id);
          const recentCount = fbDevice?.recent_count || device.recent_count || 0;

          return (
            <Box key={device.sensor_id} p={3} bg="gray.50" borderRadius="md">
              <HStack justify="space-between" mb={2}>
                <Text fontWeight="medium" fontSize="sm">{device.room_name}</Text>
                <Badge colorScheme="blue" variant="solid" fontSize="xs">
                  ID {device.sensor_id}
                </Badge>
              </HStack>
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.600">Lectures/heure:</Text>
                <Badge
                  colorScheme={recentCount >= 10 ? "green" : "yellow"}
                  variant="solid"
                >
                  {recentCount}/12
                </Badge>
              </HStack>
            </Box>
          );
        })}
      </Grid>
    </CardBody>
  </Card>
);

export default DatabaseValidationCard;
