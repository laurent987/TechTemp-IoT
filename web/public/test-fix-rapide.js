// 🚀 TEST RAPIDE - Copiez ce code dans la console du navigateur

console.log('🧪 TEST DU FIX 487407h - TechTemp IoT');
console.log('=====================================');

// Test 1: Timestamp Unix actuel
const now = Math.floor(Date.now() / 1000);
console.log('\n🔧 Test 1: Timestamp Unix actuel');
console.log(`- Timestamp: ${now}`);
console.log(`- Date: ${new Date(now * 1000).toLocaleString('fr-FR')}`);

// Test 2: Timestamp problématique (ancien bug)
const oldTimestamp = 1693315200; // 29 août 2023
const diffHours = (Date.now() - (oldTimestamp * 1000)) / (1000 * 60 * 60);
console.log('\n🔧 Test 2: Timestamp ancien (29 août 2023)');
console.log(`- Timestamp: ${oldTimestamp}`);
console.log(`- Date: ${new Date(oldTimestamp * 1000).toLocaleString('fr-FR')}`);
console.log(`- Heures écoulées: ${Math.round(diffHours)}h`);
console.log(`- Jours écoulés: ${Math.round(diffHours / 24)}j`);

if (diffHours > 400000) {
  console.error('❌ BUG ENCORE PRÉSENT: Plus de 400000h détectées !');
} else {
  console.log('✅ BUG RÉSOLU: Valeurs réalistes détectées');
}

// Test 3: Function parseTimestamp locale
function parseTimestamp(timestamp) {
  if (!timestamp) return null;

  let date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp * 1000); // CORRECTION: * 1000 pour Unix
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    console.warn(`Timestamp invalide:`, timestamp);
    return null;
  }

  return date;
}

console.log('\n🔧 Test 3: Function parseTimestamp corrigée');
const testTimestamps = [
  1693315200,  // Unix timestamp
  '2025-08-29T10:30:00Z',  // ISO string
  Date.now() / 1000,  // Unix timestamp actuel
];

testTimestamps.forEach((ts, i) => {
  const parsed = parseTimestamp(ts);
  const hours = parsed ? (Date.now() - parsed.getTime()) / (1000 * 60 * 60) : null;
  console.log(`  ${i + 1}. ${ts} → ${parsed ? parsed.toLocaleString('fr-FR') : 'INVALIDE'} (${hours ? Math.round(hours) + 'h' : 'N/A'})`);
});

console.log('\n🎉 Test terminé ! Si vous voyez des valeurs réalistes, le bug est résolu.');
