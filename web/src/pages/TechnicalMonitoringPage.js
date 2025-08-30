import React from 'react';
import { Box, Container, useBreakpointValue } from '@chakra-ui/react';
import TechnicalMonitoring from '../components/technical/TechnicalMonitoring';

export default function TechnicalMonitoringPage() {
  // Responsive design
  const containerMaxW = useBreakpointValue({
    base: "100%",
    sm: "container.sm",
    md: "container.md",
    lg: "container.lg",
    xl: "container.xl"
  });

  return (
    <Box flex="1" className="technical-monitoring-container">
      <Container
        maxW={containerMaxW}
        p={{ base: 0, md: 6 }}
        px={{ base: 1, md: 6 }}
        className="technical-monitoring-content"
      >
        <TechnicalMonitoring />
      </Container>
    </Box>
  );
}
