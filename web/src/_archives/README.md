# Composants Archivés

Ce dossier contient des composants qui ont été archivés car ils ne sont plus utilisés dans l'application.

## Composants archivés

- `SystemMonitoring.js` (racine) - Version ancienne du système de monitoring
- `SystemMonitoring.js` (components/technical) - Ancienne implémentation du monitoring avec les composants du dossier monitoring/
- `MonitoringPage.js` - Page qui utilisait le composant SystemMonitoring, remplacée par TechnicalMonitoringPage
- Tous les composants du dossier `monitoring/` - Utilisés uniquement par SystemMonitoring
- Hooks spécifiques :
  - `useDevicesDataNew.js` - Hook wrapper pour compatibilité avec le code existant
  - `useDeviceAlertsNew.js` - Hook pour les alertes, utilisé par SystemMonitoring

## Historique

Ces composants ont été archivés le 1er septembre 2025 après avoir constaté qu'ils n'étaient plus référencés dans l'application.
La page principale de monitoring est maintenant `TechnicalMonitoringPage` qui utilise le composant `TechnicalMonitoring`.

## Raison de l'archivage

L'application a été restructurée pour utiliser uniquement le composant `TechnicalMonitoring` via la route `/technical` 
dans `App.js`. Les anciens composants n'étant plus utilisés, ils ont été archivés pour nettoyer le code tout en 
préservant le travail effectué au cas où certains éléments seraient réutilisés à l'avenir.

## Structure originale vs nouvelle

### Ancienne structure :
- `MonitoringPage` -> `SystemMonitoring` -> Composants dans `monitoring/` (DeviceCard, DevicesGrid, etc.)

### Nouvelle structure : 
- `TechnicalMonitoringPage` -> `TechnicalMonitoring` (avec ses propres composants internes)
