import React from 'react';
import { Box, Container, useBreakpointValue } from '@chakra-ui/react';
import RoomStatsAnalyzer from '../components/analytics/RoomStatsAnalyzer';

export default function AnalyticsPage() {
  // Responsive design
  const containerMaxW = useBreakpointValue({
    base: "100%",
    sm: "container.sm",
    md: "container.md",
    lg: "container.lg",
    xl: "container.xl"
  });

  return (
    <Box flex="1" className="analytics-container">
      <Container
        maxW={containerMaxW}
        p={{ base: 4, md: 6 }}
        className="analytics-content"
      >
        <RoomStatsAnalyzer />
      </Container>
    </Box>
  );
}
