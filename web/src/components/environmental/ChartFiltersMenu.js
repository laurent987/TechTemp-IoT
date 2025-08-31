import React from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuDivider,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  CheckboxGroup,
  Checkbox,
  Switch,
  Text,
  Box,
  Badge
} from '@chakra-ui/react';
import { ChevronDownIcon, SettingsIcon } from '@chakra-ui/icons';

const ChartFiltersMenu = ({
  rooms = [],
  selectedRooms = [],
  setSelectedRooms,
  selectedDate,
  setSelectedDate,
  showWeather,
  setShowWeather
}) => {
  const selectedCount = selectedRooms.length;
  const totalRooms = rooms.length;

  // Helper pour gérer les rooms qui peuvent être des strings ou des objets
  const getRoomId = (room) => typeof room === 'string' ? room : room.id;
  const getRoomName = (room) => typeof room === 'string' ? room : room.name;

  const formatDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    newDate.setHours(0, 0, 0, 0);
    setSelectedDate(newDate);
  };

  const handleSelectAll = () => {
    if (selectedRooms.length === totalRooms) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(rooms.map(getRoomName)); // Utiliser les noms au lieu des IDs
    }
  };

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        leftIcon={<SettingsIcon />}
        variant="outline"
        size="sm"
        colorScheme="blue"
      >
        Filtres
        {selectedCount < totalRooms && (
          <Badge ml={2} colorScheme="blue" variant="solid">
            {selectedCount}/{totalRooms}
          </Badge>
        )}
      </MenuButton>

      <MenuList p={4} minW="300px">
        <VStack spacing={4} align="stretch">
          {/* Filtre de date */}
          <Box>
            <Text fontSize="sm" fontWeight="semibold" mb={2}>
              Date
            </Text>
            <Input
              type="date"
              size="sm"
              value={formatDate(selectedDate)}
              onChange={handleDateChange}
            />
          </Box>

          <MenuDivider />

          {/* Filtre température extérieure */}
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="weather-toggle" mb="0" fontSize="sm">
              Température extérieure
            </FormLabel>
            <Switch
              id="weather-toggle"
              isChecked={showWeather}
              onChange={(e) => setShowWeather(e.target.checked)}
              colorScheme="blue"
              size="sm"
            />
          </FormControl>

          <MenuDivider />

          {/* Sélection des pièces */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="semibold">
                Pièces ({selectedCount}/{totalRooms})
              </Text>
              <Button
                size="xs"
                variant="link"
                colorScheme="blue"
                onClick={handleSelectAll}
              >
                {selectedCount === totalRooms ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            </HStack>

            <CheckboxGroup
              value={selectedRooms}
              onChange={setSelectedRooms}
            >
              <VStack align="start" spacing={1} maxH="200px" overflowY="auto">
                {rooms.map((room) => (
                  <Checkbox
                    key={getRoomId(room)}
                    value={getRoomName(room)}
                    size="sm"
                    colorScheme="blue"
                  >
                    {getRoomName(room)}
                  </Checkbox>
                ))}
              </VStack>
            </CheckboxGroup>
          </Box>
        </VStack>
      </MenuList>
    </Menu>
  );
};

export default ChartFiltersMenu;
