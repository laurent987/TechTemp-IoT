import { useEffect, useState } from 'react';
import { useDeviceData } from '../data/hooks/useDeviceData';
import { useDevices } from '../data/hooks/useDevices';

/**
 * Hook wrapper pour compatibilité avec le code existant
 * Version moderne du hook useReadingsData utilisant la nouvelle architecture
 */
export const useReadingsDataNew = ({ startDate, endDate }) => {
  const { devices, loading: devicesLoading, error: devicesError } = useDevices();
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Traiter les devices pour en extraire les rooms
  const rooms = devices
    .filter(device => device.room)
    .reduce((acc, device) => {
      if (!acc.some(room => room.id === device.room)) {
        acc.push({ id: device.room, name: device.room });
      }
      return acc;
    }, []);

  // Définir les rooms sélectionnées par défaut
  useEffect(() => {
    if (rooms.length > 0 && selectedRooms.length === 0) {
      setSelectedRooms(rooms.map(r => r.id));
    }
  }, [rooms, selectedRooms.length]);

  // Définir une fonction pour obtenir les données historiques de tous les appareils
  // dans les rooms sélectionnées
  useEffect(() => {
    if (!startDate || !endDate || selectedRooms.length === 0 || devicesLoading) {
      return;
    }

    const fetchHistoricalData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Filtrer les appareils par rooms sélectionnées
        const filteredDevices = devices.filter(device => 
          selectedRooms.includes(device.room)
        );

        // Créer des promesses pour chaque appareil
        const promises = filteredDevices.map(async device => {
          const { data: deviceData } = useDeviceData(device.id, {
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString()
          });
          
          // Transformer les données pour correspondre au format attendu
          return deviceData.map(reading => ({
            timestamp: new Date(reading.timestamp).getTime(),
            date: new Date(reading.timestamp).toISOString().slice(0, 10),
            time: new Date(reading.timestamp).toTimeString().slice(0, 5),
            temperature: reading.temperature,
            humidity: reading.humidity,
            room: device.room,
            room_id: device.room
          }));
        });

        // Attendre toutes les promesses et fusionner les résultats
        const results = await Promise.all(promises);
        const combinedData = results.flat().sort((a, b) => a.timestamp - b.timestamp);
        
        setData(combinedData);
      } catch (err) {
        setError(`Erreur lors de la récupération des données: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [startDate, endDate, selectedRooms, devices, devicesLoading]);

  return {
    rooms,
    selectedRooms,
    setSelectedRooms,
    data,
    loading: loading || devicesLoading,
    error: error || devicesError
  };
};
