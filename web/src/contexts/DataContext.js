import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DeviceRepository } from '../data/repositories/DeviceRepository';

// Création du contexte
const DataContext = createContext();

/**
 * Fournisseur de données qui gère l'accès aux données et les préférences
 */
export const DataProvider = ({ children }) => {
  // État pour les données des appareils
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // État pour la source de données préférée
  const [dataSource, setDataSource] = useState(() => {
    // Récupérer la préférence du localStorage ou utiliser la valeur par défaut
    return localStorage.getItem('preferredDataSource') || 'auto';
  });

  // Instancier le repository
  const deviceRepo = React.useRef(new DeviceRepository()).current;

  /**
   * Fonction pour récupérer les appareils
   */
  const fetchDevices = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const devicesData = await deviceRepo.getDevices({
        source: dataSource,
        ...options
      });
      setDevices(devicesData);
      return devicesData;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch devices:', err);
    } finally {
      setLoading(false);
    }
  }, [dataSource, deviceRepo]);

  /**
   * Fonction pour changer la source de données
   */
  const switchDataSource = useCallback((newSource) => {
    if (newSource === dataSource) return;

    console.log(`Switching data source from ${dataSource} to ${newSource}`);
    setDataSource(newSource);

    // Sauvegarder la préférence dans localStorage
    localStorage.setItem('preferredDataSource', newSource);

    // Vider le cache pour forcer le chargement des nouvelles données
    deviceRepo.clearCache();

    // Recharger les données avec la nouvelle source
    fetchDevices({ forceRefresh: true });
  }, [dataSource, deviceRepo, fetchDevices]);

  // Charger les appareils au montage
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Rafraîchir les données périodiquement
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDevices({ forceRefresh: true });
    }, 60000); // Toutes les minutes

    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Valeur du contexte
  const value = {
    // Données
    devices,

    // États
    loading,
    error,
    dataSource,

    // Actions
    fetchDevices,
    switchDataSource,
    refreshData: () => fetchDevices({ forceRefresh: true })
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte de données
 */
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

/**
 * Hook spécialisé pour les appareils
 */
export const useDevices = () => {
  const { devices, loading, error, fetchDevices, refreshData, dataSource, switchDataSource } = useData();
  return {
    devices,
    loading,
    error,
    fetchDevices,
    refreshData,
    dataSource,
    switchDataSource
  };
};

/**
 * Hook spécialisé pour un appareil spécifique
 */
export const useDevice = (deviceId) => {
  const { devices, loading, error } = useData();
  const device = devices.find(d => d.id === deviceId);
  return { device, loading, error };
};
