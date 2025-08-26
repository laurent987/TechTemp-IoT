#!/bin/bash

echo "🧪 Test Script - Sending Mock MQTT Data"
echo "========================================"

# Vérifier que mosquitto_pub est disponible
if ! command -v mosquitto_pub &> /dev/null; then
    echo "❌ mosquitto_pub not found. Install with: brew install mosquitto"
    exit 1
fi

echo "📡 Sending test data to MQTT broker..."

# Simuler des données du sensor 1 (eetkamer)
mosquitto_pub -h 192.168.0.42 -t weather -m '{
    "sensor_id": 1,
    "room_id": 2,
    "temperature": 21.5,
    "humidity": 58.2
}'

echo "✅ Sent data for Sensor 1 (eetkamer)"

# Simuler des données du sensor 3 (bureau_achter)
mosquitto_pub -h 192.168.0.42 -t weather -m '{
    "sensor_id": 3,
    "room_id": 4,
    "temperature": 19.8,
    "humidity": 55.7
}'

echo "✅ Sent data for Sensor 3 (bureau_achter)"
echo ""
echo "🔍 Check the monitoring API:"
echo "curl http://192.168.0.42:8080/api/system/health | jq ."
echo ""
echo "🌐 Or check your React dashboard at http://localhost:3000"
