import React, { useState } from 'react';
import {
  Box,
  Button,
  Alert,
  AlertIcon,
  Text,
  VStack,
  HStack,
  Switch,
  FormControl,
  FormLabel,
  Badge,
  useToast,
  Divider,
  Icon,
  Tooltip
} from '@chakra-ui/react';
import {
  FiBell,
  FiBellOff,
  FiAlertCircle,
  FiCheckCircle,
  FiX,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';
import { useNotifications } from '../hooks/useNotifications';
import { usePWA } from '../hooks/usePWA';

/**
 * Composant pour gérer le statut et les paramètres des notifications
 */
export default function NotificationStatus() {
  const {
    permission,
    isSubscribed,
    isSupported,
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification
  } = useNotifications();

  const { isOnline } = usePWA();
  const toast = useToast();
  const [isTesting, setIsTesting] = useState(false);

  const handleToggleNotifications = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast({
          title: 'Notifications désactivées',
          description: 'Vous ne recevrez plus d\'alertes.',
          status: 'info',
          duration: 3000,
        });
      } else {
        if (permission !== 'granted') {
          const granted = await requestPermission();
          if (!granted) {
            toast({
              title: 'Permission refusée',
              description: 'Activez les notifications dans les paramètres du navigateur.',
              status: 'warning',
              duration: 5000,
            });
            return;
          }
        }

        await subscribe();
        toast({
          title: 'Notifications activées',
          description: 'Vous recevrez des alertes en cas de problème.',
          status: 'success',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Notification toggle error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier les paramètres de notification.',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);

    try {
      await sendTestNotification();
      toast({
        title: 'Notification test envoyée',
        description: 'Vérifiez que vous l\'avez reçue.',
        status: 'info',
        duration: 3000,
      });
    } catch (error) {
      console.error('Test notification error:', error);
      toast({
        title: 'Erreur test',
        description: 'Impossible d\'envoyer la notification test.',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Status badge
  const getStatusBadge = () => {
    if (!isSupported) {
      return <Badge colorScheme="gray">Non supporté</Badge>;
    }

    if (permission === 'denied') {
      return <Badge colorScheme="red">Bloquées</Badge>;
    }

    if (isSubscribed) {
      return <Badge colorScheme="green">Activées</Badge>;
    }

    return <Badge colorScheme="yellow">Inactives</Badge>;
  };

  return (
    <Box p={4} bg="white" borderRadius="md" boxShadow="sm" border="1px" borderColor="gray.200">
      <VStack align="stretch" spacing={4}>
        {/* Header avec statut */}
        <HStack justify="space-between" align="center">
          <HStack>
            <Icon as={FiBell} color="blue.500" />
            <Text fontWeight="semibold">Notifications</Text>
            {getStatusBadge()}
          </HStack>

          <HStack>
            <Tooltip label={isOnline ? 'En ligne' : 'Hors ligne'}>
              <Icon
                as={isOnline ? FiWifi : FiWifiOff}
                color={isOnline ? 'green.500' : 'red.500'}
              />
            </Tooltip>
          </HStack>
        </HStack>

        {/* Messages d'état */}
        {!isSupported && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Votre navigateur ne supporte pas les notifications push.
            </Text>
          </Alert>
        )}

        {permission === 'denied' && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" fontWeight="medium">
                Notifications bloquées
              </Text>
              <Text fontSize="xs" color="red.600">
                Activez-les dans les paramètres du navigateur pour recevoir des alertes.
              </Text>
            </VStack>
          </Alert>
        )}

        {/* Contrôle principal */}
        {isSupported && permission !== 'denied' && (
          <FormControl display="flex" alignItems="center" justifyContent="space-between">
            <FormLabel htmlFor="notifications-toggle" mb="0" fontSize="sm">
              Recevoir des alertes de température
            </FormLabel>
            <Switch
              id="notifications-toggle"
              isChecked={isSubscribed}
              onChange={handleToggleNotifications}
              isDisabled={loading || !isOnline}
              colorScheme="blue"
            />
          </FormControl>
        )}

        {/* Actions supplémentaires */}
        {isSubscribed && (
          <>
            <Divider />
            <VStack spacing={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestNotification}
                isLoading={isTesting}
                loadingText="Envoi..."
                isDisabled={!isOnline}
                width="full"
              >
                Tester les notifications
              </Button>

              <Text fontSize="xs" color="gray.500" textAlign="center">
                Les alertes seront envoyées en cas de température anormale
              </Text>
            </VStack>
          </>
        )}

        {/* Statut hors ligne */}
        {!isOnline && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text fontSize="sm">
              Mode hors ligne - Les notifications seront synchronisées à la reconnexion.
            </Text>
          </Alert>
        )}
      </VStack>
    </Box>
  );
}

/**
 * Version compacte pour affichage dans la sidebar
 */
export function NotificationIndicator() {
  const { isSubscribed, permission } = useNotifications();
  const { isOnline } = usePWA();

  const getIcon = () => {
    if (permission === 'denied') return FiX;
    if (isSubscribed) return FiCheckCircle;
    return FiAlertCircle;
  };

  const getColor = () => {
    if (permission === 'denied') return 'red.500';
    if (isSubscribed) return 'green.500';
    return 'yellow.500';
  };

  return (
    <HStack spacing={2}>
      <Icon as={getIcon()} color={getColor()} />
      <Icon
        as={isOnline ? FiWifi : FiWifiOff}
        color={isOnline ? 'green.400' : 'red.400'}
        boxSize={3}
      />
    </HStack>
  );
}
