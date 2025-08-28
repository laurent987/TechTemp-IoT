import {
  CheckCircleIcon,
  WarningIcon,
  MinusIcon,
  InfoIcon
} from '@chakra-ui/icons';

export const STATUS_COLORS = {
  healthy: 'green',
  online: 'green',
  warning: 'yellow',
  critical: 'red',
  default: 'gray'
};

export const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

export const getStatusIcon = (status) => {
  const icons = {
    healthy: CheckCircleIcon,
    online: CheckCircleIcon,
    warning: WarningIcon,
    critical: MinusIcon,
    default: InfoIcon
  };
  return icons[status] || icons.default;
};

export const formatLastSeen = (timestamp) => {
  const date = parseTimestamp(timestamp);
  if (!date) return 'Date invalide';

  return date.toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const getMinutesSinceLastReading = (lastSeen) => {
  const date = parseTimestamp(lastSeen);
  if (!date) return 0;

  const now = new Date();
  return Math.round((now - date) / (1000 * 60));
};

export const getTemperatureColor = (temp) => {
  if (temp < 16) return "blue.500";
  if (temp < 20) return "cyan.500";
  if (temp < 24) return "green.500";
  if (temp < 26) return "yellow.500";
  if (temp < 28) return "orange.500";
  return "red.500";
};

export const getHumidityColor = (humidity) => {
  if (humidity < 30) return "red.500";
  if (humidity < 40) return "orange.500";
  if (humidity < 60) return "blue.500";
  if (humidity < 70) return "cyan.500";
  return "blue.600";
};

/**
 * Convertit un timestamp en objet Date de manière cohérente
 * @param {number|string} timestamp - Timestamp Unix (secondes) ou string ISO
 * @returns {Date|null} Objet Date ou null si invalide
 */
export const parseTimestamp = (timestamp) => {
  if (!timestamp) return null;

  let date;
  if (typeof timestamp === 'number') {
    // Timestamp Unix (secondes) - convertir en millisecondes
    date = new Date(timestamp * 1000);
  } else {
    // Format string (ISO)
    date = new Date(timestamp);
  }

  // Vérifier que la date est valide
  if (isNaN(date.getTime())) {
    console.warn(`Timestamp invalide:`, timestamp);
    return null;
  }

  return date;
};

/**
 * Calcule la différence en heures entre maintenant et un timestamp
 * @param {number|string} timestamp - Timestamp à comparer
 * @returns {number|null} Différence en heures, ou null si invalide
 */
export const getHoursSinceTimestamp = (timestamp) => {
  const date = parseTimestamp(timestamp);
  if (!date) return null;

  const now = new Date();
  return (now - date) / (1000 * 60 * 60);
};

export const API_ENDPOINTS = {
  LOCAL_HEALTH: 'http://192.168.0.42:8080/api/system/health',
  FIREBASE_HEALTH: 'https://us-central1-techtemp-49c7f.cloudfunctions.net/getSystemHealth',
  TRIGGER_READING: 'http://192.168.0.42:8080/api/trigger-reading'
};
