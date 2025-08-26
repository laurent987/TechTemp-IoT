import React, { useState } from 'react';
import { Flex, Box, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import SidebarFilters from './SidebarFilters';
import ReadingsChart from './ReadingsChart';
import RoomStatsAnalyzer from './RoomStatsAnalyzer';
import SystemMonitoring from './SystemMonitoring';
import { useReadingsData } from './useReadingsData';

// ---------------------
// App.js
// ---------------------
function App() {
  // Sélection d'une date (par défaut aujourd'hui)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  console.log("Date sélectionnée:", selectedDate);

  // Ces timestamps sont des nombres (primitifs stables !)
  const startTimestamp = (() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const endTimestamp = (() => {
    const d = new Date(selectedDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  })();

  // Centralise la récupération des données une seule fois ici
  const {
    rooms,
    selectedRooms,
    setSelectedRooms,
    data,
    loading,
    error,
  } = useReadingsData({ startDate: startTimestamp, endDate: endTimestamp });

  console.log("Données récupérées:", data);

  const selectedRoomNames = rooms
    .filter(r => selectedRooms.includes(r.id))
    .map(r => r.name);

  return (
    <Flex minH="100vh" bg="gray.50">
      <SidebarFilters
        rooms={rooms}
        selectedRooms={selectedRooms}
        setSelectedRooms={setSelectedRooms}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
      <Box flex="1" p={8}>        <Tabs variant="enclosed" colorScheme="blue">
        <TabList mb={4}>
          <Tab>📈 Graphiques Temps Réel</Tab>
          <Tab>📊 Analyse par Room</Tab>
          <Tab>🖥️ Monitoring Système</Tab>
        </TabList>

        <TabPanels>
          <TabPanel p={0}>
            <ReadingsChart
              data={data}
              selectedRooms={selectedRoomNames}
              loading={loading}
              error={error}
              startDate={startTimestamp}
              endDate={endTimestamp}
            />
          </TabPanel>

          <TabPanel p={0}>
            <RoomStatsAnalyzer />
          </TabPanel>

          <TabPanel p={0}>
            <SystemMonitoring />
          </TabPanel>
        </TabPanels>
      </Tabs>
      </Box>
    </Flex>
  );
}

export default App;