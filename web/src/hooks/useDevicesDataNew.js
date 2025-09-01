import { useDevices } from '../contexts/DataContext';

/**
 * Hook wrapper pour compatibilité avec le code existant
 * Émule le comportement des anciens hooks pour faciliter la migration
 */
export const useDevicesDataNew = () => {
  const { devices, loading, error, refreshData } = useDevices();

  // Conserver l'interface de l'ancien hook pour compatibilité
  return {
    devices,
    isLoading: loading,
    error,
    refetch: refreshData
  };
};

/**
 * Hook de compatibilité pour un appareil spécifique
 */
export const useDeviceDataNew = (deviceId) => {
  const { devices, loading, error } = useDevices();
  const device = devices.find(d => d.id === deviceId);

  return {
    device,
    isLoading: loading,
    error
  };
};
