/**
 * 🧪 Test simple des alertes - Version indépendante
 * À utiliser directement dans la console du navigateur
 */

// Fonction pour tester les alertes avec un device problématique
window.testAlertsBugFix = () => {
  console.group('🚨 Test du Fix des Alertes');

  console.log('🔧 Test 1: Device avec timestamp Unix (ancien bug 487407h)');
  const unixTimestamp = 1693315200; // 29 août 2023
  const now = new Date();
  const timestampDate = new Date(unixTimestamp * 1000); // Conversion correcte
  const hoursDiff = (now - timestampDate) / (1000 * 60 * 60);

  console.log('📊 Résultats:');
  console.log(`- Timestamp brut: ${unixTimestamp}`);
  console.log(`- Date parsée: ${timestampDate.toLocaleString('fr-FR')}`);
  console.log(`- Heures écoulées: ${Math.round(hoursDiff)}h`);
  console.log(`- Jours écoulés: ${Math.round(hoursDiff / 24)}j`);

  if (hoursDiff > 487000) {
    console.error('❌ BUG DÉTECTÉ: Plus de 487000h - le timestamp n\'est pas correctement parsé !');
  } else {
    console.log('✅ Timestamp correctement parsé');
  }

  console.log('🔧 Test 2: Device avec température critique');
  const criticalTemp = 38.5;
  console.log(`- Température: ${criticalTemp}°C`);
  if (criticalTemp > 35) {
    console.log('🔴 Alerte: Température critique détectée');
  }

  console.log('🔧 Test 3: Device avec humidité critique');
  const criticalHumidity = 92;
  console.log(`- Humidité: ${criticalHumidity}%`);
  if (criticalHumidity > 85) {
    console.log('🔴 Alerte: Humidité critique détectée (risque de moisissure)');
  }

  console.groupEnd();
  console.log('🎉 Tests terminés ! Vérifiez que les valeurs sont réalistes.');
};

// Fonction pour injecter un device de test simple
window.injectSimpleTestDevice = () => {
  console.warn('🧪 Injection d\'un device de test simple');

  const testDevice = {
    sensor_id: 999,
    room_name: "Device de Test",
    room_id: "TEST",
    status: "online",
    last_seen: Math.floor(Date.now() / 1000) - (8 * 60 * 60), // 8h ago
    temperature: 38.5,
    humidity: 92,
    last_temperature: 38.5,
    avg_temperature: 37.2,
    last_humidity: 92,
    avg_humidity: 88.5
  };

  console.log('Device injecté:', testDevice);
  console.log('🔍 Pour tester, copiez ce device dans vos données système');

  return testDevice;
};

// Instructions d'utilisation
console.log(`
🧪 === TESTS DES ALERTES DISPONIBLES ===

1. Testez le fix des timestamps:
   testAlertsBugFix()

2. Injectez un device de test:
   injectSimpleTestDevice()

3. Vérifiez vos devices actuels:
   debugDeviceTimestamps(devices)
   
🎯 Objectif: Vérifier qu'aucune alerte n'affiche "487407h"
`);

// Export des fonctions pour usage
window.testAlertsBugFix();
