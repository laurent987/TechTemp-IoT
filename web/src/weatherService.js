// Service pour récupérer les données météo belges
import axios from 'axios';
import { useState } from 'react';

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
 */
export async function getBelgianWeatherFromOpenMeteo() {
  try {
    // API Open-Meteo - gratuite, pas de clé requise
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: 50.8503,
        longitude: 4.3517,
        current_weather: true,
        hourly: 'temperature_2m,relative_humidity_2m',
        timezone: 'Europe/Brussels',
        past_days: 1, // Données des dernières 24h
        forecast_days: 1 // Prévisions pour aujourd'hui
      }
    });

    const current = response.data.current_weather;
    const hourly = response.data.hourly;

    // Données actuelles
    const currentData = {
      temperature: current.temperature,
      humidity: null, // Non disponible dans current_weather
      description: getWeatherDescription(current.weathercode),
      timestamp: Date.now(),
      location: 'Belgique (Extérieur)'
    };

    // Données horaires des dernières 24h + prévisions
    const hourlyData = hourly.time.map((time, index) => ({
      temperature: hourly.temperature_2m[index],
      humidity: hourly.relative_humidity_2m[index],
      timestamp: new Date(time).getTime(),
      location: 'Belgique (Extérieur)'
    }));

    return {
      current: currentData,
      hourly: hourlyData
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de la météo Open-Meteo:', error);
    throw new Error('Impossible de récupérer les données météo belges');
  }
}

/**
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
 */
export function useWeatherData() {
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeatherData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBelgianWeatherFromOpenMeteo();

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
  };

  return {
    weatherData,
    loading,
    error,
    fetchWeatherData
  };
}
