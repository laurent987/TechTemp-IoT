import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import Header from './components/Header';
import { DashboardPage, AnalyticsPage, MonitoringPage } from './pages';
import InstallPrompt from './components/InstallPrompt';
import { usePWA } from './hooks/usePWA';

// ---------------------
// App.js
// ---------------------
function App() {
  // PWA hooks
  const { isOnline, isInstalled } = usePWA();

  return (
    <Router>
      <Box className="app-container" bg="gray.50" minH="100vh">
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
            position="fixed"
            top={0}
            left={0}
            right={0}
            zIndex={1002}
          >
            📡 Mode hors ligne - Données mises en cache
          </Box>
        )}

        {/* Header avec navigation */}
        <Header />

        {/* Contenu principal avec routes */}
        <Box
          as="main"
          className="main-content"
          pt={{
            base: !isOnline ? 14 : 2, // Réduit sur mobile
            md: !isOnline ? 16 : 4    // Normal sur desktop
          }}
          px={{ base: 0, md: 0 }} // Pas de padding horizontal pour permettre edge-to-edge
          display="flex"
          flexDirection="column"
          flex="1"
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}

export default App;