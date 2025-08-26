#!/bin/bash

echo "🎛️ TechTemp - Déclencheur de Capture à la Demande"
echo "================================================="

BROKER_IP="192.168.0.42"
COMMAND_TOPIC="weather/command"

# Vérifier que mosquitto_pub est disponible
if ! command -v mosquitto_pub &> /dev/null; then
    echo "❌ mosquitto_pub not found. Install with: brew install mosquitto"
    exit 1
fi

echo "📡 Broker MQTT: $BROKER_IP:1883"
echo "📢 Topic: $COMMAND_TOPIC"
echo ""

# Menu des options
echo "Choisissez une action:"
echo "1) Capturer données du Sensor 1 (eetkamer)"
echo "2) Capturer données du Sensor 3 (bureau_achter)"  
echo "3) Capturer données de TOUS les capteurs"
echo "4) Test custom"
echo ""

read -p "Votre choix (1-4): " choice

case $choice in
    1)
        echo "🌡️ Déclenchement capture Sensor 1..."
        mosquitto_pub -h $BROKER_IP -t $COMMAND_TOPIC -m '{
            "action": "capture",
            "sensor_id": 1,
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "requested_by": "manual"
        }'
        echo "✅ Commande envoyée pour Sensor 1"
        ;;
    2)
        echo "🌡️ Déclenchement capture Sensor 3..."
        mosquitto_pub -h $BROKER_IP -t $COMMAND_TOPIC -m '{
            "action": "capture", 
            "sensor_id": 3,
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "requested_by": "manual"
        }'
        echo "✅ Commande envoyée pour Sensor 3"
        ;;
    3)
        echo "🌡️ Déclenchement capture TOUS les capteurs..."
        mosquitto_pub -h $BROKER_IP -t $COMMAND_TOPIC -m '{
            "action": "capture",
            "sensor_id": "all", 
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "requested_by": "manual"
        }'
        echo "✅ Commande envoyée pour TOUS les capteurs"
        ;;
    4)
        read -p "Sensor ID: " sensor_id
        echo "🌡️ Déclenchement capture Sensor $sensor_id..."
        mosquitto_pub -h $BROKER_IP -t $COMMAND_TOPIC -m '{
            "action": "capture",
            "sensor_id": '$sensor_id',
            "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
            "requested_by": "manual"
        }'
        echo "✅ Commande envoyée pour Sensor $sensor_id"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

echo ""
echo "⏱️ Attendez quelques secondes puis vérifiez:"
echo "🔍 API Monitoring: curl http://$BROKER_IP:8080/api/system/health | jq ."
echo "📊 Dashboard React: http://localhost:3000 (mode Temps Réel)"
