import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Collapse,
  useBreakpointValue,
  Switch,
  FormControl,
  FormLabel,
  Spinner,
  IconButton,
  Flex
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronRightIcon, RepeatIcon } from '@chakra-ui/icons';
import { formatLastSeen, getStatusColor } from '../../utils/systemMonitoringHelpers';

const TechnicalDevicesTable = ({
  devices,
  useRealTime,
  readingInProgress,
  updatedDevices,
  onTriggerReading,
  onToggleRealTime
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [expandedDevices, setExpandedDevices] = useState(new Set());

  const toggleDevice = (deviceId) => {
    setExpandedDevices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deviceId)) {
        newSet.delete(deviceId);
      } else {
        newSet.add(deviceId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status) => {
    const colorScheme = getStatusColor(status);
    const statusIcon = {
      'online': '🟢',
      'healthy': '🟢',
      'offline': '🔴',
      'warning': '🟡',
      'critical': '🔴'
    };

    return (
      <Badge colorScheme={colorScheme} variant="subtle">
        {statusIcon[status] || '⚪'} {status}
      </Badge>
    );
  };

  const renderMobileAccordion = () => (
    <VStack spacing={2} align="stretch">
      {devices.map((device) => {
        const isExpanded = expandedDevices.has(device.sensor_id);
        const isReading = readingInProgress.has(device.sensor_id) || readingInProgress.has('all');
        const isUpdated = updatedDevices.has(device.sensor_id);

        return (
          <Card key={device.sensor_id} size="sm" variant={isUpdated ? "filled" : "outline"}>
            <CardBody p={3}>
              {/* Ligne principale - toujours visible */}
              <HStack
                justify="space-between"
                cursor="pointer"
                onClick={() => toggleDevice(device.sensor_id)}
              >
                <HStack spacing={3} flex={1}>
                  <IconButton
                    icon={isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    size="xs"
                    variant="ghost"
                    aria-label="Expand device details"
                  />
                  <VStack spacing={0} align="start">
                    <Text fontWeight="bold" fontSize="sm">
                      {device.room_name}
                    </Text>
                    <HStack spacing={2}>
                      {getStatusBadge(device.status)}
                      <Text fontSize="xs" color="gray.600">
                        ID: {device.sensor_id}
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>

                {/* Actions */}
                <HStack spacing={2}>
                  <IconButton
                    icon={isReading ? <Spinner size="xs" /> : <RepeatIcon />}
                    size="xs"
                    colorScheme="blue"
                    variant="ghost"
                    isLoading={isReading}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerReading(device.sensor_id);
                    }}
                    aria-label="Trigger reading"
                  />
                </HStack>
              </HStack>

              {/* Détails - collapsible */}
              <Collapse in={isExpanded}>
                <Box mt={3} pt={3} borderTop="1px" borderColor="gray.200">
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Device ID:</Text>
                      <Text fontSize="xs" fontFamily="mono">{device.sensor_id}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Room ID:</Text>
                      <Text fontSize="xs" fontFamily="mono">{device.room_id}</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Température:</Text>
                      <Text fontSize="xs">
                        {device.temperature !== null ? `${device.temperature}°C` : 'N/A'}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Humidité:</Text>
                      <Text fontSize="xs">
                        {device.humidity !== null ? `${device.humidity}%` : 'N/A'}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Dernière lecture:</Text>
                      <Text fontSize="xs">{formatLastSeen(device.last_seen)}</Text>
                    </HStack>
                  </VStack>
                </Box>
              </Collapse>
            </CardBody>
          </Card>
        );
      })}
    </VStack>
  );

  const renderDesktopTable = () => (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>Pièce</Th>
          <Th>Statut</Th>
          <Th>Device ID</Th>
          <Th>Room ID</Th>
          <Th>Température</Th>
          <Th>Humidité</Th>
          <Th>Dernière lecture</Th>
          <Th>Actions</Th>
        </Tr>
      </Thead>
      <Tbody>
        {devices.map((device) => {
          const isReading = readingInProgress.has(device.sensor_id) || readingInProgress.has('all');
          const isUpdated = updatedDevices.has(device.sensor_id);

          return (
            <Tr key={device.sensor_id} bg={isUpdated ? "green.50" : "inherit"}>
              <Td fontWeight="medium">{device.room_name}</Td>
              <Td>{getStatusBadge(device.status)}</Td>
              <Td fontFamily="mono" fontSize="sm">{device.sensor_id}</Td>
              <Td fontFamily="mono" fontSize="sm">{device.room_id}</Td>
              <Td>{device.temperature !== null ? `${device.temperature}°C` : 'N/A'}</Td>
              <Td>{device.humidity !== null ? `${device.humidity}%` : 'N/A'}</Td>
              <Td fontSize="sm">{formatLastSeen(device.last_seen)}</Td>
              <Td>
                <IconButton
                  icon={isReading ? <Spinner size="xs" /> : <RepeatIcon />}
                  size="xs"
                  colorScheme="blue"
                  variant="ghost"
                  isLoading={isReading}
                  onClick={() => onTriggerReading(device.sensor_id)}
                  aria-label="Trigger reading"
                />
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
          <VStack spacing={1} align="start">
            <Heading size="md">📋 État des Capteurs ({devices.length})</Heading>
            <Text fontSize="sm" color="gray.600">
              Informations techniques détaillées - Device ID, Room ID, connectivité
            </Text>
          </VStack>

          <HStack spacing={4}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="realtime-switch" mb="0" fontSize="sm">
                Temps réel
              </FormLabel>
              <Switch
                id="realtime-switch"
                isChecked={useRealTime}
                onChange={onToggleRealTime}
                colorScheme="blue"
              />
            </FormControl>

            <Button
              size="sm"
              colorScheme="blue"
              leftIcon={readingInProgress.has('all') ? <Spinner size="xs" /> : <RepeatIcon />}
              onClick={() => onTriggerReading()}
              isLoading={readingInProgress.has('all')}
            >
              Lecture globale
            </Button>
          </HStack>
        </Flex>
      </CardHeader>
      <CardBody>
        {isMobile ? renderMobileAccordion() : renderDesktopTable()}
      </CardBody>
    </Card>
  );
};

export default TechnicalDevicesTable;
