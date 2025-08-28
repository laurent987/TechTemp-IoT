# 🧪 Guide de Test des Alertes - TechTemp IoT

## 🎯 Objectif
Vérifier que le système d'alertes fonctionne correctement et que le bug des "487407h" est résolu.

## 🚀 Méthodes de Test

### 1. **Interface Graphique (Mode Développement)**

Si vous êtes en mode développement, un panneau de test jaune apparaît automatiquement :

1. **Activez le mode test** avec le switch "Mode Test des Alertes"
2. **Observez les résultats** :
   - Nombre total d'alertes générées
   - Répartition par niveau (erreur/warning/info)
   - Types d'alertes détectées
3. **Vérifiez** que les alertes temporelles affichent des valeurs réalistes

### 2. **Tests en Console du Navigateur**

#### A. Test complet de tous les scénarios
```javascript
// Ouvrez la console (F12) et tapez :
testAllAlertScenarios()
```

**Résultat attendu :**
- 12 devices de test avec différents problèmes
- Environ 15-20 alertes générées
- Aucune alerte avec "487407h" ou valeurs aberrantes

#### B. Test spécifique du fix des timestamps
```javascript
testTimestampBugFix()
```

**Résultat attendu :**
- Test de différents formats de timestamp
- Validation que les calculs sont corrects
- Aucune erreur de parsing

#### C. Test des fonctions de debug
```javascript
// Tester le parsing d'un timestamp
testTimestampParsing()

// Analyser vos devices actuels
debugDeviceTimestamps(devices)
```

### 3. **Scénarios de Test Automatiques**

Le système teste automatiquement ces scénarios :

| Scénario | Device | Résultat Attendu |
|----------|---------|------------------|
| **Normal** | Salon Normal | ✅ Aucune alerte |
| **Données anciennes** | Cuisine (3h) | 🔵 Info "3h" |
| **Données obsolètes** | Chambre (8h) | 🟡 Warning "8h" |
| **Device offline** | Bureau (2j) | 🔴 Erreur "48h (2j)" |
| **Temp. critique** | Grenier (38.5°C) | 🔴 Erreur température |
| **Temp. froide** | Cave (2.1°C) | 🔴 Erreur température |
| **Humidité élevée** | Salle de bain (92%) | 🔴 Erreur humidité |
| **Humidité faible** | Salon sec (12%) | 🔴 Erreur humidité |
| **Temp. warning** | Véranda (30.2°C) | 🟡 Warning température |
| **Humid. warning** | Buanderie (75%) | 🟡 Warning humidité |
| **Sans données** | Capteur vide | 🟡 Warning données manquantes |
| **Timestamp cassé** | Device invalide | 🟡 Warning ou pas d'alerte temporelle |

## ✅ Critères de Validation

### 1. **Alertes Temporelles Correctes**
- ❌ **Avant** : "Aucune donnée reçue depuis 487407h"
- ✅ **Après** : "Aucune donnée reçue depuis 8h" ou "48h (2j)"

### 2. **Seuils Réalistes**
- **> 24h** : 🔴 Erreur avec mention des jours
- **> 6h** : 🟡 Warning en heures
- **> 2h** : 🔵 Info en heures

### 3. **Formats de Timestamp Supportés**
- ✅ Unix timestamp (secondes) : `1693315200`
- ✅ ISO String : `"2025-08-29T10:00:00Z"`
- ✅ Gestion des valeurs nulles/invalides

### 4. **Température/Humidité**
- **Température** : Critique >35°C ou <5°C, Warning >28°C ou <15°C
- **Humidité** : Critique >85% ou <15%, Warning >70% ou <30%

## 🐛 Tests de Régression

### A. Vérifier l'ancien bug
```javascript
// Ce test devrait maintenant fonctionner correctement
const testDevice = {
  sensor_id: 999,
  room_name: "Test",
  last_seen: 1693315200, // Unix timestamp
  temperature: 22,
  humidity: 50
};

// Plus de 487407h !
```

### B. Console en mode développement
```javascript
// Vos logs devraient ressembler à :
🔍 Debug automatique des timestamps:
📱 Device 1 (Salon)
  📊 Données brutes: { last_seen: 1693315200, type: "number" }
  🔄 Données parsées: { hours_ago: 2.5, is_valid: true }
  ✅ Validation: { is_recent: true, is_valid_timestamp: true }
```

## 🔧 Dépannage

### Si aucune alerte n'apparaît :
1. ✅ **Normal** - Vos devices fonctionnent bien !
2. **Activez le mode test** pour simuler des problèmes
3. **Vérifiez la console** pour les erreurs

### Si des alertes bizarres apparaissent :
1. **Ouvrez la console** et cherchez les logs de debug
2. **Utilisez** `debugDeviceTimestamps(devices)` pour analyser
3. **Vérifiez** que `parseTimestamp()` fonctionne correctement

### Si le panneau de test n'apparaît pas :
- Vérifiez que vous êtes en mode développement (`NODE_ENV=development`)
- Le panneau n'apparaît que si des données système sont chargées

## 📊 Validation des Résultats

### Tests réussis si :
- ✅ Toutes les alertes temporelles affichent des valeurs < 100h
- ✅ Les messages sont en français et compréhensibles
- ✅ Les niveaux d'alertes correspondent aux seuils définis
- ✅ Les timestamps invalides ne provoquent pas d'erreur
- ✅ Le mode test génère environ 15-20 alertes

### Tests échoués si :
- ❌ Alertes avec "487407h" ou valeurs aberrantes
- ❌ Erreurs JavaScript dans la console
- ❌ Alertes incohérentes avec les données
- ❌ Calculs de temps incorrects

## 🎉 Résultat Attendu Final

Après cette refactorisation, vous devriez voir des alertes normales comme :
- "Aucune donnée reçue depuis 2h"
- "Température élevée: 30.2°C" 
- "Dernière lecture il y a 45min"

Au lieu de l'ancien bug :
- ❌ "Aucune donnée reçue depuis 487407h"
