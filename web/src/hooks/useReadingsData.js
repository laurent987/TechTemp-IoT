import { useEffect, useState } from "react";
import axios from "axios";

const REACT_APP_FUNCTION_URL =
  "https://us-central1-techtemp-49c7f.cloudfunctions.net/getReadings";
const REACT_APP_ROOMS_URL =
  "https://us-central1-techtemp-49c7f.cloudfunctions.net/getRooms";

function toValidDate(val) {
  if (!val) return null;
  if (typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function useReadingsData({ startDate, endDate }) {
  const [rooms, setRooms] = useState([]); // [{id, name}]
  const [selectedRooms, setSelectedRooms] = useState([]); // [id]
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get(REACT_APP_ROOMS_URL);
        setRooms(response.data); // [{id, name}]
        if (response.data.length > 0 && selectedRooms.length === 0) {
          setSelectedRooms(response.data.map((r) => r.id)); // Sélectionne tous les ids
        }
      } catch (err) {
        setError("Erreur lors de la récupération des rooms");
      }
    };
    fetchRooms();
    // eslint-disable-next-line
  }, []);

  // Fetch readings
  useEffect(() => {
    console.log("selectedRooms:", selectedRooms);
    const safeStart = toValidDate(startDate);
    const safeEnd = toValidDate(endDate);
    if (!safeStart || !safeEnd) return;

    let cancelled = false;

    const fetchData = async () => {
      if (selectedRooms.length === 0) return;
      setLoading(true);
      setError(null);
      try {
        const params = {};
        params.startDate = safeStart.toISOString();
        params.endDate = safeEnd.toISOString();
        params.rooms_id = selectedRooms.join(','); // ENVOI DES IDs
        const response = await axios.get(REACT_APP_FUNCTION_URL, { params });
        if (cancelled) return;
        // Mapping ID → nom
        const idToName = {};
        rooms.forEach((r) => {
          idToName[r.id] = r.name;
        });
        const formattedData = response.data.map((d) => {
          const dateObj = new Date(
            d.timestamp._seconds
              ? d.timestamp._seconds * 1000
              : d.timestamp
          );
          return {
            timestamp: dateObj.getTime(),
            date: dateObj.toISOString().slice(0, 10),
            time: dateObj.toTimeString().slice(0, 5),
            temperature: d.temperature,
            humidity: d.humidity,
            room: idToName[d.room_id] || String(d.room_id),
            room_id: d.room_id,
          };
        });
        setData(formattedData);
      } catch (err) {
        if (!cancelled)
          setError("Erreur lors de la récupération des données");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, selectedRooms, rooms]); // Ajoute rooms pour (re-)mapper

  return {
    rooms, // [{id, name}]
    selectedRooms, // [id]
    setSelectedRooms,
    data,
    loading,
    error,
  };
}
