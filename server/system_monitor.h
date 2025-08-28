#ifndef SYSTEM_MONITOR_H
#define SYSTEM_MONITOR_H

#include <time.h>
#include <stdbool.h>

#define MAX_READINGS_HISTORY 100  // Garder max 100 dernières lectures

// Structure pour l'état d'un device
typedef struct {
    int sensor_id;
    int room_id;
    char room_name[64];
    time_t last_seen;
    double last_temperature;
    double last_humidity;
    int readings_count_last_hour;
    
    // Historique pour calcul fenêtre glissante
    time_t reading_timestamps[MAX_READINGS_HISTORY];
    int reading_history_index;
    int reading_history_count;
    
    bool is_online;
    char status[16]; // "online", "warning", "offline"
} DeviceStatus;

// Structure pour l'état global du système
typedef struct {
    int total_devices;
    int online_devices;
    int warning_devices;
    int offline_devices;
    time_t last_update;
    DeviceStatus *devices;
    char global_status[16]; // "healthy", "warning", "critical"
} SystemHealth;

// Fonctions principales
int monitor_init(void);
void monitor_cleanup(void);
void monitor_update_device(int sensor_id, int room_id, double temperature, double humidity);
SystemHealth* monitor_get_system_health(void);
char* monitor_get_json_status(void);

// Configuration
#define MAX_DEVICES 10
#define OFFLINE_THRESHOLD_MINUTES 30
#define WARNING_THRESHOLD_MINUTES 10

#endif // SYSTEM_MONITOR_H
