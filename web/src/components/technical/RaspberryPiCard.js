import React, { useState, useEffect } from 'react';
import {
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Icon,
  Badge,
  Box
} from '@chakra-ui/react';
import { getStatusIcon } from '../../utils/systemMonitoringHelpers';
import StandardCard from '../common/StandardCard';

const RaspberryPiCard = ({
  systemHealth,
  realTimeAvailable = false
}) => {
  // États pour les tests séparés
  const [networkConnectivity, setNetworkConnectivity] = useState(null);
  const [apiTest, setApiTest] = useState(null);
  const [lastTestTime, setLastTestTime] = useState(null);

  // Test 1: Connectivité réseau pure (ping-like)
  const testNetworkConnectivity = async () => {
    try {
      const startTime = Date.now();

      // Test de connectivité réseau basique
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:192.168.0.42:3478' }]
      });

      try {
        // Tentative de connexion ICE vers l'IP cible
        await pc.createOffer();
        await pc.setLocalDescription(await pc.createOffer());

        const latency = Date.now() - startTime;
        pc.close();

        setNetworkConnectivity({
          status: 'accessible',
          latency: latency,
          method: 'ICE connectivity test',
          timestamp: new Date()
        });

      } catch (webrtcError) {
        pc.close();

        // Fallback: test TCP simple
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          await fetch(`http://192.168.0.42:22`, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;

          setNetworkConnectivity({
            status: 'accessible',
            latency: latency,
            method: 'TCP probe',
            timestamp: new Date()
          });

        } catch (tcpError) {
          throw new Error('No network connectivity');
        }
      }

    } catch (error) {
      let errorDetail = 'Réseau inaccessible';

      if (error.name === 'AbortError') {
        errorDetail = 'Timeout - Machine ne répond pas';
      } else if (error.message.includes('Failed to fetch')) {
        errorDetail = 'IP injoignable sur le réseau';
      } else {
        errorDetail = error.message;
      }

      setNetworkConnectivity({
        status: 'unreachable',
        error: errorDetail,
        method: 'Network ping test',
        timestamp: new Date()
      });
    }
  };

  // Test 2: API REST spécifique
  const testApiEndpoint = async () => {
    try {
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('http://192.168.0.42:8080/api/system/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setApiTest({
        status: 'active',
        latency: latency,
        httpStatus: response.status,
        dataReceived: !!data,
        globalStatus: data.global_status || null,
        timestamp: new Date(),
        details: `JSON valide - ${Object.keys(data).length} propriétés`
      });

    } catch (error) {
      let status = 'inactive';
      let errorDetail = 'Erreur inconnue';

      if (error.name === 'AbortError') {
        errorDetail = 'Timeout 5s - API ne répond pas';
        status = 'timeout';
      } else if (error.message.includes('Failed to fetch')) {
        errorDetail = 'Port 8080 fermé/filtré';
        status = 'port_closed';
      } else if (error.message.includes('HTTP')) {
        errorDetail = `Serveur répond mais: ${error.message}`;
        status = 'http_error';
      } else if (error.message.includes('JSON')) {
        errorDetail = 'Réponse non-JSON ou corrompue';
        status = 'invalid_json';
      } else {
        errorDetail = error.message;
      }

      setApiTest({
        status: status,
        error: errorDetail,
        timestamp: new Date()
      });
    }
  };

  // Lancer les tests au montage
  useEffect(() => {
    const runTests = async () => {
      await testNetworkConnectivity();
      setTimeout(testApiEndpoint, 1000);
    };

    runTests();
    setLastTestTime(new Date());

    const interval = setInterval(() => {
      runTests();
      setLastTestTime(new Date());
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  return (
    <StandardCard
      title="🍓 Serveur Raspberry Pi"
      subtitle="192.168.0.42 - Tests en cascade (Réseau → API → Service)"
    >
      <Grid templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }} gap={4}>

        {/* Test 1: Connectivité réseau */}
        <GridItem>
          <Stat>
            <StatLabel>🌐 Connectivité Réseau</StatLabel>
            <HStack>
              <Icon
                as={getStatusIcon(networkConnectivity?.status === 'accessible' ? 'healthy' : 'critical')}
                color={networkConnectivity?.status === 'accessible' ? 'green.500' : 'red.500'}
              />
              <StatNumber color={networkConnectivity?.status === 'accessible' ? 'green.600' : 'red.600'}>
                {networkConnectivity?.status === 'accessible' ? 'ACCESSIBLE' :
                  networkConnectivity ? 'INJOIGNABLE' : 'TEST...'}
              </StatNumber>
            </HStack>
            <StatHelpText>
              Test: {networkConnectivity?.method || 'Ping réseau'}
              <br />
              {networkConnectivity ?
                (networkConnectivity.latency ?
                  `Temps de réponse: ${networkConnectivity.latency}ms` :
                  networkConnectivity.error || 'Erreur réseau'
                ) :
                'Test connectivité en cours...'
              }
            </StatHelpText>
          </Stat>
        </GridItem>

        {/* Test 2: API TechTemp */}
        <GridItem>
          <Stat>
            <StatLabel>🔌 API TechTemp (:8080)</StatLabel>
            <HStack>
              <Icon
                as={getStatusIcon(apiTest?.status === 'active' ? 'healthy' : 'critical')}
                color={apiTest?.status === 'active' ? 'green.500' : 'red.500'}
              />
              <StatNumber color={apiTest?.status === 'active' ? 'green.600' : 'red.600'}>
                {apiTest?.status === 'active' ? 'ACTIVE' :
                  apiTest?.status === 'timeout' ? 'TIMEOUT' :
                    apiTest?.status === 'port_closed' ? 'PORT FERMÉ' :
                      apiTest?.status === 'http_error' ? 'ERREUR HTTP' :
                        apiTest?.status === 'invalid_json' ? 'JSON INVALIDE' :
                          apiTest ? 'INACTIVE' : 'TEST...'}
              </StatNumber>
            </HStack>
            <StatHelpText>
              Test: GET /api/system/health
              <br />
              {apiTest ?
                (apiTest.latency ?
                  `HTTP ${apiTest.httpStatus} - ${apiTest.latency}ms` :
                  apiTest.error || 'Erreur API'
                ) :
                'Test en cours...'
              }
            </StatHelpText>
          </Stat>
        </GridItem>

        {/* Test 3: Service TechTemp */}
        <GridItem>
          <Stat>
            <StatLabel>🍓 Service TechTemp</StatLabel>
            <HStack>
              <Icon
                as={getStatusIcon(
                  apiTest?.status !== 'active' ? 'critical' :
                    apiTest?.globalStatus === 'healthy' ? 'healthy' :
                      apiTest?.globalStatus ? 'warning' : 'critical'
                )}
                color={
                  apiTest?.status !== 'active' ? 'red.500' :
                    apiTest?.globalStatus === 'healthy' ? 'green.500' :
                      apiTest?.globalStatus ? 'orange.500' : 'red.500'
                }
              />
              <StatNumber color={
                apiTest?.status !== 'active' ? 'red.600' :
                  apiTest?.globalStatus === 'healthy' ? 'green.600' :
                    apiTest?.globalStatus ? 'orange.600' : 'red.600'
              }>
                {apiTest?.status !== 'active' ? 'NON TESTABLE' :
                  apiTest?.globalStatus === 'healthy' ? 'SAIN' :
                    apiTest?.globalStatus ? apiTest.globalStatus.toUpperCase() : 'ARRÊTÉ'}
              </StatNumber>
            </HStack>
            <StatHelpText>
              Test: global_status (DÉPEND de l'API)
              <br />
              {apiTest?.status !== 'active' ?
                'API indisponible - Impossible à tester' :
                apiTest?.globalStatus ?
                  `État: ${apiTest.globalStatus} (monitoring actif)` :
                  'Service TechTemp non démarré'
              }
            </StatHelpText>
          </Stat>
        </GridItem>
      </Grid>

      {/* Résumé compact du Pi */}
      <Box mt={4} pt={4} borderTop="1px" borderColor="gray.200">
        <HStack spacing={2} flexWrap="wrap">
          <Badge colorScheme={networkConnectivity?.status === 'accessible' ? 'green' : 'red'} variant="solid">
            🌐 Réseau: {networkConnectivity?.status === 'accessible' ? 'OK' :
              networkConnectivity ? 'KO' : '...'}
          </Badge>
          <Badge colorScheme={apiTest?.status === 'active' ? 'green' : 'red'} variant="solid">
            🔌 API: {apiTest?.status === 'active' ? 'OK' :
              apiTest?.status === 'timeout' ? 'TIMEOUT' :
                apiTest?.status === 'port_closed' ? 'PORT KO' :
                  apiTest ? 'KO' : '...'}
          </Badge>
          <Badge colorScheme={
            apiTest?.status !== 'active' ? 'gray' :
              apiTest?.globalStatus === 'healthy' ? 'green' :
                apiTest?.globalStatus ? 'orange' : 'red'
          } variant="solid">
            🍓 Service: {
              apiTest?.status !== 'active' ? 'N/A' :
                apiTest?.globalStatus === 'healthy' ? 'OK' :
                  apiTest?.globalStatus || 'KO'
            }
          </Badge>
          {lastTestTime && (
            <Badge colorScheme="gray" variant="outline">
              🕐 Test: {lastTestTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          )}
        </HStack>
      </Box>
    </StandardCard>
  );
};

export default RaspberryPiCard;
