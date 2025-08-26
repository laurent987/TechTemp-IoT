# 🚀 Guide de Déploiement - Monitoring Temps Réel

## 📋 Pré-requis sur le Pi (192.168.0.42)

```bash
# Installer les dépendances supplémentaires pour le monitoring
sudo apt-get update
sudo apt-get install -y libpthread-stubs0-dev

# Vérifier que les bibliothèques existantes sont présentes
sudo apt-get install -y libcjson-dev libpaho-mqtt-dev libcurl4-openssl-dev libsqlite3-dev
```

## 🔧 Déploiement

### 1. Déployer le serveur avec monitoring
```bash
./deploy.sh --run-remote-make server
```

### 2. Vérification du déploiement
```bash
# Test de connectivité et API depuis votre machine locale
./test_pi_api.sh

# Ou manuellement :
curl http://192.168.0.42:8080/api/system/health | jq .
```

### 3. Test des données MQTT (depuis votre machine)
```bash
# Envoyer des données de test
./test_mqtt_data.sh
```

## 📊 Dashboard React

### Mode Temps Réel
1. Ouvrir le dashboard React : `http://localhost:3000`
2. Aller dans l'onglet "Monitoring Système"
3. Cliquer sur le bouton "🚀 Temps Réel" 
4. Les données se rafraîchissent toutes les 5 secondes depuis le Pi

## 🔍 Debugging

### Sur le Pi (192.168.0.42)
```bash
# Logs du service
sudo journalctl -u techtemp.service -f

# Status du service
sudo systemctl status techtemp.service

# Test manuel du serveur
cd /home/pi/Documents/techtemp
./techtemp

# Test de l'API locale
curl localhost:8080/api/system/health
```

### Depuis votre machine
```bash
# Test complet
./test_pi_api.sh

# Test MQTT
mosquitto_pub -h 192.168.0.42 -t weather -m '{"sensor_id":1,"room_id":2,"temperature":22.0,"humidity":60.0}'
```

## 🌐 URLs importantes

- **MQTT Broker** : `192.168.0.42:1883`
- **API Monitoring** : `http://192.168.0.42:8080/api/system/health`
- **API Status** : `http://192.168.0.42:8080/api/system/status`
- **Dashboard React** : `http://localhost:3000` (mode Temps Réel)

## 🔄 Architecture finale

```
Capteurs IoT → MQTT (192.168.0.42:1883) → Serveur Pi → API REST (8080) → Dashboard React
                                        ↓
                                   Firebase Cloud 
                                   (historique)
```

## ⚡ Avantages du système hybride

- **Temps réel** : Monitoring instantané via API locale
- **Historique** : Données sauvées dans Firebase
- **Robustesse** : Fonctionne même si Firebase est inaccessible  
- **Performance** : Dashboard local rapide (5s vs 30s)
