import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  VStack,
  FormControl,
  FormLabel,
  Input,
  CheckboxGroup,
  Checkbox,
  Button,
  Collapse,
  useDisclosure,
  Text,
  Badge,
  Box,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';

const EnvironmentalChartFilters = ({
  rooms = [],
  selectedRooms = [],
  setSelectedRooms,
  selectedDate,
  setSelectedDate,
  onApplyFilters
}) => {
  const { isOpen, onToggle } = useDisclosure();

  const toInputDateValue = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const newDate = new Date(dateValue);
      newDate.setHours(0, 0, 0, 0);
      setSelectedDate(newDate);
    } else {
      setSelectedDate(null);
    }
  };

  const selectedRoomNames = rooms
    .filter(r => selectedRooms.includes(r.id))
    .map(r => r.name);

  return (
    <Card variant="outline" borderColor="green.200">
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <HStack>
            <Heading size="sm" color="green.700">
              🔧 Filtres du graphique
            </Heading>
            {selectedRoomNames.length > 0 && (
              <Badge colorScheme="green" variant="subtle">
                {selectedRoomNames.length} pièce(s)
              </Badge>
            )}
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggle}
            leftIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            {isOpen ? 'Masquer' : 'Filtrer'}
          </Button>
        </HStack>
      </CardHeader>

      <Collapse in={isOpen}>
        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">

            {/* Sélection de date */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.700">📅 Date</FormLabel>
              <Input
                type="date"
                size="sm"
                value={selectedDate ? toInputDateValue(selectedDate) : ''}
                onChange={handleDateChange}
                max={toInputDateValue(new Date())}
              />
              <Text fontSize="xs" color="gray.600" mt={1}>
                {selectedDate
                  ? `Données du ${new Date(selectedDate).toLocaleDateString('fr-FR')}`
                  : 'Sélectionnez une date'
                }
              </Text>
            </FormControl>

            {/* Sélection des pièces */}
            <FormControl>
              <FormLabel fontSize="sm" color="gray.700">🏠 Pièces</FormLabel>
              <CheckboxGroup
                value={selectedRooms}
                onChange={setSelectedRooms}
              >
                <Wrap spacing={2}>
                  {rooms.map((room) => (
                    <WrapItem key={room.id}>
                      <Checkbox
                        value={room.id}
                        size="sm"
                        colorScheme="green"
                      >
                        <Text fontSize="sm">{room.name}</Text>
                      </Checkbox>
                    </WrapItem>
                  ))}
                </Wrap>
              </CheckboxGroup>
              <Text fontSize="xs" color="gray.600" mt={1}>
                {selectedRoomNames.length > 0
                  ? `${selectedRoomNames.join(', ')}`
                  : 'Aucune pièce sélectionnée'
                }
              </Text>
            </FormControl>

            {/* Actions rapides */}
            <HStack spacing={2}>
              <Button
                size="xs"
                variant="outline"
                colorScheme="green"
                onClick={() => setSelectedRooms(rooms.map(r => r.id))}
              >
                Tout sélectionner
              </Button>
              <Button
                size="xs"
                variant="outline"
                colorScheme="gray"
                onClick={() => setSelectedRooms([])}
              >
                Tout désélectionner
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Collapse>
    </Card>
  );
};

export default EnvironmentalChartFilters;
