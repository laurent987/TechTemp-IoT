import React from 'react';
import {
  Box,
  Flex,
  Heading,
  HStack,
  IconButton,
  useBreakpointValue,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  VStack,
  Button,
  Image,
  Badge
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { Link, useLocation } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';
import { useGlobalAlerts } from '../hooks/useGlobalAlerts';

const Navigation = ({ isVertical = false, onClose }) => {
  const location = useLocation();
  const { environmentalAlerts, technicalAlerts } = useGlobalAlerts();

  const navItems = [
    {
      path: '/',
      label: 'Environmental Control',
      icon: '🌡️',
      alertCount: environmentalAlerts
    },
    {
      path: '/analytics',
      label: 'Analyse',
      icon: '📊',
      alertCount: 0 // Pas d'alertes pour analytics
    },
    {
      path: '/technical',
      label: 'Technical Monitoring',
      icon: '⚙️',
      alertCount: technicalAlerts
    }
  ];

  const NavButton = ({ item }) => (
    <Button
      as={Link}
      to={item.path}
      variant={location.pathname === item.path ? 'solid' : 'ghost'}
      colorScheme={location.pathname === item.path ? 'blue' : 'gray'}
      size={isVertical ? 'md' : 'sm'}
      onClick={onClose}
      justifyContent={isVertical ? 'flex-start' : 'center'}
      w={isVertical ? 'full' : 'auto'}
      position="relative"
    >
      {item.label}
      {item.alertCount > 0 && (
        <Badge
          colorScheme="red"
          variant="solid"
          borderRadius="full"
          fontSize="xs"
          position="absolute"
          top="-5px"
          right="-5px"
          minW="20px"
          h="20px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {item.alertCount > 99 ? '99+' : item.alertCount}
        </Badge>
      )}
    </Button>
  );

  if (isVertical) {
    return (
      <VStack spacing={2} align="stretch">
        {navItems.map((item) => (
          <NavButton key={item.path} item={item} />
        ))}
      </VStack>
    );
  }

  return (
    <HStack spacing={4}>
      {navItems.map((item) => (
        <NavButton key={item.path} item={item} />
      ))}
    </HStack>
  );
};

export default function Header() {
  const { isOnline } = usePWA();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <>
      <Box
        as="header"
        bg="white"
        borderBottom="1px"
        borderColor="gray.200"
        px={4}
        py={3}
        position="sticky"
        top={0}
        zIndex={1000}
        boxShadow="sm"
      >
        <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
          {/* Logo et titre */}
          <HStack spacing={3}>
            <Box
              w="40px"
              h="40px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Image
                src="/favicon.svg"
                alt="TechTemp Logo"
                w="40px"
                h="40px"
                fallback={
                  <Box
                    w="40px"
                    h="40px"
                    bg="blue.500"
                    borderRadius="lg"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color="white"
                    fontSize="20px"
                    fontWeight="bold"
                  >
                    🌡️
                  </Box>
                }
              />
            </Box>
            <Box>
              <Heading size="md" color="blue.600">
                TechTemp
              </Heading>
              <Box fontSize="xs" color="gray.500" display={{ base: 'none', sm: 'block' }}>
                IoT Monitoring
              </Box>
            </Box>
          </HStack>

          {/* Navigation desktop */}
          {!isMobile && (
            <Navigation />
          )}

          {/* Status et menu mobile */}
          <HStack spacing={3}>
            {/* Indicateur status */}
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={isOnline ? 'green.400' : 'red.400'}
              title={isOnline ? 'En ligne' : 'Hors ligne'}
            />

            {/* Menu mobile */}
            {isMobile && (
              <IconButton
                aria-label="Menu"
                icon={<HamburgerIcon />}
                variant="ghost"
                onClick={onOpen}
              />
            )}
          </HStack>
        </Flex>
      </Box>

      {/* Drawer mobile */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <Box p={4}>
            <Flex justify="space-between" align="center" mb={6}>
              <Heading size="md" color="blue.600">Menu</Heading>
              <IconButton
                aria-label="Fermer"
                icon={<CloseIcon />}
                variant="ghost"
                onClick={onClose}
              />
            </Flex>
            <Navigation isVertical onClose={onClose} />
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  );
}
