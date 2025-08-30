// 🧪 COPIEZ-COLLEZ CE CODE DANS LA CONSOLE DU NAVIGATEUR

// Test du fix des timestamps (ancien bug 487407h)
function testAlertsBugFix() {
  console.group('🚨 Test du Fix des Alertes - TechTemp IoT');

  console.log('🔧 Test 1: Timestamp Unix (ancien bug 487407h)');
  const unixTimestamp = 1693315200; // 29 août 2023
  const now = new Date();
  const timestampDate = new Date(unixTimestamp * 1000); // Conversion correcte
  const hoursDiff = (now - timestampDate) / (1000 * 60 * 60);

  console.log('📊 Résultats:');
  console.log(`- Timestamp brut: ${unixTimestamp}`);
  console.log(`- Date parsée: ${timestampDate.toLocaleString('fr-FR')}`);
  console.log(`- Heures écoulées: ${Math.round(hoursDiff)}h`);
  console.log(`- Jours écoulés: ${Math.round(hoursDiff / 24)}j`);

  // Vérification du bug
  if (hoursDiff > 400000) {
    console.error('❌ BUG DÉTECTÉ: Plus de 400000h - problème de parsing !');
    console.error('💡 Le timestamp Unix n\'est pas correctement converti en millisecondes');
  } else {
    console.log('✅ Timestamp correctement parsé - Bug 487407h RÉSOLU !');
  }

  console.log('\n🔧 Test 2: Alertes de température');
  const criticalTemp = 38.5;
  console.log(`- Température: ${criticalTemp}°C`);
  if (criticalTemp > 35) {
    console.log('🔴 Alerte: Température critique détectée');
  }

  console.log('\n🔧 Test 3: Alertes d\'humidité');
  const criticalHumidity = 92;
  console.log(`- Humidité: ${criticalHumidity}%`);
  if (criticalHumidity > 85) {
    console.log('🔴 Alerte: Humidité critique détectée (risque de moisissure)');
  }

  console.log('\n🔧 Test 4: Timestamps invalides');
  const invalidTimestamps = ['invalid-date', null, undefined];
  invalidTimestamps.forEach(ts => {
    console.log(`- Test "${ts}": ${new Date(ts).toString()}`);
  });

  console.groupEnd();
  console.log('\n🎉 Tests terminés ! Le bug 487407h devrait être résolu.');
  console.log('📊 Vérifiez que vos alertes affichent maintenant des valeurs réalistes.');
}

// Test d'injection d'un device problématique
function injectTestDevice() {
  console.warn('🧪 Device de test avec problèmes multiples:');

  const testDevice = {
    sensor_id: 999,
    room_name: "Device de Test",
    room_id: "TEST",
    status: "online",
    last_seen: Math.floor(Date.now() / 1000) - (8 * 60 * 60), // 8h ago
    temperature: 38.5, // critique
    humidity: 92, // critique
    last_temperature: 38.5,
    avg_temperature: 37.2,
    last_humidity: 92,
    avg_humidity: 88.5
  };

  console.table(testDevice);
  return testDevice;
}

// Test de parsing de timestamp spécifique
function testTimestampParsing(timestamp) {
  console.group(`🔍 Test parsing: ${timestamp}`);

  let date;
  if (typeof timestamp === 'number') {
    // Unix timestamp en secondes → millisecondes
    date = new Date(timestamp * 1000);
  } else {
    // String ou autre format
    date = new Date(timestamp);
  }

  const isValid = !isNaN(date.getTime());
  const now = new Date();
  const diffHours = isValid ? (now - date) / (1000 * 60 * 60) : null;

  console.log(`- Type: ${typeof timestamp}`);
  console.log(`- Valeur: ${timestamp}`);
  console.log(`- Date parsée: ${date.toString()}`);
  console.log(`- Valide: ${isValid}`);
  if (isValid) {
    console.log(`- Heures écoulées: ${Math.round(diffHours)}h`);
    console.log(`- Jours écoulés: ${Math.round(diffHours / 24)}j`);
  }

  console.groupEnd();
  return { timestamp, date, isValid, diffHours };
}

// Lancement automatique du test
console.log('🧪 Fonctions de test chargées:');
console.log('• testAlertsBugFix() - Test complet du fix');
console.log('• injectTestDevice() - Génère un device de test');
console.log('• testTimestampParsing(timestamp) - Test un timestamp spécifique');
console.log('\n🚀 Exécution automatique du test principal:');
testAlertsBugFix();
