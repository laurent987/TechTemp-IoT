import React from 'react';
import { Box, Container, useBreakpointValue } from '@chakra-ui/react';
import SystemMonitoring from '../SystemMonitoring';

export default function MonitoringPage() {
  // Responsive design
  const containerMaxW = useBreakpointValue({
    base: "100%",
    sm: "container.sm",
    md: "container.md",
    lg: "container.lg",
    xl: "container.xl"
  });

  return (
    <Box flex="1" className="monitoring-container">
      <Container
        maxW={containerMaxW}
        p={{ base: 4, md: 6 }}
        className="monitoring-content"
      >
        <SystemMonitoring />
      </Container>
    </Box>
  );
}
