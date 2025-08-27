import React, { useState } from 'react';
import {
  Box,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  HStack,
  Icon,
  useToast,
  Slide,
  ScaleFade
} from '@chakra-ui/react';
import { FiDownload, FiSmartphone } from 'react-icons/fi';
import { usePWA } from '../hooks/usePWA';

/**
 * Composant pour promouvoir l'installation de la PWA
 * Affichage non-bloquant et contextuel
 */
export default function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [isVisible, setIsVisible] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);
  const toast = useToast();

  // Ne pas afficher si déjà installée ou pas installable
  if (!isInstallable || isInstalled || !isVisible) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const success = await promptInstall();

      if (success) {
        toast({
          title: 'Installation réussie !',
          description: 'TechTemp est maintenant installée sur votre appareil.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Installation annulée',
          description: 'Vous pouvez installer l\'app plus tard depuis le menu du navigateur.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Install error:', error);
      toast({
        title: 'Erreur d\'installation',
        description: 'Impossible d\'installer l\'application. Réessayez plus tard.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsInstalling(false);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);

    // Réafficher après 24h
    setTimeout(() => {
      setIsVisible(true);
    }, 24 * 60 * 60 * 1000);
  };

  return (
    <Slide direction="top" in={isVisible} style={{ zIndex: 1000 }}>
      <Box p={4} bg="gray.50">
        <ScaleFade initialScale={0.9} in={isVisible}>
          <Alert
            status="info"
            variant="subtle"
            borderRadius="lg"
            boxShadow="lg"
            bg="white"
            border="1px"
            borderColor="blue.200"
          >
            <AlertIcon as={FiSmartphone} color="blue.500" />
            <Box flex="1">
              <AlertTitle color="blue.800" fontSize="sm" fontWeight="semibold">
                Installer TechTemp
              </AlertTitle>
              <AlertDescription color="gray.600" fontSize="sm" mt={1}>
                Accédez rapidement à vos données depuis votre écran d'accueil
              </AlertDescription>

              <HStack spacing={2} mt={3}>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="solid"
                  leftIcon={<Icon as={FiDownload} />}
                  onClick={handleInstall}
                  isLoading={isInstalling}
                  loadingText="Installation..."
                >
                  Installer
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  color="gray.600"
                >
                  Plus tard
                </Button>
              </HStack>
            </Box>

            <CloseButton
              alignSelf="flex-start"
              position="relative"
              right={-1}
              top={-1}
              onClick={handleDismiss}
              color="gray.400"
              _hover={{ color: 'gray.600' }}
            />
          </Alert>
        </ScaleFade>
      </Box>
    </Slide>
  );
}

/**
 * Version compacte pour la sidebar ou header
 */
export function InstallButton() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const toast = useToast();

  if (!isInstallable || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);

    try {
      const success = await promptInstall();

      if (success) {
        toast({
          title: 'App installée !',
          status: 'success',
          duration: 3000,
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur d\'installation',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      colorScheme="blue"
      leftIcon={<Icon as={FiDownload} />}
      onClick={handleInstall}
      isLoading={isInstalling}
    >
      Installer
    </Button>
  );
}
