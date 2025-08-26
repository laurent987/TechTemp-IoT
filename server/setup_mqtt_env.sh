#!/bin/bash

# PARAMÈTRES DE CONFIGURATION
# Modifiez ces variables selon votre réseau
##########################################
IFACE="wlan0"                 # Nom de l'interface réseau (wlan0 pour WiFi, eth0 pour Ethernet)
STATIC_IP="192.168.0.42/24"   # Adresse IP statique + /masque (ex: 192.168.1.42/24)
ROUTER_IP="192.168.0.1"       # Passerelle (généralement la box ou routeur)
DNS1="1.1.1.1"                # DNS principal
DNS2="8.8.8.8"                # DNS secondaire
##########################################

echo "----- [MAJ des paquets] -----"
sudo apt update

echo "----- [Installation de Mosquitto et clients] -----"
sudo apt install -y mosquitto mosquitto-clients

echo "----- [Activation et démarrage du broker Mosquitto] -----"
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

echo "----- [Installation des outils de développement C et de la librairie client MQTT] -----"
sudo apt install -y build-essential libmosquitto-dev

echo "----- [Ouverture du port 1883 pour MQTT (optionnel/si UFW)] -----"
if command -v ufw >/dev/null 2>&1 ; then
    echo "Le firewall UFW est installé, ouverture du port 1883..."
    sudo ufw allow 1883
else
    echo "UFW n'est pas installé, pas de configuration de firewall nécessaire."
fi

echo "----- [Configuration d’une adresse IP locale fixe] -----"



if grep -q "interface $IFACE" /etc/dhcpcd.conf ; then
    echo "Une configuration statique existe déjà pour $IFACE dans /etc/dhcpcd.conf"
else
    sudo cp /etc/dhcpcd.conf /etc/dhcpcd.conf.backup

    echo "
interface $IFACE
static ip_address=$STATIC_IP
static routers=$ROUTER_IP
static domain_name_servers=$DNS1 $DNS2
" | sudo tee -a /etc/dhcpcd.conf

    echo "Redémarrage du service réseau..."
    sudo systemctl restart dhcpcd

    echo "Adresse IP $STATIC_IP assignée à l’interface $IFACE"
fi

echo "----- [Récupération de l’adresse IP du Raspberry Pi] -----"
echo "Adresse(s) IP locale(s) : "
hostname -I

echo ""
echo "======= CONFIGURATION TERMINEE ======="
echo "Mosquitto broker MQTT est opérationnel sur IP $STATIC_IP:1883."
echo "Librairie C <libmosquitto-dev> installée, prête pour la compilation de vos projets C MQTT."
echo ""
echo "Pour tester :"
echo "Terminal 1 : mosquitto_sub -h localhost -t test"
echo "Terminal 2 : mosquitto_pub -h localhost -t test -m 'hello'"
echo ""
echo "Ancien fichier de config sauvegardé sous /etc/dhcpcd.conf.backup"
echo ""
echo "Pour compiler le server : make"
echo "======================================"