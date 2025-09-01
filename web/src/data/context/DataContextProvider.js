/**
 * @file DataContextProvider.js
 * @description Fournisseur de contexte React pour le DataContext
 */

import React, { createContext, useMemo } from 'react';
import { DeviceRepository } from '../repositories/DeviceRepository';
import { DeviceDataRepository } from '../repositories/DeviceDataRepository';
import { FirebaseAdapter } from '../adapters/FirebaseAdapter';
import { LocalServerAdapter } from '../adapters/LocalServerAdapter';
import { CacheManager } from '../cache/CacheManager';
import { DataContext } from './DataContext';

// Création du contexte React
const DataContextContext = createContext(null);

/**
 * Composant fournisseur pour le DataContext
 * @param {Object} props - Propriétés du composant
 * @param {React.ReactNode} props.children - Enfants du composant
 * @param {Object} [props.options] - Options de configuration
 * @returns {React.ReactElement} Composant React
 */
export function DataContextProvider({ children, options = {} }) {
  // Création des instances nécessaires
  const dataContext = useMemo(() => {
    // Création du gestionnaire de cache
    const cache = new CacheManager({
      ttl: options.cacheTTL || 5 * 60 * 1000, // 5 minutes par défaut
      storage: options.useLocalStorage ? 'localStorage' : 'memory'
    });

    // Création des adaptateurs
    const adapters = options.adapters || [
      new FirebaseAdapter(),
      new LocalServerAdapter()
    ];

    // Création des repositories
    const deviceRepository = new DeviceRepository({
      adapters,
      cache
    });

    const deviceDataRepository = new DeviceDataRepository({
      adapters,
      cache
    });

    // Création du contexte de données
    return new DataContext({
      deviceRepository,
      deviceDataRepository,
      cache
    });
  }, [options]);

  // Valeur du contexte
  const contextValue = useMemo(() => ({
    dataContext
  }), [dataContext]);

  return (
    <DataContextContext.Provider value={contextValue}>
      {children}
    </DataContextContext.Provider>
  );
}

// Attacher le contexte au composant pour faciliter l'accès
DataContextProvider.context = DataContextContext;
