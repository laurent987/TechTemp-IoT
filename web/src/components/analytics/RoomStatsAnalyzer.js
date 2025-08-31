import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Alert,
  AlertIcon,
  Spinner,
  Text,
  VStack,
  HStack,
  Badge,
  Flex,
  useToast
} from '@chakra-ui/react';

const RoomStatsAnalyzer = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format YYYY-MM-DD
  });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  const fetchRoomStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://us-central1-techtemp-49c7f.cloudfunctions.net/getRoomStatsByDate?date=${selectedDate}`
      );

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);

      toast({
        title: "Analyse terminée",
        description: `${data.total_records} enregistrements trouvés pour ${data.rooms_active} rooms`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

    } catch (err) {
      setError(err.message);
      toast({
        title: "Erreur",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={6} bg="white" borderRadius="lg" shadow="md">
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold" color="blue.600">
          📊 Analyse des Enregistrements par Room
        </Text>

        <HStack spacing={4}>
          <Box>
            <Text fontSize="sm" color="gray.600" mb={1}>Date d'analyse:</Text>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              bg="gray.50"
            />
          </Box>
          <Box pt={6}>
            <Button
              colorScheme="blue"
              onClick={fetchRoomStats}
              isLoading={loading}
              loadingText="Analyse..."
            >
              Analyser
            </Button>
          </Box>
        </HStack>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {loading && (
          <Flex justify="center" py={8}>
            <Spinner size="lg" color="blue.500" />
          </Flex>
        )}

        {stats && (
          <VStack spacing={4} align="stretch">
            {/* Résumé */}
            <Box bg="blue.50" p={4} borderRadius="md">
              <HStack spacing={6}>
                <Box>
                  <Text fontSize="sm" color="gray.600">Date analysée</Text>
                  <Text fontSize="lg" fontWeight="bold">{stats.date}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600">Total enregistrements</Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.600">
                    {stats.total_records.toLocaleString()}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600">Rooms actives</Text>
                  <Text fontSize="lg" fontWeight="bold" color="green.600">
                    {stats.rooms_active}
                  </Text>
                </Box>
              </HStack>
            </Box>

            {/* Tableau des statistiques */}
            {stats.room_statistics.length > 0 ? (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead bg="gray.50">
                    <Tr>
                      <Th>Sensor ID</Th>
                      <Th>Room ID</Th>
                      <Th>Emplacement</Th>
                      <Th isNumeric>Enregistrements</Th>
                      <Th>Premier</Th>
                      <Th>Dernier</Th>
                      <Th>Durée (h)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {stats.room_statistics.map((room, index) => (
                      <Tr key={room.room_id} bg={index % 2 === 0 ? "white" : "gray.50"}>
                        <Td>
                          <Badge colorScheme="purple" variant="outline">
                            {room.sensor_id || '-'}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme="blue" variant="outline">
                            {room.room_id}
                          </Badge>
                        </Td>
                        <Td fontWeight="medium" color="gray.700">{room.room_name}</Td>
                        <Td isNumeric>
                          <Badge
                            colorScheme={room.record_count > 100 ? "green" : room.record_count > 50 ? "yellow" : "red"}
                          >
                            {room.record_count.toLocaleString()}
                          </Badge>
                        </Td>
                        <Td fontSize="xs" color="gray.600">
                          {new Date(room.first_record).toLocaleTimeString('fr-FR')}
                        </Td>
                        <Td fontSize="xs" color="gray.600">
                          {new Date(room.last_record).toLocaleTimeString('fr-FR')}
                        </Td>
                        <Td isNumeric color="gray.600">{room.duration_hours}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <Alert status="info">
                <AlertIcon />
                Aucun enregistrement trouvé pour cette date
              </Alert>
            )}
          </VStack>
        )}
      </VStack>
    </Box>
  );
};

export default RoomStatsAnalyzer;
