import React, { useState } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  Text,
  Alert,
  AlertIcon,
  Divider,
  Switch,
  FormControl,
  FormLabel
} from '@chakra-ui/react';

/**
 * Composant de test simplifié pour simuler et vérifier les alertes
 */
const AlertsTestingPanel = ({ onTestDevicesChange }) => {
  const [isTestMode, setIsTestMode] = useState(false);

  const handleActivateTestMode = () => {
    if (!isTestMode) {
      // Générer un device de test simple avec problèmes multiples
      const testDevices = [
        {
          sensor_id: 999,
          room_name: "Test Device",
          room_id: "TEST",
          status: "online",
          last_seen: Math.floor(Date.now() / 1000) - (8 * 60 * 60), // 8h ago
          temperature: 38.5, // température critique
          humidity: 92 // humidité critique
        }
      ];

      setIsTestMode(true);
      onTestDevicesChange?.(testDevices);
    } else {
      setIsTestMode(false);
      onTestDevicesChange?.([]);
    }
  };

  return (
    <Card bg="yellow.50" borderColor="yellow.200" borderWidth="2px">
      <CardHeader>
        <Heading size="md" color="yellow.700">
          🧪 Panneau de Test des Alertes
        </Heading>
        <Text fontSize="sm" color="yellow.600">
          Teste un scénario basique pour vérifier le système d'alertes
        </Text>
      </CardHeader>

      <CardBody>
        <VStack spacing={4} align="stretch">
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="test-mode" mb="0" color="yellow.700">
              Mode Test des Alertes
            </FormLabel>
            <Switch
              id="test-mode"
              isChecked={isTestMode}
              onChange={handleActivateTestMode}
              colorScheme="yellow"
            />
          </FormControl>

          {isTestMode && (
            <>
              <Divider />
              <Alert status="info" size="sm">
                <AlertIcon />
                <Text fontSize="xs">
                  Device de test injecté avec température critique (38.5°C) et humidité élevée (92%).
                  Données obsolètes de 8h pour tester les alertes temporelles.
                </Text>
              </Alert>
            </>
          )}

          <Box>
            <Heading size="sm" mb={3} color="yellow.700">
              🔧 Tests Avancés (Console)
            </Heading>
            <VStack spacing={2} align="stretch" fontSize="xs">
              <Text><strong>F12</strong> → Console → Tapez:</Text>
              <Box bg="gray.100" p={2} borderRadius="md" fontFamily="mono">
                <Text>testAllAlertScenarios()</Text>
              </Box>
              <Text>Pour tester tous les scénarios d'alertes</Text>
            </VStack>
          </Box>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default AlertsTestingPanel;