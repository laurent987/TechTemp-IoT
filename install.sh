#!/bin/bash

echo "Identifiant sensor ? (ex: 123, 456)"
read sensor_id
echo "Identifiant de la pièce ? (ex: salon, chambre, cuisine)"
read room
echo "Adresse IP du broker MQTT ? (ex: 192.168.1.100)"
read broker


sudo touch /etc/surveillance.conf
sudo sh -c "echo 'ROOM_ID=$room' > /etc/surveillance.conf"
sudo sh -c "echo 'BROKER_IP=$broker' >> /etc/surveillance.conf"
sudo sh -c "echo 'SENSOR_ID=$sensor_id' >> /etc/surveillance.conf"

echo "----- [MAJ des paquets] -----"
sudo apt update


echo "Installation des dépendances C standards..."
sudo apt install git build-essential  cmake libssl-dev vim -y

# Optionnel: Installation de la lib MQTT, par exemple via apt
echo "Installation lib mosquitto..."
sudo apt install libpaho-mqtt1.3 libpaho-mqtt-dev -y

# sudo apt install libmosquitto-dev -y

# echo "Installation du client (à adapter si vous avez votre repo/git/etc)"
# git clone https://votre-repo/pi-client.git || exit 1
# cd pi-client

make
echo "Installation terminée."

# Facultatif : Créer un service systemd pour lancer le client au démarrage
# sudo cp surveillance.service /etc/systemd/system/
# sudo systemctl enable surveillance.service
