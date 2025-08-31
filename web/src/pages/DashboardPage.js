import React, { useState } from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import SidebarFilters from '../components/common/SidebarFilters';
import ReadingsChart from '../components/environmental/ReadingsChart';
import { useReadingsData } from '../hooks/useReadingsData';

export default function DashboardPage() {
  // Sélection d'une date (par défaut aujourd'hui)
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

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

  const selectedRoomNames = rooms
    .filter(r => selectedRooms.includes(r.id))
    .map(r => r.name);

  // Responsive design
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <Flex flex="1" className="dashboard-container">
      {/* Sidebar avec filtres - uniquement sur cette page */}
      {!isMobile && (
        <Box
          w="300px"
          bg="white"
          borderRight="1px"
          borderColor="gray.200"
          className="dashboard-sidebar"
        >
          <SidebarFilters
            rooms={rooms}
            selectedRooms={selectedRooms}
            setSelectedRooms={setSelectedRooms}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
          />
        </Box>
      )}

      {/* Contenu principal */}
      <Box flex="1" className="dashboard-content">
        <ReadingsChart
          data={data}
          selectedRooms={selectedRoomNames}
          loading={loading}
          error={error}
          startDate={startTimestamp}
          endDate={endTimestamp}
        />
      </Box>
    </Flex>
  );
}
