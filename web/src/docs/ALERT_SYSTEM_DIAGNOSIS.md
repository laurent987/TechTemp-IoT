# 🚨 Guide de Diagnostic des Alertes Système

## Problème Identifié

Dans l'interface, vous avez observé des alertes affichant "Aucune donnée reçue depuis 487407h" ce qui correspond à environ **55 ans** ! Cette valeur est clairement incorrecte.

## Cause du Problème

Le problème venait de la **gestion incohérente des timestamps** dans le code :

### ❌ Problème Original
```javascript
// Dans useDeviceAlerts - INCORRECT
const lastSeen = new Date(device.last_seen);
const diffHours = (now - lastSeen) / (1000 * 60 * 60);
```

**Issues :**
- Ne gère pas les timestamps Unix (format secondes)
- Ne valide pas la date parsée
- Peut créer des dates invalides

### ✅ Solution Implémentée

#### 1. **Fonction de parsing cohérente**
```javascript
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  let date;
  if (typeof timestamp === 'number') {
    // Timestamp Unix (secondes) → millisecondes
    date = new Date(timestamp * 1000);
  } else {
    // Format string (ISO)
    date = new Date(timestamp);
  }
  
  // Validation de la date
  if (isNaN(date.getTime())) {
    console.warn(`Timestamp invalide:`, timestamp);
    return null;
  }
  
  return date;
};
```

#### 2. **Calcul d'heures sécurisé**
```javascript
export const getHoursSinceTimestamp = (timestamp) => {
  const date = parseTimestamp(timestamp);
  if (!date) return null;
  
  const now = new Date();
  return (now - date) / (1000 * 60 * 60);
};
```

#### 3. **Alertes améliorées avec seuils réalistes**
```javascript
// Seuils par niveaux de gravité
if (diffHours > 24) {        // > 1 jour → ERREUR
if (diffHours > 6) {         // > 6h → WARNING  
if (diffHours > 2) {         // > 2h → INFO
```

## Types de Timestamps Supportés

| Format | Exemple | Gestion |
|--------|---------|---------|
| **Unix (secondes)** | `1693315200` | ✅ Multiplication par 1000 |
| **Unix (millisecondes)** | `1693315200000` | ✅ Direct |
| **ISO String** | `"2025-08-29T10:00:00Z"` | ✅ Parse direct |
| **Invalid** | `"invalid-date"` | ✅ Retourne null |

## Diagnostic en Mode Développement

### 🔍 Debug Automatique
En mode développement, le système affiche automatiquement les informations de debug dans la console :

```javascript
// Active automatiquement si NODE_ENV === 'development'
🔍 Debug automatique des timestamps:
📱 Device 1 (Salon)
  📊 Données brutes: { last_seen: 1693315200, type: "number" }
  🔄 Données parsées: { parsed_date: Date, hours_ago: 2.5 }
  ⏰ Comparaison temporelle: { diff_hours: 2.5, is_valid: true }
```

### 🧪 Tests Manuels
Vous pouvez aussi tester manuellement dans la console du navigateur :
```javascript
// Tester le parsing des timestamps
testTimestampParsing();

// Analyser vos devices actuels
debugDeviceTimestamps(devices);
```

## Nouveaux Seuils d'Alertes

### 📊 Données Temporelles
- **> 24h** : 🔴 Erreur - "Aucune donnée depuis Xh (Yj)"
- **> 6h** : 🟡 Warning - "Aucune donnée depuis Xh"  
- **> 2h** : 🔵 Info - "Dernière lecture il y a Xh"

### 🌡️ Température
- **> 35°C** : 🔴 Critique
- **> 28°C** : 🟡 Élevée
- **< 5°C** : 🔴 Critique
- **< 15°C** : 🟡 Basse

### 💧 Humidité
- **> 85%** : 🔴 Critique (moisissure)
- **> 70%** : 🟡 Élevée
- **< 15%** : 🔴 Critique (très sec)
- **< 30%** : 🟡 Basse

## Vérification des Corrections

### ✅ Avant vs Après

| Aspect | ❌ Avant | ✅ Après |
|--------|----------|----------|
| **Parsing** | Incohérent | Uniforme avec `parseTimestamp()` |
| **Validation** | Aucune | Vérification `isNaN()` |
| **Formats** | String seulement | Unix + ISO + validation |
| **Erreurs** | 487407h (invalide) | Calculs corrects |
| **Debug** | Impossible | Console + fonctions utilitaires |

### 🧪 Tests de Régression

Pour vérifier que le problème est résolu :

1. **Ouvrir la console développeur** (F12)
2. **Regarder les logs de debug** automatiques
3. **Vérifier les alertes** - plus de valeurs aberrantes
4. **Tester manuellement** : `testTimestampParsing()`

## Prévention Future

### 🛡️ Mesures Préventives Ajoutées

1. **Validation systématique** des timestamps
2. **Logs d'erreur** pour les valeurs invalides  
3. **Tests unitaires** pour les cas edge cases
4. **Debug automatique** en développement
5. **Seuils réalistes** pour les alertes

### 📝 Bonnes Pratiques

- ✅ Toujours utiliser `parseTimestamp()` pour les dates
- ✅ Valider les dates avant calcul
- ✅ Utiliser les fonctions utilitaires centralisées
- ✅ Tester avec différents formats de timestamp
- ✅ Activer les logs de debug en développement

## Résultat Attendu

Après ces corrections, les alertes devraient maintenant afficher des valeurs cohérentes comme :
- ✅ "Aucune donnée reçue depuis 2h"
- ✅ "Dernière lecture il y a 45min"  
- ✅ "Aucune donnée depuis 1j"

Au lieu de :
- ❌ "Aucune donnée reçue depuis 487407h"
