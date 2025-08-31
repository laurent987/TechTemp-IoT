import React from 'react';
import { useWeatherData } from '../services/weatherService';

/**
 * Composant isolé pour les données météo
 * Complètement séparé des données des capteurs pour éviter les re-renders
 */
const WeatherChart = React.memo(({
  startDate,
  endDate,
  showWeather,
  onWeatherDataChange
}) => {
  console.log('WeatherChart render:', { startDate, endDate, showWeather });

  // Calculer les dates pour la météo
  const weatherStartDate = React.useMemo(() => {
    if (startDate) {
      return new Date(startDate);
    }
    return null;
  }, [startDate]);

  const weatherEndDate = React.useMemo(() => {
    if (endDate) {
      return new Date(endDate);
    } else if (startDate) {
      const nextDay = new Date(startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      return nextDay;
    }
    return null;
  }, [startDate, endDate]);

  // Hook pour les données météo
  const { weatherData, loading: weatherLoading, error: weatherError, fetchWeatherData } = useWeatherData(weatherStartDate, weatherEndDate);

  // Référence pour éviter les rechargements inutiles
  const lastFetchRef = React.useRef({ startDate: null, endDate: null, showWeather: false });

  // Charger les données météo seulement si nécessaire
  React.useEffect(() => {
    const current = {
      startDate: weatherStartDate?.getTime(),
      endDate: weatherEndDate?.getTime(),
      showWeather
    };

    const shouldFetch = showWeather && (
      current.startDate !== lastFetchRef.current.startDate ||
      current.endDate !== lastFetchRef.current.endDate ||
      (!lastFetchRef.current.showWeather && showWeather)
    );

    if (shouldFetch) {
      console.log('Fetching weather data:', current);
      lastFetchRef.current = current;
      fetchWeatherData(weatherStartDate, weatherEndDate);
    }
  }, [showWeather, weatherStartDate, weatherEndDate, fetchWeatherData]);

  // Communiquer les données au parent
  React.useEffect(() => {
    if (onWeatherDataChange) {
      onWeatherDataChange({
        weatherData,
        weatherLoading,
        weatherError
      });
    }
  }, [weatherData, weatherLoading, weatherError, onWeatherDataChange]);

  // Ce composant ne rend rien visuellement
  return null;
});

WeatherChart.displayName = 'WeatherChart';

export default WeatherChart;
