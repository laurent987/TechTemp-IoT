// Exemple d'utilisation du nouveau système de transformation des données

import { transformDeviceData, transformDevicesData } from '../utils/deviceDataTransformer';
import { useDevicesData, useDeviceAlerts } from '../hooks/useDevicesData';

// Données exemple provenant de l'API
const rawApiData = {
  devices: [
    {
      sensor_id: 1,
      room_name: "Salon",
      room_id: "A",
      status: "online",
      last_seen: "2025-08-29T10:00:00Z",
      last_temperature: 22.5,
      avg_temperature: 21.8,
      last_humidity: 45,
      avg_humidity: 47.2
    },
    {
      sensor_id: 2,
      room_name: "Cuisine",
      room_id: "B",
      status: "online",
      last_seen: "2025-08-29T09:55:00Z",
      last_temperature: 24.1,
      avg_temperature: 23.5,
      last_humidity: 52,
      avg_humidity: 50.8
    }
  ]
};

// ✅ UTILISATION EN MODE TEMPS RÉEL
console.log("=== MODE TEMPS RÉEL ===");
const realtimeDevices = transformDevicesData(rawApiData.devices, true);
realtimeDevices.forEach(device => {
  console.log(`${device.room_name}: ${device.temperature}°C, ${device.humidity}%`);
  // Salon: 22.5°C, 45%
  // Cuisine: 24.1°C, 52%
});

// ✅ UTILISATION EN MODE FIREBASE (moyennes)
console.log("=== MODE FIREBASE ===");
const firebaseDevices = transformDevicesData(rawApiData.devices, false);
firebaseDevices.forEach(device => {
  console.log(`${device.room_name}: ${device.temperature}°C, ${device.humidity}%`);
  // Salon: 21.8°C, 47.2%
  // Cuisine: 23.5°C, 50.8%
});

// ✅ UTILISATION DANS UN COMPOSANT REACT
function MonitoringExample() {
  const [useRealTime, setUseRealTime] = useState(true);
  const [rawDevices, setRawDevices] = useState(rawApiData.devices);

  // Hook personnalisé qui gère tout
  const devicesData = useDevicesData(rawDevices, useRealTime);
  const alerts = useDeviceAlerts(devicesData.devices);

  return (
    <div>
      <h2>Statistiques: {devicesData.stats.online}/{devicesData.stats.total} en ligne</h2>

      {devicesData.devices.map(device => (
        <div key={device.sensor_id}>
          <h3>{device.room_name}</h3>
          {/* ✅ Plus de logique conditionnelle ! */}
          <p>Température: {device.temperature?.toFixed(device.temperaturePrecision)}°C</p>
          <p>Humidité: {device.humidity?.toFixed(device.humidityPrecision)}%</p>
        </div>
      ))}

      {alerts.length > 0 && (
        <div>
          <h3>Alertes ({alerts.length})</h3>
          {alerts.map((alert, index) => (
            <div key={index}>{alert.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ✅ AJOUT FACILE DE NOUVELLES MÉTRIQUES
// Pour ajouter une nouvelle métrique, il suffit de modifier le transformer :

/*
export const transformDeviceData = (device, useRealTime) => {
  return {
    ...device,
    temperature: useRealTime ? device.last_temperature : device.avg_temperature,
    humidity: useRealTime ? device.last_humidity : device.avg_humidity,
    
    // ✅ Nouvelle métrique - ajout simple
    pressure: useRealTime ? device.last_pressure : device.avg_pressure,
    
    temperaturePrecision: useRealTime ? 1 : 1,
    humidityPrecision: useRealTime ? 0 : 1,
    pressurePrecision: useRealTime ? 1 : 1, // ✅ Nouvelle précision
  };
};
*/

// ✅ TEST DE PERFORMANCE
console.time('Transform 1000 devices');
const manyDevices = Array(1000).fill(rawApiData.devices[0]);
const transformedMany = transformDevicesData(manyDevices, true);
console.timeEnd('Transform 1000 devices');
// Résultat: très rapide même avec beaucoup de données

export { MonitoringExample };
