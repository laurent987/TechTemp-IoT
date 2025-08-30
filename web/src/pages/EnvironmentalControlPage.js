import React from 'react';
import { Box, Container, useBreakpointValue } from '@chakra-ui/react';
import EnvironmentalControl from '../components/environmental/EnvironmentalControl';

export default function EnvironmentalControlPage() {
  // Responsive design
  const containerMaxW = useBreakpointValue({
    base: "100%",
    sm: "container.sm",
    md: "container.md",
    lg: "container.lg",
    xl: "container.xl"
  });

  return (
    <Box flex="1" className="environmental-control-container">
      <Container
        maxW={containerMaxW}
        p={{ base: 0, md: 6 }}
        px={{ base: 1, md: 6 }}
        className="environmental-control-content"
      >
        <EnvironmentalControl />
      </Container>
    </Box>
  );
}
