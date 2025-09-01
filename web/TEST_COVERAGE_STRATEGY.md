# Stratégie d'amélioration de la couverture des tests

## Résumé de la couverture actuelle (1 septembre 2025)

- **Couverture globale** : ~13%
- **Points forts** : Repositories et Adapters (80-100%)
- **Points faibles** : UI, Services, Hooks (0-5%)

## Objectifs de couverture

| Milestone | Date cible | Couverture cible | Focus |
|-----------|------------|------------------|-------|
| 1         | 15/09/2025 | 30%              | Services et Hooks essentiels |
| 2         | 01/10/2025 | 50%              | Composants principaux |
| 3         | 15/10/2025 | 70%              | Couverture complète des fonctionnalités critiques |

## Plan d'action par priorité

### Priorité 1 : Services et Data layer (déjà en cours)

- [x] `CacheManager.js` - Améliorer la couverture (actuellement 56.89%)
- [ ] `api.service.js` - Ajouter des tests (actuellement 2.22%)
- [ ] `firebase.service.js` - Ajouter des tests (actuellement 5.17%)
- [ ] `DataContext.js` - Améliorer la couverture (actuellement 68.08%)

### Priorité 2 : Hooks critiques

- [ ] `useDeviceData.js` - Ajouter des tests (actuellement 0%)
- [ ] `useDevices.js` - Ajouter des tests (actuellement 0%)
- [ ] `useSystemHealth.js` - Ajouter des tests (actuellement 0%)
- [ ] `useNotifications.js` - Ajouter des tests (actuellement 0%)

### Priorité 3 : Composants UI principaux

- [ ] `DeviceCard.js` - Ajouter des tests (actuellement 0%)
- [ ] `DevicesGrid.js` - Ajouter des tests (actuellement 0%)
- [ ] `EnvironmentalDevicesGrid.js` - Ajouter des tests (actuellement 0%)
- [ ] `SystemMonitoring.js` - Ajouter des tests (actuellement 0%)

### Priorité 4 : Utilitaires et helpers

- [x] `deviceDataTransformer.js` - Maintenir la couverture (actuellement 100%)
- [ ] `systemMonitoringHelpers.js` - Ajouter des tests (actuellement 0%)
- [ ] `weatherService.js` - Ajouter des tests (actuellement 0%)

## Stratégies pour les tests difficiles

1. **Mocking des services externes**
   - Créer des mocks cohérents pour Firebase
   - Utiliser MSW (Mock Service Worker) pour les appels API

2. **Tests de composants React**
   - Utiliser React Testing Library pour les tests de composants
   - Se concentrer sur les comportements plutôt que l'implémentation

3. **Tests d'intégration**
   - Écrire des tests d'intégration pour les flux critiques
   - Tester les interactions entre composants et services

## Bonnes pratiques à suivre

1. **Écrire les tests en même temps que le code**
   - Pour les nouvelles fonctionnalités, suivre une approche TDD quand c'est possible

2. **Exécuter le rapport de couverture régulièrement**
   - Configurer une action CI pour générer le rapport à chaque pull request

3. **Revue de code axée sur la testabilité**
   - Vérifier que le nouveau code est testable et accompagné de tests

4. **Documentation des tests**
   - Documenter les scénarios complexes
   - Expliquer les mocks et fixtures utilisés

## Exemples de tests à implémenter

### Test pour api.service.js

```javascript
import { apiGet, apiPost, isUrlAccessible } from '../services/api.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('apiGet devrait faire un appel GET et retourner les données', async () => {
    // Arrange
    const mockData = { data: 'test data' };
    axios.get.mockResolvedValue({ data: mockData });
    
    // Act
    const result = await apiGet('/test-endpoint');
    
    // Assert
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/test-endpoint'), expect.any(Object));
    expect(result).toEqual(mockData);
  });

  // Plus de tests...
});
```

### Test pour un hook React

```javascript
import { renderHook, act } from '@testing-library/react-hooks';
import useDevices from '../hooks/useDevices';
import { DeviceRepository } from '../data/repositories/DeviceRepository';

// Mock DeviceRepository
jest.mock('../data/repositories/DeviceRepository');

describe('useDevices Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devrait charger les appareils au montage', async () => {
    // Arrange
    const mockDevices = [{ id: 'device1', name: 'Test Device' }];
    DeviceRepository.prototype.getDevices.mockResolvedValue(mockDevices);
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => useDevices());
    await waitForNextUpdate();
    
    // Assert
    expect(result.current.devices).toEqual(mockDevices);
    expect(result.current.loading).toBe(false);
  });

  // Plus de tests...
});
```

## Suivi et reporting

- Générer un rapport de couverture hebdomadaire
- Identifier les fichiers avec le plus grand delta de couverture
- Prioriser les tests en fonction de l'importance métier
