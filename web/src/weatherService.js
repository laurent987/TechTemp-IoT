// Service pour récupérer les données météo belges
import axios from 'axios';
import { useState, useCallback } from 'react';

// Configuration par défaut pour la Belgique
const DEFAULT_CONFIG = {
  // Coordonnées de Bruxelles (centre de la Belgique)
  lat: 50.8503,
  lon: 4.3517,
  // Vous devrez obtenir une clé API gratuite sur https://openweathermap.org/api
  apiKey: process.env.REACT_APP_OPENWEATHER_API_KEY || 'demo_key',
  baseUrl: 'https://api.openweathermap.org/data/2.5'
};

/**
 * Récupère la température extérieure actuelle en Belgique
 */
export async function getCurrentWeather() {
  try {
    const response = await axios.get(`${DEFAULT_CONFIG.baseUrl}/weather`, {
      params: {
        lat: DEFAULT_CONFIG.lat,
        lon: DEFAULT_CONFIG.lon,
        appid: DEFAULT_CONFIG.apiKey,
        units: 'metric', // Celsius
        lang: 'fr'
      }
    });

    return {
      temperature: response.data.main.temp,
      humidity: response.data.main.humidity,
      description: response.data.weather[0].description,
      timestamp: Date.now(),
      location: 'Belgique (Extérieur)'
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de la météo:', error);
    throw new Error('Impossible de récupérer les données météo');
  }
}

/**
 * Récupère les prévisions météo sur 5 jours (données toutes les 3h)
 * Utile pour afficher l'historique et les tendances
 */
export async function getWeatherForecast() {
  try {
    const response = await axios.get(`${DEFAULT_CONFIG.baseUrl}/forecast`, {
      params: {
        lat: DEFAULT_CONFIG.lat,
        lon: DEFAULT_CONFIG.lon,
        appid: DEFAULT_CONFIG.apiKey,
        units: 'metric',
        lang: 'fr'
      }
    });

    return response.data.list.map(item => ({
      temperature: item.main.temp,
      humidity: item.main.humidity,
      description: item.weather[0].description,
      timestamp: item.dt * 1000, // Convert to milliseconds
      location: 'Belgique (Extérieur)'
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des prévisions:', error);
    throw new Error('Impossible de récupérer les prévisions météo');
  }
}

/**
 * Service alternatif utilisant une API météo belge gratuite
 * Plus spécifique à la Belgique, pas besoin de clé API
 * @param {Date} startDate - Date de début pour les données historiques
 * @param {Date} endDate - Date de fin pour les données historiques
 */
export async function getBelgianWeatherFromOpenMeteo(startDate = null, endDate = null) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Si pas de dates spécifiées, utiliser les dernières 24h
  const defaultStart = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const defaultEnd = today;

  const effectiveStart = startDate || defaultStart;
  const effectiveEnd = endDate || defaultEnd;

  try {
    console.log('Récupération météo pour:', {
      startDate: effectiveStart.toISOString(),
      endDate: effectiveEnd.toISOString()
    });

    // Calculer les jours passés et futurs par rapport à aujourd'hui
    const diffStartDays = Math.floor((today.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000));
    const diffEndDays = Math.floor((effectiveEnd.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    const pastDays = Math.max(0, diffStartDays);
    const forecastDays = Math.max(1, Math.min(7, diffEndDays + 1)); // API limite à 7 jours

    // Vérifier si on demande des données trop anciennes (>92 jours)
    if (pastDays > 92) {
      console.warn('Date trop ancienne pour Open-Meteo, génération de données simulées');
      return generateSimulatedWeatherData(effectiveStart, effectiveEnd);
    }

    // API Open-Meteo - gratuite, pas de clé requise
    const params = {
      latitude: 50.8503,
      longitude: 4.3517,
      hourly: 'temperature_2m,relative_humidity_2m',
      timezone: 'Europe/Brussels',
    };

    // Ajouter les paramètres de date seulement si nécessaire
    if (pastDays > 0) {
      params.past_days = Math.min(92, pastDays);
    }
    if (diffEndDays >= 0) {
      params.forecast_days = forecastDays;
    }

    console.log('Paramètres API Open-Meteo:', params);

    const response = await axios.get('https://api.open-meteo.com/v1/forecast', { params });

    const hourly = response.data.hourly;

    // Données horaires filtrées pour la plage demandée
    const hourlyData = hourly.time
      .map((time, index) => ({
        temperature: hourly.temperature_2m[index],
        humidity: hourly.relative_humidity_2m[index],
        timestamp: new Date(time).getTime(),
        location: 'Belgique (Extérieur)'
      }))
      .filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= effectiveStart && itemDate <= effectiveEnd;
      });

    console.log(`Données météo récupérées: ${hourlyData.length} points`);

    return {
      current: {
        temperature: hourlyData[hourlyData.length - 1]?.temperature || 20,
        humidity: hourlyData[hourlyData.length - 1]?.humidity || 50,
        description: 'Données historiques',
        timestamp: Date.now(),
        location: 'Belgique (Extérieur)'
      },
      hourly: hourlyData
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de la météo Open-Meteo:', error);

    // En cas d'erreur, générer des données simulées
    console.warn('Génération de données météo simulées');
    return generateSimulatedWeatherData(effectiveStart, effectiveEnd);
  }
}

/**
 * Génère des données météo simulées pour les dates historiques
 */
function generateSimulatedWeatherData(startDate, endDate) {
  const hourlyData = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Générer des données toutes les heures
  for (let time = new Date(start); time <= end; time.setHours(time.getHours() + 1)) {
    // Simulation basée sur des patterns météo typiques belges
    const hour = time.getHours();
    const dayOfYear = time.getMonth() * 30 + time.getDate();

    // Température de base selon la saison (approximation pour la Belgique)
    let baseTemp = 15 + 10 * Math.sin((dayOfYear - 80) * 2 * Math.PI / 365);

    // Variation diurne (plus chaud l'après-midi)
    const dailyVariation = 5 * Math.sin((hour - 6) * Math.PI / 12);

    // Ajout de variation aléatoire
    const randomVariation = (Math.random() - 0.5) * 4;

    const temperature = Math.round((baseTemp + dailyVariation + randomVariation) * 10) / 10;
    const humidity = Math.round(50 + 30 * Math.sin(hour * Math.PI / 24) + (Math.random() - 0.5) * 20);

    hourlyData.push({
      temperature,
      humidity: Math.max(20, Math.min(90, humidity)),
      timestamp: new Date(time).getTime(),
      location: 'Belgique (Extérieur - Simulé)'
    });
  }

  return {
    current: {
      temperature: hourlyData[hourlyData.length - 1]?.temperature || 20,
      humidity: hourlyData[hourlyData.length - 1]?.humidity || 50,
      description: 'Données simulées',
      timestamp: Date.now(),
      location: 'Belgique (Extérieur - Simulé)'
    },
    hourly: hourlyData
  };
}/**
 * Convertit le code météo Open-Meteo en description
 */
function getWeatherDescription(code) {
  const descriptions = {
    0: 'Ciel clair',
    1: 'Principalement clair',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    71: 'Neige légère',
    73: 'Neige modérée',
    75: 'Neige forte',
    95: 'Orage'
  };
  return descriptions[code] || 'Conditions météo inconnues';
}

/**
 * Hook React pour utiliser les données météo
 * @param {Date} startDate - Date de début
 * @param {Date} endDate - Date de fin
 */
export function useWeatherData(startDate = null, endDate = null) {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeatherData = useCallback(async (customStartDate = null, customEndDate = null) => {
    setLoading(true);
    setError(null);
    try {
      const effectiveStart = customStartDate || startDate;
      const effectiveEnd = customEndDate || endDate;

      const data = await getBelgianWeatherFromOpenMeteo(effectiveStart, effectiveEnd);

      // Transformer les données pour qu'elles soient compatibles avec le graphique
      const formattedData = data.hourly.map(item => ({
        timestamp: item.timestamp,
        temperature: item.temperature,
        humidity: item.humidity,
        room: 'Extérieur (Belgique)',
        room_id: 'weather_outside'
      }));

      setWeatherData(formattedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]); // Dépendances du useCallback

  return {
    weatherData,
    loading,
    error,
    fetchWeatherData
  };
}