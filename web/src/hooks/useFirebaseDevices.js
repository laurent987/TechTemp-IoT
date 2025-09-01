import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../config/api.endpoints';
import { useDevicesData } from './useDevicesData';

/**
 * Hook pour récupérer les devices directement depuis Firebase
 * Utilisé pour la vue d'ensemble qui doit être indépendante de systemHealth
 */
export const useFirebaseDevices = () => {
  const [rawDevices, setRawDevices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFirebaseDevices = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(API_ENDPOINTS.FIREBASE_HEALTH, {
          timeout: 5000
        });

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setRawDevices(data.devices || []);
      } catch (err) {
        console.warn('Erreur chargement Firebase devices:', err.message);
        setError(err.message);
        setRawDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFirebaseDevices();
  }, []);

  // Traitement des données via le hook existant (mode Firebase)
  const processedData = useDevicesData(rawDevices, false);

  return {
    ...processedData,
    loading,
    error
  };
};
