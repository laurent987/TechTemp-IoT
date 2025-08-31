# 🧪 Guide Rapide de Test des Alertes

## ✅ L'application fonctionne maintenant !

Le bug des "487407h" a été corrigé. Voici comment tester le système d'alertes :

## 🔧 Test Rapide (Console du navigateur)

1. **Ouvrez la console** (F12)
2. **Chargez le script de test** :
   ```javascript
   // Copiez-collez dans la console :
   fetch('/test-alerts.js').then(r => r.text()).then(eval)
   ```

3. **Ou testez directement** :
   ```javascript
   testAlertsBugFix()
   ```

## 📊 Résultat Attendu

Vous devriez voir des valeurs normales comme :
- ✅ "Heures écoulées: 8760h" (1 an)
- ✅ "Jours écoulés: 365j"

**Pas** de valeurs aberrantes comme :
- ❌ "487407h" (55 ans)

## 🎯 Tests Fonctionnels

### 1. **Alertes Temporelles**
- **> 24h** : "Aucune donnée depuis 48h (2j)"
- **> 6h** : "Aucune donnée depuis 8h" 
- **> 2h** : "Dernière lecture il y a 3h"

### 2. **Alertes Température**
- **> 35°C** : "Température critique: 38.5°C"
- **> 28°C** : "Température élevée: 30.2°C"
- **< 5°C** : "Température critique: 2.1°C"

### 3. **Alertes Humidité**
- **> 85%** : "Humidité critique: 92% (risque de moisissure)"
- **> 70%** : "Humidité élevée: 75%"
- **< 15%** : "Humidité critique: 12% (air très sec)"

## 🐛 Si vous voyez encore "487407h"

1. **Actualisez la page** (Ctrl+F5)
2. **Vérifiez la console** pour les erreurs
3. **Testez manuellement** :
   ```javascript
   const timestamp = 1693315200;
   const date = new Date(timestamp * 1000);
   console.log(date.toLocaleString());
   ```

## ✨ Nouvelles Fonctionnalités

- 🔍 **Debug automatique** en mode développement
- 🧪 **Tests intégrés** dans la console
- 📊 **Alertes multicritères** (temps + valeurs)
- 🛡️ **Validation robuste** des timestamps

Le système est maintenant beaucoup plus fiable ! 🎉
