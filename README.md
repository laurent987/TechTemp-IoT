# 🌡️ TechTemp - Système IoT de Monitoring Thermique

Système complet de monitoring IoT avec capteurs de température/humidité, serveur central, et dashboard web temps réel.

## 🏗️ Architecture

```
📁 TechTemp IoT System
├── 🏠 server/          # Serveur central (Raspberry Pi)
├── 📡 client/          # Clients IoT (capteurs AHT20)
├── 🌐 web/             # Dashboard React temps réel
├── ⚙️ commun/          # Code partagé
├── 🔧 driver/          # Drivers capteurs
├── 📋 config_file/     # Configurations systèmes
└── 🚀 deploy.sh        # Script de déploiement automatique
```

## ✨ Fonctionnalités

### 🎯 **Monitoring Hybride**
- **📊 Mode Firebase** : Historique et moyennes sur 1 heure
- **⚡ Mode Temps Réel** : Données instantanées via API REST
- **🔄 Basculement** : Switch en un clic entre les deux modes

### 🏠 **Infrastructure IoT**
- **📡 Capteurs** : AHT20 (température + humidité)
- **🖥️ Serveur Central** : Raspberry Pi avec MQTT + HTTP API
- **📱 Clients** : Captures automatiques (5 min) + à la demande
- **☁️ Stockage** : Firebase Firestore + SQLite local

### 🎛️ **Capture à la Demande**
- **⚡ Instantané** : Déclencher une mesure via MQTT
- **🎯 Ciblage** : Capteur spécifique ou tous à la fois
- **📊 Monitoring** : Données apparaissent immédiatement dans le dashboard

## 🚀 Installation

### 1. **Serveur Central** (Raspberry Pi)
```bash
./deploy.sh --run-remote-make server
```

### 2. **Clients IoT** (Raspberry Pi avec capteurs)
```bash
# Pour le client à l'adresse 192.168.0.134
./deploy.sh --run-remote-make client 134

# Pour le client à l'adresse 192.168.0.202  
./deploy.sh --run-remote-make client 202
```

### 3. **Dashboard Web**
```bash
cd web
npm install
npm start
```

## 📊 Utilisation

### **Dashboard Web**
- **URL** : http://localhost:3000
- **Modes** : 
  - ☁️ **Firebase** : Moyennes historiques
  - ⚡ **Temps Réel** : Données instantanées
- **Auto-refresh** : Actualisation automatique (5s)

### **Capture à la Demande**
```bash
# Script interactif
./trigger_capture.sh

# Commande directe MQTT
mosquitto_pub -h 192.168.0.42 -t weather/command -m '{"action": "capture", "sensor_id": 1}'
```

### **APIs Disponibles**
- **Santé système** : `http://192.168.0.42:8080/api/system/health`
- **Status global** : `http://192.168.0.42:8080/api/system/status`

## 🎯 Capteurs Configurés

| Sensor ID | Room ID | Nom | Adresse IP |
|-----------|---------|-----|------------|
| 1 | 2 | eetkamer | 192.168.0.134 |
| 3 | 4 | bureau_achter | 192.168.0.202 |

## 🔧 Configuration

### **Client IoT** (`surveillance.conf`)
```properties
BROKER_IP=192.168.0.42
SENSOR_ID=1
ROOM_ID=2
```

### **Serveur Central** 
- **MQTT Broker** : Port 1883
- **HTTP API** : Port 8080
- **Database** : SQLite + Firebase

## 📈 Monitoring

### **Status des Devices**
- 🟢 **Online** : Données reçues < 10 min
- 🟡 **Warning** : Données reçues 10-30 min  
- 🔴 **Offline** : Pas de données > 30 min

### **Alertes Automatiques**
- **Température** : < 5°C ou > 40°C
- **Humidité** : < 10% ou > 90%
- **Connectivité** : Capteurs hors ligne

## 🔄 Architecture des Données

### **Mode Firebase**
```
Capteur → MQTT → Serveur → Firebase → Dashboard
         (5 min)              ↓
                         (Moyennes 1h)
```

### **Mode Temps Réel**
```
Capteur → MQTT → Serveur → API REST → Dashboard
         (à la demande)        ↓
                         (Valeurs instantanées)
```

## 🛠️ Technologies

- **Backend** : C, MQTT (Paho), SQLite, cJSON
- **Frontend** : React, Chakra UI
- **Cloud** : Firebase Functions & Firestore
- **Hardware** : Raspberry Pi, AHT20 sensors
- **Protocoles** : MQTT, HTTP REST, I2C

## 📝 Logs

### **Serveur Central**
```bash
ssh pi@192.168.0.42 'journalctl -u techtemp.service -f'
```

### **Client IoT**
```bash
ssh pi@192.168.0.134 'journalctl -u techtemp.service -f'
```

## 🎉 Résultat

Système IoT complet avec :
- ✅ **2+ capteurs** actifs en temps réel
- ✅ **Dashboard moderne** avec double mode
- ✅ **Capture instantanée** via MQTT
- ✅ **Monitoring continu** avec alertes
- ✅ **Déploiement automatisé** en un script

---

*Développé avec ❤️ pour un monitoring IoT moderne et efficace*loiement TechTemp

Ce dossier contient tout le nécessaire pour déployer et gérer l’application TechTemp (client et serveur) sur des machines distantes (ex : Raspberry Pi).

## Prérequis
- Accès SSH à la machine distante (ex : Raspberry Pi, user `pi`)
- Bash, rsync, scp installés sur la machine locale
- Les dépendances système seront installées automatiquement côté distant

## Déploiement automatique
Le script principal est `deploy.sh`. Il permet de déployer le client ou le serveur, installer les fichiers, la configuration, et gérer le service systemd.

### Utilisation de base
```bash
./deploy.sh [options] client <dernier_octet_ip>
./deploy.sh [options] server
```

#### Options principales
- `--run-remote-make` : lance la compilation côté distant après déploiement
- `--no-setup` : ignore l’installation des paquets et la configuration
- `--ask-sudo-pass` : demande le mot de passe sudo distant si nécessaire
- `--verbose` : affiche les logs détaillés

#### Exemple pour le serveur
```bash
./deploy.sh --run-remote-make server
```

#### Exemple pour un client (IP 192.168.0.202)
```bash
./deploy.sh client 202
```

Le script vous demandera l’identifiant du capteur et de la pièce pour générer la configuration.

## Vérification du fonctionnement
Après le déploiement, vérifiez que le service tourne bien :

### Vérifier le service systemd
```bash
ssh pi@<ip> 'systemctl status techtemp.service'
```

### Voir les logs du service
```bash
ssh pi@<ip> 'journalctl -u techtemp.service -f'
```

### Voir les logs MQTT
```bash
ssh pi@<ip> 'tail -f /var/log/mosquitto/mosquitto.log'
```

### Voir les logs de surveillance
```bash
ssh pi@<ip> 'tail -f /var/log/surveillance.log'
```

## Structure du dossier
- `deploy.sh` : script principal de déploiement
- `client/`, `server/`, `commun/`, `driver/`, `config_file/` : sources et fichiers à déployer
- `config_file/techtemp.service` : unité systemd pour le service
- `document/` : documentation
- `aht20-master/` : drivers capteur AHT20

## Dépannage
- Si le dossier distant n’existe pas, il sera créé automatiquement
- Si le sudo distant n’est pas disponible, le script demandera le mot de passe
- Les logs `[DEBUG]` aident à diagnostiquer les problèmes

## Pour aller plus loin
- Modifier la configuration dans `/home/pi/Documents/techtemp/surveillance.conf` puis redémarrer le service
- Recompiler manuellement côté distant :
```bash
ssh pi@<ip>
cd /home/pi/Documents/techtemp
make -B -j$(nproc)
sudo systemctl restart techtemp.service
```

## Contact
Pour toute question ou bug, contactez l’auteur du script ou consultez la documentation dans le dossier `document/`.
