import React from "react";
import { colorForRoom } from '../../colors';
import WeatherChart from '../WeatherChart';
import ChartFiltersMenu from './ChartFiltersMenu';
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
    const now = Date.now();
    console.log('Traitement météo:', { weatherDataLength: weatherData.length, now: new Date(now) });

    // Séparer les données réelles et les prévisions
    const realData = weatherData.filter(item => item.timestamp <= now);
    const forecastData = weatherData.filter(item => item.timestamp > now);

    // Ajouter les données réelles
    realData.forEach((item, index) => {
      const ts = item.timestamp;
      if (!grouped[ts]) grouped[ts] = { timestamp: ts };
      grouped[ts]['Extérieur'] = item.temperature;
      if (index < 3) console.log('Données réelles:', { time: new Date(ts), temp: item.temperature });
    });

    // Ajouter les prévisions avec continuité
    forecastData.forEach((item, index) => {
      const ts = item.timestamp;
      if (!grouped[ts]) grouped[ts] = { timestamp: ts };
      grouped[ts]['Extérieur (Prévision)'] = item.temperature;
      if (index < 3) console.log('Prévisions:', { time: new Date(ts), temp: item.temperature });
    });

    // Assurer la continuité : ajouter le dernier point réel comme premier point de prévision
    if (realData.length > 0 && forecastData.length > 0) {
      const lastRealPoint = realData[realData.length - 1];
      const firstForecastPoint = forecastData[0];

      console.log('Point de transition:', {
        lastReal: { time: new Date(lastRealPoint.timestamp), temp: lastRealPoint.temperature },
        firstForecast: { time: new Date(firstForecastPoint.timestamp), temp: firstForecastPoint.temperature }
      });

      // Ajouter le dernier point réel au timestamp des prévisions pour la continuité
      const lastRealTs = lastRealPoint.timestamp;
      const firstForecastTs = firstForecastPoint.timestamp;

      // Étendre la courbe réelle jusqu'au premier point de prévision
      if (!grouped[firstForecastTs]) grouped[firstForecastTs] = { timestamp: firstForecastTs };
      grouped[firstForecastTs]['Extérieur'] = lastRealPoint.temperature;

      // Commencer les prévisions avec la même température pour assurer la continuité
      grouped[firstForecastTs]['Extérieur (Prévision)'] = lastRealPoint.temperature;

      console.log('Continuité assurée avec température:', lastRealPoint.temperature, 'aux deux courbes');
    }
  }

  const all = Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);

  // S'assurer que toutes les pièces sélectionnées ont une valeur (null si pas de données)
  const allRooms = includeWeather
    ? [...selectedRooms, 'Extérieur', 'Extérieur (Prévision)']
    : selectedRooms;
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
export default function ReadingsChart({
  data,
  loading,
  error,
  selectedRooms,
  startDate,
  endDate,
  // Props pour les filtres
  rooms = [],
  setSelectedRooms,
  selectedDate,
  setSelectedDate
}) {
  const containerPx = useBreakpointValue({ base: 2, md: 8 });
  const [showWeather, setShowWeather] = React.useState(true);

  // État pour les données météo (gérées par le composant isolé)
  const [weatherState, setWeatherState] = React.useState({
    weatherData: [],
    weatherLoading: false,
    weatherError: null
  });

  // Callback pour recevoir les données météo du composant isolé
  const handleWeatherDataChange = React.useCallback((newWeatherState) => {
    setWeatherState(newWeatherState);
  }, []);

  // Responsive legend configuration
  const legendConfig = useBreakpointValue({
    base: {
      layout: "horizontal",
      verticalAlign: "bottom",
      align: "center",
      wrapperStyle: {
        paddingTop: '15px',
        paddingLeft: '10px',
        paddingRight: '10px',
        fontSize: '11px',
        textAlign: 'center'
      }
    },
    md: {
      layout: "vertical",
      verticalAlign: "middle",
      align: "right",
      wrapperStyle: {
        right: '50px',
        paddingLeft: '25px',
        fontSize: '14px'
      }
    }
  });

  // Responsive chart dimensions - hauteur augmentée
  const chartHeight = useBreakpointValue({ base: 400, md: 380 });
  const chartMargins = useBreakpointValue({
    base: { top: 5, right: 30, left: 20, bottom: 60 },
    md: { top: 5, right: 140, left: 20, bottom: 20 }
  });

  const chartData = pivotReadings(data, selectedRooms, showWeather, weatherState.weatherData);
  const allRooms = showWeather ? [...selectedRooms, 'Extérieur', 'Extérieur (Prévision)'] : selectedRooms;

  // Debug: afficher les données du graphique
  React.useEffect(() => {
    if (showWeather && chartData.length > 0) {
      console.log('ChartData sample:', chartData.slice(0, 3));
      console.log('AllRooms:', allRooms);
      console.log('WeatherData length:', weatherState.weatherData.length);
    }
  }, [chartData, allRooms, weatherState.weatherData.length, showWeather]);

  const hourlyTicks = React.useMemo(() => makeHourlyTicks(chartData), [chartData]);

  return (
    <Box bg="white">
      {/* Composant isolé pour la météo */}
      <WeatherChart
        startDate={startDate}
        endDate={endDate}
        showWeather={showWeather}
        onWeatherDataChange={handleWeatherDataChange}
      />

      <VStack align="stretch" spacing={6}>
        <Box>
          <Flex justify="space-between" align="center" mb={4}>
            <Box>
              <Heading size="md" mb={2} color="blue.700">
                Températures par pièce
                {startDate && (
                  <Text as="span" fontSize="sm" color="gray.500" ml={2}>
                    {new Date(startDate).toLocaleDateString()}
                  </Text>
                )}
              </Heading>
              <Text color="gray.600">
                Suivi graphique de la température dans chaque pièce.
              </Text>
            </Box>

            <ChartFiltersMenu
              rooms={rooms}
              selectedRooms={selectedRooms}
              setSelectedRooms={setSelectedRooms}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              showWeather={showWeather}
              setShowWeather={setShowWeather}
            />
          </Flex>
        </Box>

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {weatherState.weatherError && showWeather && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            Météo: {weatherState.weatherError}
          </Alert>
        )}

        {/* Affichage du graphique même pendant le chargement */}
        <Box position="relative" minH={chartHeight}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData} margin={chartMargins}>
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
                layout={legendConfig.layout}
                verticalAlign={legendConfig.verticalAlign}
                align={legendConfig.align}
                wrapperStyle={legendConfig.wrapperStyle}
                iconSize={14}
              />
              {allRooms.map((room) => {
                // Déterminer le style selon le type de données météo
                const isWeatherReal = room === 'Extérieur';
                const isWeatherForecast = room === 'Extérieur (Prévision)';
                const isWeather = isWeatherReal || isWeatherForecast;

                return (
                  <Line
                    key={room}
                    type="monotone"
                    dataKey={`${room}`}
                    name={isWeatherForecast ? '' : room}  // Nom vide pour cacher de la légende
                    stroke={
                      isWeatherReal ? '#2563EB' :      // Bleu pour température extérieure réelle
                        isWeatherForecast ? '#2563EB' :  // Gris pour prévisions
                          colorForRoom(room)               // Couleurs normales pour les pièces
                    }
                    strokeWidth={
                      isWeatherReal ? 4 :              // Plus épais pour température extérieure
                        isWeatherForecast ? 2 :          // Normal pour prévisions
                          2                                // Normal pour les pièces
                    }
                    dot={false}
                    connectNulls
                    strokeDasharray={
                      isWeatherReal ? '0' :           // Ligne continue pour données réelles
                        isWeatherForecast ? '5 5' :     // Pointillés pour prévisions
                          '0'                             // Ligne continue pour capteurs
                    }
                    opacity={isWeatherForecast ? 0.8 : 1} // Prévisions un peu transparentes
                    legendType={isWeatherForecast ? 'none' : 'line'} // Pas de légende pour prévisions
                  />
                );
              })}
              <Brush
                dataKey="timestamp"
                height={24}
                tickFormatter={fmtHour}     // même format dans le mini-axe du Brush
                travellerWidth={10}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Overlay chargement : s'affiche au-dessus du graphique */}
          {(loading || (weatherState.weatherLoading && showWeather)) && (
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
                {loading && weatherState.weatherLoading ? 'Chargement des données...'
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
    </Box>
  );
}
