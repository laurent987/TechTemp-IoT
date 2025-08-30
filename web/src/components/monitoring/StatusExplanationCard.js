import React, { useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Collapse,
  Button,
  Box,
  Badge,
  Divider
} from '@chakra-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons';

const StatusExplanationCard = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card bg="blue.50" borderColor="blue.200" borderWidth={1}>
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Heading size="sm" color="blue.700">
            💡 Explication des Statuts
          </Heading>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
            leftIcon={isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          >
            {isOpen ? 'Masquer' : 'Voir détails'}
          </Button>
        </HStack>
      </CardHeader>

      <Collapse in={isOpen}>
        <CardBody pt={0}>
          <VStack spacing={4} align="stretch">

            {/* Statut Technique */}
            <Box>
              <Text fontWeight="bold" color="blue.600" mb={2}>
                🔧 Statut Technique (Healthy/Warning/Critical)
              </Text>
              <Text fontSize="sm" mb={2}>
                Vérifie si l'infrastructure fonctionne correctement :
              </Text>
              <VStack spacing={1} align="start" pl={4}>
                <HStack>
                  <Badge colorScheme="green">✅ Healthy</Badge>
                  <Text fontSize="xs">Serveurs, base de données, connectivité OK</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="yellow">⚠️ Warning</Badge>
                  <Text fontSize="xs">Quelques problèmes de connectivité</Text>
                </HStack>
                <HStack>
                  <Badge colorScheme="red">❌ Critical</Badge>
                  <Text fontSize="xs">Panne majeure du système</Text>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            {/* Alertes Système */}
            <Box>
              <Text fontWeight="bold" color="orange.600" mb={2}>
                ⚙️ Alertes Système
              </Text>
              <Text fontSize="sm" mb={2}>
                Problèmes techniques avec les capteurs :
              </Text>
              <VStack spacing={1} align="start" pl={4}>
                <Text fontSize="xs">• 📡 Device Offline - Capteur déconnecté</Text>
                <Text fontSize="xs">• ⏰ Données Obsolètes - Pas de nouvelles lectures</Text>
                <Text fontSize="xs">• 🔌 Données Manquantes - Aucune donnée disponible</Text>
              </VStack>
            </Box>

            <Divider />

            {/* Alertes Environnement */}
            <Box>
              <Text fontWeight="bold" color="red.600" mb={2}>
                🌡️ Alertes Environnement
              </Text>
              <Text fontSize="sm" mb={2}>
                Valeurs anormales détectées par les capteurs :
              </Text>
              <VStack spacing={1} align="start" pl={4}>
                <Text fontSize="xs">• 🌡️ Température Critique - Trop chaud/froid (&lt;5°C ou &gt;35°C)</Text>
                <Text fontSize="xs">• 🌡️ Température Élevée/Basse - Hors zone confort (15-28°C)</Text>
                <Text fontSize="xs">• 💧 Humidité Critique - Risque moisissure (&gt;85%) ou air sec (&lt;15%)</Text>
                <Text fontSize="xs">• 💧 Humidité Élevée/Basse - Hors zone confort (30-50%)</Text>
              </VStack>
            </Box>

            <Divider />

            <Box bg="green.50" p={3} borderRadius="md" borderColor="green.200" borderWidth={1}>
              <Text fontSize="sm" color="green.700">
                <strong>💡 Bon à savoir :</strong> Un système peut être "Healthy"
                techniquement mais avoir des alertes environnement. C'est normal !
                Cela signifie que les capteurs fonctionnent bien et détectent
                correctement les conditions anormales.
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Collapse>
    </Card>
  );
};

export default StatusExplanationCard;
