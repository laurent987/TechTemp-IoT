import React, { useState } from 'react';
import { Flex, Box, Tabs, TabList, TabPanels, Tab, TabPanel, useBreakpointValue, IconButton, Drawer, DrawerOverlay, DrawerContent, useDisclosure } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import SidebarFilters from './SidebarFilters';
import ReadingsChart from './ReadingsChart';
import RoomStatsAnalyzer from './RoomStatsAnalyzer';
import SystemMonitoring from './SystemMonitoring';
import InstallPrompt from './components/InstallPrompt';
import NotificationStatus from './components/NotificationStatus';
import { useReadingsData } from './useReadingsData';
import { usePWA } from './hooks/usePWA';

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

  // PWA hooks
  const { isOnline, isInstalled } = usePWA();
  
  // Responsive design
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box className="app-container" bg="gray.50">
      {/* Install prompt - seulement si pas installée */}
      {!isInstalled && <InstallPrompt />}
      
      {/* Indicateur offline */}
      {!isOnline && (
        <Box 
          className="offline-indicator show"
          bg="red.500" 
          color="white" 
          textAlign="center" 
          p={2} 
          fontSize="sm"
        >
          📡 Mode hors ligne - Données mises en cache
        </Box>
      )}

      <Flex minH="100vh" position="relative">
        {/* Mobile: Bouton hamburger */}
        {isMobile && (
          <IconButton
            aria-label="Ouvrir menu"
            icon={<HamburgerIcon />}
            onClick={onOpen}
            position="fixed"
            top={4}
            left={4}
            zIndex={1001}
            bg="white"
            shadow="md"
            className="mobile-only"
          />
        )}

        {/* Desktop: Sidebar fixe */}
        {!isMobile && (
          <Box 
            w="300px" 
            bg="white" 
            borderRight="1px" 
            borderColor="gray.200"
            className="sidebar desktop-only"
          >
            <SidebarFilters
              rooms={rooms}
              selectedRooms={selectedRooms}
              setSelectedRooms={setSelectedRooms}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
            
            {/* Section notifications en bas de sidebar */}
            <Box p={4} borderTop="1px" borderColor="gray.100">
              <NotificationStatus />
            </Box>
          </Box>
        )}

        {/* Mobile: Sidebar en drawer */}
        {isMobile && (
          <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
            <DrawerOverlay />
            <DrawerContent className="sidebar mobile-only">
              <SidebarFilters
                rooms={rooms}
                selectedRooms={selectedRooms}
                setSelectedRooms={setSelectedRooms}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                onClose={onClose}
              />
              
              {/* Section notifications mobile */}
              <Box p={4} borderTop="1px" borderColor="gray.100">
                <NotificationStatus />
              </Box>
            </DrawerContent>
          </Drawer>
        )}

        {/* Contenu principal */}
        <Box 
          flex="1" 
          className="main-content"
          ml={isMobile ? 0 : 0}
          pt={isMobile ? 16 : 8}
        >
          <Tabs variant="enclosed" colorScheme="blue" className="tabs-container">
            <TabList mb={4} className="tabs-list" overflowX="auto">
              <Tab className="tab-item" fontSize={{ base: "sm", md: "md" }}>
                📈 Graphiques Temps Réel
              </Tab>
              <Tab className="tab-item" fontSize={{ base: "sm", md: "md" }}>
                📊 Analyse par Room
              </Tab>
              <Tab className="tab-item" fontSize={{ base: "sm", md: "md" }}>
                🖥️ Monitoring Système
              </Tab>
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
    </Box>
  );
}

export default App;