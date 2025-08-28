/**
 * 🧪 Simulateur de scénarios de test pour les alertes
 * Permet de tester tous les cas d'alertes possibles
 */

import { getHoursSinceTimestamp } from './systemMonitoringHelpers';

/**
 * Génère des devices de test avec différents problèmes
 */
const generateTestDevices = () => {
  const now = new Date();
  const oneHourAgo = Math.floor((now.getTime() - 1 * 60 * 60 * 1000) / 1000);
  const threeHoursAgo = Math.floor((now.getTime() - 3 * 60 * 60 * 1000) / 1000);
  const eightHoursAgo = Math.floor((now.getTime() - 8 * 60 * 60 * 1000) / 1000);
  const twoDaysAgo = Math.floor((now.getTime() - 2 * 24 * 60 * 60 * 1000) / 1000);

  return [
    // ✅ Device normal - aucune alerte
    {
      sensor_id: 1,
      room_name: "Salon Normal",
      room_id: "A",
      status: "online",
      last_seen: Math.floor(now.getTime() / 1000) - 300, // 5 min ago
      temperature: 22.5,
      humidity: 45
    },

    // 🟡 Device avec données anciennes (3h)
    {
      sensor_id: 2,
      room_name: "Cuisine Données Anciennes",
      room_id: "B",
      status: "online",
      last_seen: threeHoursAgo,
      temperature: 24.1,
      humidity: 52
    },

    // 🟠 Device avec données obsolètes (8h)
    {
      sensor_id: 3,
      room_name: "Chambre Données Obsolètes",
      room_id: "C",
      status: "online",
      last_seen: eightHoursAgo,
      temperature: 20.2,
      humidity: 48
    },

    // 🔴 Device offline depuis 2 jours
    {
      sensor_id: 4,
      room_name: "Bureau Offline",
      room_id: "D",
      status: "offline",
      last_seen: twoDaysAgo,
      temperature: null,
      humidity: null
    },

    // 🔥 Device avec température critique
    {
      sensor_id: 5,
      room_name: "Grenier Surchauffé",
      room_id: "E",
      status: "online",
      last_seen: oneHourAgo,
      temperature: 38.5, // CRITIQUE > 35°C
      humidity: 25
    },

    // ❄️ Device avec température trop froide
    {
      sensor_id: 6,
      room_name: "Cave Froide",
      room_id: "F",
      status: "online",
      last_seen: oneHourAgo,
      temperature: 2.1, // CRITIQUE < 5°C
      humidity: 85
    },

    // 💧 Device avec humidité critique (trop élevée)
    {
      sensor_id: 7,
      room_name: "Salle de Bain Humide",
      room_id: "G",
      status: "online",
      last_seen: oneHourAgo,
      temperature: 24.0,
      humidity: 92 // CRITIQUE > 85%
    },

    // 🏜️ Device avec humidité trop faible
    {
      sensor_id: 8,
      room_name: "Salon Sec",
      room_id: "H",
      status: "online",
      last_seen: oneHourAgo,
      temperature: 25.5,
      humidity: 12 // CRITIQUE < 15%
    },

    // ⚠️ Device avec température élevée (warning)
    {
      sensor_id: 9,
      room_name: "Véranda Chaude",
      room_id: "I",
      status: "online",
      last_seen: oneHourAgo,
      temperature: 30.2, // WARNING > 28°C
      humidity: 45
    },

    // 🌡️ Device avec humidité élevée (warning)
    {
      sensor_id: 10,
      room_name: "Buanderie Humide",
      room_id: "J",
      status: "online",
      last_seen: oneHourAgo,
      temperature: 22.8,
      humidity: 75 // WARNING > 70%
    },

    // 📊 Device sans données
    {
      sensor_id: 11,
      room_name: "Capteur Sans Données",
      room_id: "K",
      status: "online",
      last_seen: oneHourAgo,
      temperature: null,
      humidity: null
    },

    // 🔄 Device avec timestamp invalide (ancien bug)
    {
      sensor_id: 12,
      room_name: "Device Timestamp Cassé",
      room_id: "L",
      status: "online",
      last_seen: "invalid-timestamp",
      temperature: 21.5,
      humidity: 50
    }
  ];
};

/**
 * Version utilitaire (non-hook) pour générer des alertes à partir de devices
 * Copie de la logique du hook useDeviceAlerts pour les tests
 */
const generateAlertsFromDevices = (devices) => {
  if (!devices || !Array.isArray(devices)) {
    return [];
  }

  const alerts = [];

  devices.forEach(device => {
    // Alerte si device offline
    if (device.status !== 'online' && device.status !== 'healthy') {
      alerts.push({
        type: 'Device Offline',
        level: 'error',
        sensor_id: device.sensor_id,
        room_name: device.room_name,
        message: `Le device ${device.sensor_id} (${device.room_name}) est hors ligne`
      });
    }

    // Alerte si dernière lecture trop ancienne
    if (device.last_seen) {
      const diffHours = getHoursSinceTimestamp(device.last_seen);

      if (diffHours !== null) {
        // Alertes par niveaux de gravité
        if (diffHours > 24) {
          alerts.push({
            type: 'Données Obsolètes',
            level: 'error',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Aucune donnée reçue depuis ${Math.round(diffHours)}h (${Math.round(diffHours / 24)}j)`
          });
        } else if (diffHours > 6) {
          alerts.push({
            type: 'Données Obsolètes',
            level: 'warning',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Aucune donnée reçue depuis ${Math.round(diffHours)}h`
          });
        } else if (diffHours > 2) {
          alerts.push({
            type: 'Données Anciennes',
            level: 'info',
            sensor_id: device.sensor_id,
            room_name: device.room_name,
            message: `Dernière lecture il y a ${Math.round(diffHours)}h`
          });
        }
      }
    }

    // Alertes sur les valeurs de température
    if (device.temperature !== null && device.temperature !== undefined) {
      if (device.temperature > 35) {
        alerts.push({
          type: 'Température Critique',
          level: 'error',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Température critique: ${device.temperature}°C`
        });
      } else if (device.temperature > 28) {
        alerts.push({
          type: 'Température Élevée',
          level: 'warning',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Température élevée: ${device.temperature}°C`
        });
      } else if (device.temperature < 5) {
        alerts.push({
          type: 'Température Critique',
          level: 'error',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Température critique: ${device.temperature}°C`
        });
      } else if (device.temperature < 15) {
        alerts.push({
          type: 'Température Basse',
          level: 'warning',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Température basse: ${device.temperature}°C`
        });
      }
    }

    // Alertes sur l'humidité
    if (device.humidity !== null && device.humidity !== undefined) {
      if (device.humidity > 85) {
        alerts.push({
          type: 'Humidité Critique',
          level: 'error',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Humidité critique: ${device.humidity}% (risque de moisissure)`
        });
      } else if (device.humidity > 70) {
        alerts.push({
          type: 'Humidité Élevée',
          level: 'warning',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Humidité élevée: ${device.humidity}%`
        });
      } else if (device.humidity < 15) {
        alerts.push({
          type: 'Humidité Critique',
          level: 'error',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Humidité critique: ${device.humidity}% (air très sec)`
        });
      } else if (device.humidity < 30) {
        alerts.push({
          type: 'Humidité Basse',
          level: 'warning',
          sensor_id: device.sensor_id,
          room_name: device.room_name,
          message: `Humidité basse: ${device.humidity}%`
        });
      }
    }

    // Alerte si aucune données de température/humidité disponibles
    if ((device.temperature === null || device.temperature === undefined) &&
      (device.humidity === null || device.humidity === undefined)) {
      alerts.push({
        type: 'Données Manquantes',
        level: 'warning',
        sensor_id: device.sensor_id,
        room_name: device.room_name,
        message: `Aucune donnée de température/humidité disponible`
      });
    }
  });

  return alerts;
};

/**
 * Fonction pour tester les alertes dans la console
 */
const testAllAlertScenarios = () => {
  console.group('🚨 Test de tous les scénarios d\'alertes');

  const testDevices = generateTestDevices();
  console.log('📱 Devices de test générés:', testDevices.length);

  // Utiliser notre fonction utilitaire au lieu du hook
  const alerts = generateAlertsFromDevices(testDevices);

  console.group('📊 Résultats des alertes:');
  console.log(`Total des alertes générées: ${alerts.length}`);

  // Grouper par niveau
  const alertsByLevel = alerts.reduce((acc, alert) => {
    acc[alert.level] = (acc[alert.level] || 0) + 1;
    return acc;
  }, {});

  console.table(alertsByLevel);

  // Détail des alertes
  alerts.forEach((alert, index) => {
    const emoji = alert.level === 'error' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵';
    console.log(`${emoji} [${alert.level.toUpperCase()}] ${alert.type}: ${alert.message}`);
  });

  console.groupEnd();
  console.groupEnd();

  return {
    totalAlerts: alerts.length,
    byLevel: alertsByLevel,
    alerts: alerts,
    testDevices: testDevices
  };
};

/**
 * Fonction pour injecter des devices de test dans l'application
 * ⚠️ ATTENTION: À utiliser uniquement pour les tests !
 */
const injectTestDevicesInConsole = () => {
  console.warn('🧪 INJECTION DE DEVICES DE TEST - MODE DEBUG UNIQUEMENT');

  // Stockage temporaire des vraies données
  const originalDevices = window._originalDevices || [];

  // Injection des devices de test
  const testDevices = generateTestDevices();
  window._testDevices = testDevices;
  window._originalDevices = originalDevices;

  console.log('✅ Devices de test injectés. Utilisez resetTestDevices() pour restaurer.');
  console.log('📊 Devices injectés:', testDevices.length);

  return testDevices;
};

/**
 * Restaure les devices originaux
 */
const resetTestDevices = () => {
  if (window._originalDevices) {
    console.log('🔄 Restauration des devices originaux');
    delete window._testDevices;
    delete window._originalDevices;
    console.log('✅ Devices restaurés');
  } else {
    console.log('ℹ️ Aucun device original à restaurer');
  }
};

/**
 * Simule des timestamps problématiques pour tester le fix
 */
const testTimestampBugFix = () => {
  console.group('🐛 Test du fix des timestamps');

  const problematicTimestamps = [
    1693315200,        // Unix correct (secondes)
    1693315200000,     // Unix en millisecondes
    '2025-08-29T10:00:00Z',  // ISO string
    'invalid-date',    // String invalide
    null,              // Null
    undefined,         // Undefined
    1234567890,        // Timestamp ancien (2009)
  ];

  problematicTimestamps.forEach(timestamp => {
    const device = {
      sensor_id: 999,
      room_name: "Test Timestamp",
      room_id: "TEST",
      status: "online",
      last_seen: timestamp,
      temperature: 22,
      humidity: 50
    };

    console.group(`🔧 Test timestamp: ${timestamp} (${typeof timestamp})`);

    try {
      const alerts = generateAlertsFromDevices([device]);
      const timeAlerts = alerts.filter(a => a.type.includes('Données'));

      console.log('Alertes générées:', timeAlerts.length);
      timeAlerts.forEach(alert => {
        console.log(`- ${alert.message}`);
      });
    } catch (error) {
      console.error('Erreur:', error.message);
    }

    console.groupEnd();
  });

  console.groupEnd();
};

// Export pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.testAllAlertScenarios = testAllAlertScenarios;
  window.injectTestDevicesInConsole = injectTestDevicesInConsole;
  window.resetTestDevices = resetTestDevices;
  window.testTimestampBugFix = testTimestampBugFix;
  window.generateTestDevices = generateTestDevices;
}

export {
  testAllAlertScenarios,
  injectTestDevicesInConsole,
  resetTestDevices,
  testTimestampBugFix,
  generateTestDevices,
  generateAlertsFromDevices
};
