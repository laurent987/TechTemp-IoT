// Fonction Cloud pour récupérer la liste des rooms
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

exports.getRooms = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const snapshot = await db.collection("rooms").get();
      const rooms = [];
      snapshot.forEach(doc => {
        rooms.push({ id: doc.id, ...doc.data() });
      });
      res.json(rooms);
    } catch (error) {
      console.error("Erreur fonction getRooms:", error);
      res.status(500).send("Erreur serveur");
    }
  });
});


exports.getReadings = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Paramètres optionnels pour filtrer
      // ATTENTION: on récupère room_id et rooms_id !
      const { startDate, endDate, room_id, rooms_id } = req.query;

      let readingsRef = db.collection("readings");

      // Supporte room_id unique (string/number) ou rooms_id multiple (array)
      if (rooms_id) {
        // Si rooms_id est passé en query (ex: rooms_id=1,2,3)
        let roomsArray = rooms_id;
        if (typeof rooms_id === 'string') {
          roomsArray = rooms_id.split(',').map(s => Number(s));
        }
        // Firestore where in accepte max 10 valeurs
        if (roomsArray.length > 0 && roomsArray.length <= 10) {
          readingsRef = readingsRef.where("room_id", "in", roomsArray);
        }
      } else if (room_id) {
        const roomIdValue = typeof room_id === 'string' ? Number(room_id) : room_id;
        readingsRef = readingsRef.where("room_id", "==", roomIdValue);
      }

      if (startDate) {
        readingsRef = readingsRef.where("timestamp", ">=", new Date(startDate));
      }
      if (endDate) {
        readingsRef = readingsRef.where("timestamp", "<=", new Date(endDate));
      }

      readingsRef = readingsRef.limit(1000);

      const snapshot = await readingsRef.get();
      const readings = [];

      snapshot.forEach(doc => {
        readings.push(doc.data());
      });

      res.json(readings);
    } catch (error) {
      console.error("Erreur fonction getReadings:", error);
      res.status(500).send("Erreur serveur");
    }
  });
});

exports.getRoomStatsByDate = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: "Le paramètre 'date' est requis (format: YYYY-MM-DD)" });
      }

      // Créer les timestamps de début et fin de journée
      const startDate = new Date(date + 'T00:00:00.000Z');
      const endDate = new Date(date + 'T23:59:59.999Z');

      console.log(`Analyse des enregistrements du ${date} (${startDate.toISOString()} à ${endDate.toISOString()})`);

      // Récupérer tous les enregistrements de la date donnée
      const readingsSnapshot = await db.collection("readings")
        .where("timestamp", ">=", startDate)
        .where("timestamp", "<=", endDate)
        .get();      // Compter les enregistrements par room_id
      const roomStats = {};
      readingsSnapshot.forEach(doc => {
        const data = doc.data();
        const roomId = data.room_id;

        if (!roomStats[roomId]) {
          roomStats[roomId] = {
            room_id: roomId,
            sensor_id: data.sensor_id, // Ajouter le sensor_id
            count: 0,
            firstRecord: data.timestamp,
            lastRecord: data.timestamp
          };
        }

        roomStats[roomId].count++;

        // Mettre à jour les timestamps (gérer les Firestore Timestamps)
        const currentTimestamp = data.timestamp;
        const firstTimestamp = roomStats[roomId].firstRecord;
        const lastTimestamp = roomStats[roomId].lastRecord;

        // Convertir en millisecondes pour la comparaison
        const currentMs = currentTimestamp.toDate ? currentTimestamp.toDate().getTime() : new Date(currentTimestamp).getTime();
        const firstMs = firstTimestamp.toDate ? firstTimestamp.toDate().getTime() : new Date(firstTimestamp).getTime();
        const lastMs = lastTimestamp.toDate ? lastTimestamp.toDate().getTime() : new Date(lastTimestamp).getTime();

        if (currentMs < firstMs) {
          roomStats[roomId].firstRecord = currentTimestamp;
        }
        if (currentMs > lastMs) {
          roomStats[roomId].lastRecord = currentTimestamp;
        }
      });

      // Récupérer les noms des rooms depuis la collection rooms
      const roomsSnapshot = await db.collection("rooms").get();
      const roomsData = {};
      roomsSnapshot.forEach(doc => {
        const data = doc.data();
        // Supposer que room_id est stocké comme field dans le document room
        if (data.id !== undefined) {
          roomsData[data.id] = {
            name: data.name || `Room ${data.room_id}`,
          };
        }
      });

      // Combiner les statistiques avec les informations des rooms
      const results = Object.values(roomStats).map(stat => {
        // Convertir les timestamps Firestore en Date JavaScript si nécessaire
        const firstRecordDate = stat.firstRecord.toDate ? stat.firstRecord.toDate() : new Date(stat.firstRecord);
        const lastRecordDate = stat.lastRecord.toDate ? stat.lastRecord.toDate() : new Date(stat.lastRecord);

        return {
          room_id: stat.room_id,
          sensor_id: stat.sensor_id,
          room_name: roomsData[stat.room_id]?.name || `Room ${stat.room_id}`,
          location: roomsData[stat.room_id]?.location || '',
          record_count: stat.count,
          first_record: firstRecordDate.toISOString(),
          last_record: lastRecordDate.toISOString(),
          duration_hours: ((lastRecordDate - firstRecordDate) / (1000 * 60 * 60)).toFixed(2)
        };
      }).sort((a, b) => b.record_count - a.record_count); // Trier par nombre d'enregistrements décroissant

      const response = {
        date: date,
        total_records: readingsSnapshot.size,
        rooms_active: results.length,
        room_statistics: results
      };

      console.log(`Trouvé ${readingsSnapshot.size} enregistrements pour ${results.length} rooms actives`);
      res.json(response);

    } catch (error) {
      console.error("Erreur fonction getRoomStatsByDate:", error);
      res.status(500).json({
        error: "Erreur serveur",
        details: error.message
      });
    }
  });
});

exports.addReading = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      // Accepter uniquement les requêtes POST
      if (req.method !== 'POST') {
        return res.status(405).json({ error: "Méthode non autorisée" });
      }

      const { sensor_id, room_id, temperature, humidity, timestamp } = req.body;

      // Validation des données
      if (sensor_id === undefined || room_id === undefined ||
        temperature === undefined || humidity === undefined) {
        return res.status(400).json({
          error: "Données manquantes",
          required: ["sensor_id", "room_id", "temperature", "humidity"]
        });
      }

      // Créer le document avec timestamp automatique si non fourni
      const readingData = {
        sensor_id: Number(sensor_id),
        room_id: Number(room_id),
        temperature: Number(temperature),
        humidity: Number(humidity),
        timestamp: timestamp ? new Date(timestamp) : new Date()
      };

      // Ajouter à Firestore
      await db.collection("readings").add(readingData);

      console.log(`[Firestore] Data added successfully | room_id=${room_id} | sensor_id=${sensor_id} | timestamp=${readingData.timestamp.toISOString()}`);

      res.status(200).json({
        success: true,
        message: "Lecture ajoutée avec succès",
        data: readingData
      });

    } catch (error) {
      console.error("Erreur fonction addReading:", error);
      res.status(500).json({
        error: "Erreur serveur",
        details: error.message
      });
    }
  });
});

exports.getSystemHealth = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Récupérer les données de la dernière heure
      const recentReadings = await db.collection("readings")
        .where("timestamp", ">=", oneHourAgo)
        .get();

      // Récupérer les données des dernières 24h pour comparaison
      const dayReadings = await db.collection("readings")
        .where("timestamp", ">=", oneDayAgo)
        .get();

      // Analyser par sensor/room
      const deviceStats = {};
      const alerts = [];

      // Analyser les données récentes
      recentReadings.forEach(doc => {
        const data = doc.data();
        const deviceKey = `sensor_${data.sensor_id}_room_${data.room_id}`;

        if (!deviceStats[deviceKey]) {
          deviceStats[deviceKey] = {
            sensor_id: data.sensor_id,
            room_id: data.room_id,
            recent_count: 0,
            last_seen: null,
            avg_temperature: 0,
            avg_humidity: 0,
            temp_readings: [],
            humidity_readings: []
          };
        }

        const stat = deviceStats[deviceKey];
        stat.recent_count++;
        stat.temp_readings.push(data.temperature);
        stat.humidity_readings.push(data.humidity);

        const readingTime = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        if (!stat.last_seen || readingTime > stat.last_seen) {
          stat.last_seen = readingTime;
        }
      });

      // Calculer moyennes et détecter anomalies
      Object.keys(deviceStats).forEach(deviceKey => {
        const stat = deviceStats[deviceKey];

        // Calculer moyennes
        stat.avg_temperature = stat.temp_readings.reduce((a, b) => a + b, 0) / stat.temp_readings.length;
        stat.avg_humidity = stat.humidity_readings.reduce((a, b) => a + b, 0) / stat.humidity_readings.length;

        // Déterminer le statut
        const minutesSinceLastSeen = stat.last_seen ? (now - stat.last_seen) / (1000 * 60) : Infinity;

        if (minutesSinceLastSeen > 30) {
          stat.status = "offline";
          stat.status_color = "red";
          alerts.push({
            type: "device_offline",
            severity: "critical",
            device: deviceKey,
            message: `Capteur ${stat.sensor_id} (room ${stat.room_id}) hors ligne depuis ${Math.round(minutesSinceLastSeen)} min`,
            last_seen: stat.last_seen
          });
        } else if (minutesSinceLastSeen > 10) {
          stat.status = "warning";
          stat.status_color = "yellow";
          alerts.push({
            type: "device_slow",
            severity: "warning",
            device: deviceKey,
            message: `Capteur ${stat.sensor_id} (room ${stat.room_id}) données lentes (${Math.round(minutesSinceLastSeen)} min)`,
            last_seen: stat.last_seen
          });
        } else {
          stat.status = "online";
          stat.status_color = "green";
        }

        // Détecter valeurs anormales
        if (stat.avg_temperature < 5 || stat.avg_temperature > 40) {
          alerts.push({
            type: "temperature_anomaly",
            severity: "warning",
            device: deviceKey,
            message: `Température anormale: ${stat.avg_temperature.toFixed(1)}°C`,
            value: stat.avg_temperature
          });
        }

        if (stat.avg_humidity < 10 || stat.avg_humidity > 90) {
          alerts.push({
            type: "humidity_anomaly",
            severity: "warning",
            device: deviceKey,
            message: `Humidité anormale: ${stat.avg_humidity.toFixed(1)}%`,
            value: stat.avg_humidity
          });
        }

        // Nettoyer les arrays pour la réponse
        delete stat.temp_readings;
        delete stat.humidity_readings;
      });

      // Récupérer les noms des rooms
      const roomsSnapshot = await db.collection("rooms").get();
      const roomsData = {};
      roomsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.id !== undefined) {
          roomsData[data.id] = {
            name: data.name || `Room ${data.id}`,
            location: data.location || ''
          };
        }
      });

      // Enrichir avec les noms des rooms
      Object.keys(deviceStats).forEach(deviceKey => {
        const stat = deviceStats[deviceKey];
        const roomInfo = roomsData[stat.room_id];
        stat.room_name = roomInfo?.name || `Room ${stat.room_id}`;
        stat.location = roomInfo?.location || '';
      });

      // Calculer statistiques globales
      const totalDevices = Object.keys(deviceStats).length;
      const onlineDevices = Object.values(deviceStats).filter(d => d.status === "online").length;
      const warningDevices = Object.values(deviceStats).filter(d => d.status === "warning").length;
      const offlineDevices = Object.values(deviceStats).filter(d => d.status === "offline").length;

      let globalStatus = "healthy";
      let globalStatusColor = "green";

      if (offlineDevices > 0) {
        globalStatus = "critical";
        globalStatusColor = "red";
      } else if (warningDevices > 0) {
        globalStatus = "warning";
        globalStatusColor = "yellow";
      }

      const response = {
        timestamp: now.toISOString(),
        global_status: globalStatus,
        global_status_color: globalStatusColor,
        summary: {
          total_devices: totalDevices,
          online: onlineDevices,
          warning: warningDevices,
          offline: offlineDevices
        },
        data_flow: {
          readings_last_hour: recentReadings.size,
          readings_last_24h: dayReadings.size,
          avg_readings_per_hour: Math.round(dayReadings.size / 24)
        },
        devices: Object.values(deviceStats),
        alerts: alerts.sort((a, b) => {
          const severityOrder = { critical: 3, warning: 2, info: 1 };
          return severityOrder[b.severity] - severityOrder[a.severity];
        })
      };

      console.log(`Health check completed: ${totalDevices} devices, status: ${globalStatus}`);
      res.json(response);

    } catch (error) {
      console.error("Erreur fonction getSystemHealth:", error);
      res.status(500).json({
        error: "Erreur serveur",
        details: error.message
      });
    }
  });
});

