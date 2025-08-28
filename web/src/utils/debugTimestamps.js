import { parseTimestamp, getHoursSinceTimestamp } from '../utils/systemMonitoringHelpers';

/**
 * Fonction de debug pour analyser les timestamps des devices
 * @param {Array} devices - Liste des devices à analyser
 */
export const debugDeviceTimestamps = (devices) => {
  console.group('🔍 Debug Timestamps Devices');

  if (!devices || !Array.isArray(devices)) {
    console.warn('Aucun device fourni ou format invalide');
    console.groupEnd();
    return;
  }

  devices.forEach(device => {
    console.group(`📱 Device ${device.sensor_id} (${device.room_name})`);

    console.log('📊 Données brutes:', {
      last_seen: device.last_seen,
      type: typeof device.last_seen,
      raw_value: device.last_seen
    });

    if (device.last_seen) {
      const parsedDate = parseTimestamp(device.last_seen);
      const hoursAgo = getHoursSinceTimestamp(device.last_seen);

      console.log('🔄 Données parsées:', {
        parsed_date: parsedDate,
        formatted: parsedDate ? parsedDate.toLocaleString('fr-FR') : 'Invalide',
        hours_ago: hoursAgo,
        is_valid: parsedDate !== null
      });

      if (parsedDate) {
        const now = new Date();
        console.log('⏰ Comparaison temporelle:', {
          now: now.toLocaleString('fr-FR'),
          last_seen: parsedDate.toLocaleString('fr-FR'),
          diff_ms: now - parsedDate,
          diff_hours: Math.round((now - parsedDate) / (1000 * 60 * 60) * 100) / 100,
          diff_days: Math.round((now - parsedDate) / (1000 * 60 * 60 * 24) * 100) / 100
        });

        // Vérifications de cohérence
        const isRecentData = hoursAgo < 24;
        const isValidTimestamp = parsedDate.getFullYear() > 2020 && parsedDate <= now;

        console.log('✅ Validation:', {
          is_recent: isRecentData,
          is_valid_timestamp: isValidTimestamp,
          is_future: parsedDate > now,
          year: parsedDate.getFullYear()
        });

        if (!isValidTimestamp) {
          console.error('❌ Timestamp suspect détecté !');
        }
      } else {
        console.error('❌ Impossible de parser le timestamp');
      }
    } else {
      console.warn('⚠️ Pas de timestamp last_seen');
    }

    console.groupEnd();
  });

  console.groupEnd();
};

/**
 * Fonction pour tester la correction des timestamps
 */
export const testTimestampParsing = () => {
  console.group('🧪 Test Parsing Timestamps');

  const testCases = [
    { name: 'Unix timestamp (secondes)', value: 1693315200, expected: '2023-08-29' },
    { name: 'Unix timestamp invalide', value: 1234567890123, expected: 'Année 2009' },
    { name: 'ISO String', value: '2025-08-29T10:00:00Z', expected: '2025-08-29' },
    { name: 'Date récente', value: Math.floor(Date.now() / 1000) - 3600, expected: '1h ago' },
    { name: 'String invalide', value: 'invalid-date', expected: 'null' },
    { name: 'Null', value: null, expected: 'null' },
    { name: 'Undefined', value: undefined, expected: 'null' }
  ];

  testCases.forEach(test => {
    console.group(`🔧 Test: ${test.name}`);
    console.log('Input:', test.value, typeof test.value);

    const parsed = parseTimestamp(test.value);
    const hours = getHoursSinceTimestamp(test.value);

    console.log('Résultat:', {
      parsed_date: parsed,
      formatted: parsed ? parsed.toLocaleString('fr-FR') : 'null',
      hours_ago: hours,
      expected: test.expected
    });

    console.groupEnd();
  });

  console.groupEnd();
};

// Exporter pour utilisation dans la console du navigateur
if (typeof window !== 'undefined') {
  window.debugDeviceTimestamps = debugDeviceTimestamps;
  window.testTimestampParsing = testTimestampParsing;
}
