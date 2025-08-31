// SidebarFilters.js
import React from "react";
import {
  Box, FormLabel, Input,
  Checkbox, CheckboxGroup, VStack, Heading, Divider,
} from "@chakra-ui/react";

export default function SidebarFilters({
  rooms, selectedRooms, setSelectedRooms,
  selectedDate, setSelectedDate
}) {
  return (
    <Box
      as="aside"
      bg="gray.900"
      color="white"
      w={{ base: "full", md: 72 }}
      p={8}
      minH="100vh"
      boxShadow="md"
    >
      <Heading size="lg" mb={10} letterSpacing="1px">TechTemp</Heading>

      <VStack align="stretch" spacing={8}>
        <Box>
          <FormLabel htmlFor="date">Sélectionne une journée</FormLabel>
          <Input
            id="date"
            type="date"
            value={selectedDate ? toInputDateValue(selectedDate) : ''}
            onChange={e => {
              const val = e.target.value;
              if (val) {
                // Correction : toujours passer un objet Date
                const d = new Date(val);
                d.setHours(0, 0, 0, 0);
                setSelectedDate(d);
              }
            }}
            bg="gray.800"
          />
        </Box>
        <Divider borderColor="whiteAlpha.400" />
        <Box>
          <FormLabel fontWeight="bold">Pièces à afficher</FormLabel>
          <CheckboxGroup
            colorScheme="teal"
            value={selectedRooms}
            onChange={vals => setSelectedRooms(vals.map(Number))}
          >
            <VStack align="stretch" spacing={2}>
              {rooms.map(room => (
                <Checkbox value={room.id} key={room.id}>
                  {room.name}
                </Checkbox>
              ))}
            </VStack>
          </CheckboxGroup>
        </Box>
      </VStack>
    </Box>
  );
}

function toInputDateValue(date) {
  if (!date || !(date instanceof Date)) return '';
  // Décale localement, pas en UTC:
  const off = date.getTimezoneOffset();
  // On corrige en "re-localisant" l'heure à minuit
  const localISODate = new Date(date.getTime() - off * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return localISODate;
}