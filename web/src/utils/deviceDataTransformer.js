/**
 * Transforme les données du device pour uniformiser les champs selon le mode (temps réel ou Firebase)
 * @param {Object} device - Les données brutes du device
 * @param {boolean} useRealTime - Mode temps réel (true) ou Firebase (false)
 * @returns {Object} Device avec des champs uniformisés
 */
export const transformDeviceData = (device, useRealTime) => {
  return {
    ...device,
    // Champs uniformisés - toujours les mêmes noms
    temperature: useRealTime ? device.last_temperature : device.avg_temperature,
    humidity: useRealTime ? device.last_humidity : device.avg_humidity,

    // Métadonnées pour l'affichage
    temperaturePrecision: useRealTime ? 1 : 1,
    humidityPrecision: useRealTime ? 0 : 1,

    // Garder les champs originaux au cas où (pour debug ou autres usages)
    _original: {
      last_temperature: device.last_temperature,
      avg_temperature: device.avg_temperature,
      last_humidity: device.last_humidity,
      avg_humidity: device.avg_humidity
    }
  };
};

/**
 * Transforme une liste de devices
 * @param {Array} devices - Liste des devices
 * @param {boolean} useRealTime - Mode temps réel ou Firebase
 * @returns {Array} Liste des devices transformés
 */
export const transformDevicesData = (devices, useRealTime) => {
  if (!devices || !Array.isArray(devices)) {
    return [];
  }

  return devices.map(device => transformDeviceData(device, useRealTime));
};

/**
 * Valide qu'un device a les champs requis
 * @param {Object} device - Device à valider
 * @returns {boolean} True si le device est valide
 */
export const validateDeviceData = (device) => {
  const requiredFields = [
    'sensor_id',
    'room_name',
    'room_id',
    'status',
    'last_seen'
  ];

  return requiredFields.every(field => device && device[field] !== undefined);
};

/**
 * Obtient un device avec des valeurs par défaut si certains champs manquent
 * @param {Object} device - Device potentiellement incomplet
 * @returns {Object} Device avec des valeurs par défaut
 */
export const getDeviceWithDefaults = (device) => {
  return {
    sensor_id: device.sensor_id || 'unknown',
    room_name: device.room_name || 'Salle inconnue',
    room_id: device.room_id || 'N/A',
    status: device.status || 'unknown',
    last_seen: device.last_seen || new Date().toISOString(),
    temperature: device.temperature ?? null,
    humidity: device.humidity ?? null,
    temperaturePrecision: device.temperaturePrecision || 1,
    humidityPrecision: device.humidityPrecision || 1,
    ...device
  };
};
