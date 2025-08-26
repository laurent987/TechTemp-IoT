import React from "react";
import { colorForRoom } from './colors';
import { useWeatherData } from './weatherService';
import {
  Box,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Flex,
  Container,
  VStack,
  useBreakpointValue,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush
} from "recharts";

// Fonction de transformation mise à jour
function pivotReadings(rawReadings, selectedRooms, includeWeather = false, weatherData = []) {
  if (!Array.isArray(rawReadings)) return [];
  const grouped = {};

  // Ajouter les données des capteurs intérieurs
  rawReadings.forEach((item) => {
    let ts;
    if (typeof item.timestamp === "object" && item.timestamp._seconds) {
      ts = item.timestamp._seconds * 1000;
    } else if (typeof item.timestamp === "number") {
      ts = item.timestamp;
    } else {
      return;
    }
    if (!grouped[ts]) grouped[ts] = { timestamp: ts };
    grouped[ts][item.room] = item.temperature;
  });

  // Ajouter les données météo extérieures si demandé
  if (includeWeather && Array.isArray(weatherData)) {
    weatherData.forEach((item) => {
      const ts = item.timestamp;
      if (!grouped[ts]) grouped[ts] = { timestamp: ts };
      grouped[ts]['Extérieur (Belgique)'] = item.temperature;
    });
  }

  const all = Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);

  // S'assurer que toutes les pièces sélectionnées ont une valeur (null si pas de données)
  const allRooms = includeWeather ? [...selectedRooms, 'Extérieur (Belgique)'] : selectedRooms;
  all.forEach(point => {
    allRooms.forEach(room => {
      if (point[room] === undefined) point[room] = null;
    });
  });

  return all;
}

// Formatteur pour les timestamps
const fmtHour = (v) => {
  // v peut être un timestamp en ms, en s, ou une ISO string
  const t = typeof v === 'number'
    ? (v < 1e12 ? v * 1000 : v) // si secondes, convertit en ms
    : Date.parse(v);
  return new Date(t).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
};

// 1) Utils temps

const toMs = (v) => (typeof v === 'number' ? (v < 1e12 ? v * 1000 : v) : Date.parse(v));

// Arrondit à l'heure inférieure
// Ex: 2023-10-01T12:34:56 -> 2023-10-01T12:00:00
const floorToHour = (ms) => {
  const d = new Date(ms);
  d.setMinutes(0, 0, 0);           // heure locale (Europe/Brussels si ton navigateur est réglé ainsi)
  return d.getTime();
};

// Arrondit à l'heure supérieure
// Ex: 2023-10-01T12:34:56 -> 2023-10-01T13:00:00
// Si déjà à l'heure pile, retourne le même timestamp
// Ex: 2023-10-01T12:00:00 -> 2023-10-01T12:00:00
// Note: ceilToHour est utile pour les ticks de graphique
const ceilToHour = (ms) => {
  const f = floorToHour(ms);
  return f === ms ? ms : f + 3600_000;
};

// Génère les ticks horaires pour l'axe X du graphique
// Ex: pour des données de 2023-10-01T12:00:00 à 2023-10-01T14:00:00,
// retourne [2023-10-01T12:00:00, 2023-10-01T13:00:00, 2023-10-01T14:00:00]
// Note: les timestamps sont en ms
// Si aucune donnée, retourne un tableau vide
const makeHourlyTicks = (data) => {
  if (!data?.length) return [];
  const first = toMs(data[0].timestamp);
  const last = toMs(data[data.length - 1].timestamp);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return [];
  const start = Math.min(first, last);
  const end = Math.max(first, last);

  const ticks = [];
  for (let t = ceilToHour(start); t <= end; t += 3600_000) {
    ticks.push(t);
  }
  return ticks;
};

// Composant principal
export default function ReadingsChart({ data, loading, error, selectedRooms, startDate, endDate }) {
  const containerPx = useBreakpointValue({ base: 2, md: 8 });
  const [showWeather, setShowWeather] = React.useState(true);

  // Calculer les dates pour la météo
  const weatherStartDate = React.useMemo(() => {
    if (startDate) {
      return new Date(startDate);
    }
    return null;
  }, [startDate]);

  const weatherEndDate = React.useMemo(() => {
    if (endDate) {
      return new Date(endDate);
    } else if (startDate) {
      // Si seulement startDate est fournie, utiliser le jour suivant
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay;
    }
    return null;
  }, [startDate, endDate]);

  // Hook pour les données météo avec les dates
  const { weatherData, loading: weatherLoading, error: weatherError, fetchWeatherData } = useWeatherData(weatherStartDate, weatherEndDate);

  // Charger les données météo au montage du composant et quand les dates changent
  React.useEffect(() => {
    if (showWeather) {
      fetchWeatherData(weatherStartDate, weatherEndDate);
    }
  }, [showWeather, weatherStartDate, weatherEndDate, fetchWeatherData]);

  // Actualiser les données météo toutes les 30 minutes (seulement si dates actuelles)
  React.useEffect(() => {
    const isCurrentDate = () => {
      if (!startDate) return true;
      const today = new Date();
      const selected = new Date(startDate);
      return selected.toDateString() === today.toDateString();
    };

    if (showWeather && isCurrentDate()) {
      const interval = setInterval(() => {
        fetchWeatherData(weatherStartDate, weatherEndDate);
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
  }, [showWeather, startDate, weatherStartDate, weatherEndDate, fetchWeatherData]);

  const chartData = pivotReadings(data, selectedRooms, showWeather, weatherData);
  const allRooms = showWeather ? [...selectedRooms, 'Extérieur (Belgique)'] : selectedRooms;

  const hourlyTicks = React.useMemo(() => makeHourlyTicks(chartData), [chartData]);

  return (
    <Box minH="100vh" bg="gray.50" py={8} px={containerPx}>
      <Container maxW="5xl" bg="white" p={{ base: 4, md: 8 }} borderRadius="md" boxShadow="md">
        <VStack align="stretch" spacing={6}>
          <Box>
            <Flex justify="space-between" align="center" mb={4}>
              <Box>
                <Heading size="lg" mb={2} color="blue.700">
                  Températures par pièce
                  {startDate && (
                    <Text as="span" fontSize="md" color="gray.500" ml={2}>
                      {new Date(startDate).toLocaleDateString()}
                    </Text>
                  )}
                </Heading>
                <Text color="gray.600">
                  Suivi graphique de la température dans chaque pièce.
                </Text>
              </Box>

              <FormControl display="flex" alignItems="center" width="auto">
                <FormLabel htmlFor="weather-toggle" mb="0" fontSize="sm">
                  Temp. extérieure
                </FormLabel>
                <Switch
                  id="weather-toggle"
                  isChecked={showWeather}
                  onChange={(e) => setShowWeather(e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>
            </Flex>
          </Box>

          {error && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          {weatherError && showWeather && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              Météo: {weatherError}
            </Alert>
          )}

          {/* Affichage du graphique même pendant le chargement */}
          <Box position="relative" minH={400}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  type="number"                // recommandé si timestamp numérique
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={fmtHour}
                  ticks={hourlyTicks}
                  interval="preserveStart"
                />
                <YAxis
                  label={{ value: "Temp (°C)", angle: -90, position: "insideLeft" }}
                  allowDecimals={false}
                  domain={[
                    (min) => Math.floor(min - 1),   // ou min - 0.5
                    (max) => Math.ceil(max + 1),    // ou max + 0.5
                  ]}
                  tickCount={10}
                />
                <Tooltip labelFormatter={fmtHour} />

                <Legend
                  layout="vertical"
                  verticalAlign="middle"   // milieu en hauteur
                  align="right"            // collée à droite
                  wrapperStyle={{ right: -15 }} // petit décalage optionnel
                />
                {allRooms.map((room) => (
                  <Line
                    key={room}
                    type="monotone"
                    dataKey={`${room}`}
                    name={`${room}`}
                    stroke={room === 'Extérieur (Belgique)' ? '#FF6B35' : colorForRoom(room)}
                    strokeWidth={room === 'Extérieur (Belgique)' ? 3 : 2}
                    dot={false}
                    connectNulls
                    strokeDasharray={room === 'Extérieur (Belgique)' ? '5 5' : '0'}
                  />
                ))}
                <Brush
                  dataKey="timestamp"
                  height={24}
                  tickFormatter={fmtHour}     // même format dans le mini-axe du Brush
                  travellerWidth={10}
                />
              </LineChart>
            </ResponsiveContainer>

            {/* Overlay chargement : s'affiche au-dessus du graphique */}
            {(loading || (weatherLoading && showWeather)) && (
              <Flex
                position="absolute"
                top={0}
                left={0}
                w="100%"
                h="100%"
                align="center"
                justify="center"
                bg="rgba(255,255,255,0.6)"
                zIndex={2}
                borderRadius="md"
              >
                <Spinner size="lg" color="blue.500" />
                <Text ml={3}>
                  {loading && weatherLoading ? 'Chargement des données...'
                    : loading ? 'Chargement capteurs...'
                      : 'Chargement météo...'}
                </Text>
              </Flex>
            )}

            {/* Cas aucune donnée sélectionnée */}
            {!loading && chartData.length === 0 && (
              <Flex
                position="absolute"
                top={0}
                left={0}
                w="100%"
                h="100%"
                align="center"
                justify="center"
                bg="rgba(255,255,255,0.8)"
                zIndex={2}
                borderRadius="md"
              >
                <Text color="gray.500">Aucune donnée à afficher.</Text>
              </Flex>
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
