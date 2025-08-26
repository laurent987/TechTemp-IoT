# 🔄 Guide de Mise à Jour - Capture à la Demande

## 🎯 Objectif
Permettre aux capteurs IoT de faire des captures **à la demande** en plus des captures automatiques toutes les 5 minutes.

## 📋 Fonctionnalités ajoutées

### ✨ **Client Enhanced** (`client_enhanced.c`)
- ✅ **Captures programmées** : Toutes les 5 min (comme avant)
- 🆕 **Captures à la demande** : Via commandes MQTT
- 📡 **Topic de commande** : `weather/command`
- 🎛️ **Déclenchement** : Script `trigger_capture.sh`

### 🌐 **Monitoring temps réel amélioré**
- Les données arrivent instantanément au dashboard
- Pas besoin d'attendre 5 minutes
- Compatible avec l'existant

## 🚀 Installation

### 1. **Compiler la version enhanced**
```bash
cd /Users/user/Documents/informatique/techTemp/client
make enhanced
```

### 2. **Déployer sur vos Pi clients**

Pour chaque Pi client (ex: sensor 1) :
```bash
# Déployer les nouveaux fichiers
./deploy.sh --run-remote-make client 201

# Se connecter au Pi pour tester
ssh pi@192.168.0.201

# Vérifier que la version enhanced fonctionne
cd /home/pi/Documents/techtemp
./techtemp_enhanced

# Si ça marche, remplacer le service
sudo systemctl stop techtemp.service
sudo cp techtemp_enhanced techtemp
sudo systemctl start techtemp.service
```

### 3. **Configuration requise**

Vérifier que `/etc/surveillance.conf` pointe vers le serveur central :
```properties
SENSOR_ID=1
ROOM_ID=2
BROKER_IP=192.168.0.42  # ← IMPORTANT: Serveur central
```

## 🎛️ Utilisation

### **Déclencher une capture**
```bash
# Depuis votre machine locale
./trigger_capture.sh

# Ou manuellement pour sensor 1
mosquitto_pub -h 192.168.0.42 -t weather/command -m '{
    "action": "capture",
    "sensor_id": 1
}'
```

### **Vérifier les données**
```bash
# API temps réel
curl http://192.168.0.42:8080/api/system/health | jq .

# Dashboard React (mode Temps Réel)
# http://localhost:3000
```

## 📊 Architecture finale

```
Pi Client 1 (enhanced) ──┐
                         ├──► MQTT (192.168.0.42:1883) ──► Monitoring API ──► Dashboard
Pi Client 3 (enhanced) ──┘                                    ↓
                                                          Firebase (historique)
```

## 🔄 Flux de données

### **Automatique** (toutes les 5 min)
```
Capteur → client_enhanced → MQTT → Serveur → Firebase + Monitoring
```

### **À la demande** (instantané)
```
trigger_capture.sh → MQTT command → client_enhanced → Capture → MQTT → Monitoring temps réel
```

## ⚡ Avantages

- **🚀 Instantané** : Plus besoin d'attendre 5 minutes
- **🔄 Compatible** : Garde les captures automatiques 
- **🎛️ Flexible** : Peut déclencher un ou tous les capteurs
- **📱 Dashboard** : Données temps réel dans React
- **☁️ Historique** : Sauvegarde Firebase préservée

## 🧪 Test complet

1. **Démarrer le dashboard** : `cd web && npm start`
2. **Mode temps réel** : Cliquer "🚀 Temps Réel"
3. **Déclencher capture** : `./trigger_capture.sh`
4. **Observer** : Les données apparaissent instantanément !

La solution est prête pour vos vrais capteurs IoT ! 🎉
