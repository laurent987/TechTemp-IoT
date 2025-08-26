#include "system_monitor.h"
#include "cJSON.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static SystemHealth system_health;
static bool monitor_initialized = false;

// Table de correspondance room_id -> nom (à adapter selon vos rooms)
static const struct {
    int room_id;
    const char* name;
} room_names[] = {
    {1, "salon"},
    {2, "eetkamer"},
    {3, "bedroom"},
    {4, "bureau_achter"},
    {0, NULL} // terminateur
};

const char* get_room_name(int room_id) {
    for (int i = 0; room_names[i].name != NULL; i++) {
        if (room_names[i].room_id == room_id) {
            return room_names[i].name;
        }
    }
    static char fallback[32];
    snprintf(fallback, sizeof(fallback), "Room %d", room_id);
    return fallback;
}

int find_device_index(int sensor_id) {
    for (int i = 0; i < system_health.total_devices; i++) {
        if (system_health.devices[i].sensor_id == sensor_id) {
            return i;
        }
    }
    return -1;
}

void update_device_status(DeviceStatus *device) {
    time_t now = time(NULL);
    double minutes_since_last = difftime(now, device->last_seen) / 60.0;
    
    if (minutes_since_last > OFFLINE_THRESHOLD_MINUTES) {
        strcpy(device->status, "offline");
        device->is_online = false;
    } else if (minutes_since_last > WARNING_THRESHOLD_MINUTES) {
        strcpy(device->status, "warning");
        device->is_online = true;
    } else {
        strcpy(device->status, "online");
        device->is_online = true;
    }
}

void update_global_status(void) {
    system_health.online_devices = 0;
    system_health.warning_devices = 0;
    system_health.offline_devices = 0;
    
    for (int i = 0; i < system_health.total_devices; i++) {
        update_device_status(&system_health.devices[i]);
        
        if (strcmp(system_health.devices[i].status, "online") == 0) {
            system_health.online_devices++;
        } else if (strcmp(system_health.devices[i].status, "warning") == 0) {
            system_health.warning_devices++;
        } else {
            system_health.offline_devices++;
        }
    }
    
    // Déterminer statut global
    if (system_health.offline_devices > 0) {
        strcpy(system_health.global_status, "critical");
    } else if (system_health.warning_devices > 0) {
        strcpy(system_health.global_status, "warning");
    } else {
        strcpy(system_health.global_status, "healthy");
    }
    
    system_health.last_update = time(NULL);
}

int monitor_init(void) {
    if (monitor_initialized) return 0;
    
    memset(&system_health, 0, sizeof(SystemHealth));
    system_health.devices = malloc(MAX_DEVICES * sizeof(DeviceStatus));
    if (!system_health.devices) {
        return -1;
    }
    
    strcpy(system_health.global_status, "healthy");
    system_health.last_update = time(NULL);
    monitor_initialized = true;
    
    printf("[Monitor] System monitor initialized\n");
    return 0;
}

void monitor_cleanup(void) {
    if (monitor_initialized) {
        free(system_health.devices);
        monitor_initialized = false;
        printf("[Monitor] System monitor cleaned up\n");
    }
}

void monitor_update_device(int sensor_id, int room_id, double temperature, double humidity) {
    if (!monitor_initialized) return;
    
    time_t now = time(NULL);
    int device_index = find_device_index(sensor_id);
    
    if (device_index == -1) {
        // Nouveau device
        if (system_health.total_devices >= MAX_DEVICES) {
            printf("[Monitor] Warning: Max devices reached\n");
            return;
        }
        
        device_index = system_health.total_devices++;
        DeviceStatus *device = &system_health.devices[device_index];
        
        device->sensor_id = sensor_id;
        device->room_id = room_id;
        strncpy(device->room_name, get_room_name(room_id), sizeof(device->room_name) - 1);
        device->readings_count_last_hour = 0;
        
        printf("[Monitor] New device registered: sensor_%d in %s\n", sensor_id, device->room_name);
    }
    
    // Mettre à jour les données du device
    DeviceStatus *device = &system_health.devices[device_index];
    device->last_seen = now;
    device->last_temperature = temperature;
    device->last_humidity = humidity;
    device->readings_count_last_hour++; // Simplifié pour l'instant
    
    // Mettre à jour le statut global
    update_global_status();
}

SystemHealth* monitor_get_system_health(void) {
    if (!monitor_initialized) return NULL;
    update_global_status();
    return &system_health;
}

char* monitor_get_json_status(void) {
    if (!monitor_initialized) return NULL;
    
    SystemHealth *health = monitor_get_system_health();
    if (!health) return NULL;
    
    cJSON *root = cJSON_CreateObject();
    cJSON *summary = cJSON_CreateObject();
    cJSON *devices = cJSON_CreateArray();
    cJSON *alerts = cJSON_CreateArray(); // Ajouter tableau d'alertes vide pour compatibilité
    
    // Informations globales
    cJSON_AddStringToObject(root, "global_status", health->global_status);
    cJSON_AddNumberToObject(root, "timestamp", (double)health->last_update);
    
    // Résumé
    cJSON_AddNumberToObject(summary, "total_devices", health->total_devices);
    cJSON_AddNumberToObject(summary, "online", health->online_devices);
    cJSON_AddNumberToObject(summary, "warning", health->warning_devices);
    cJSON_AddNumberToObject(summary, "offline", health->offline_devices);
    cJSON_AddItemToObject(root, "summary", summary);
    
    // Devices individuels
    for (int i = 0; i < health->total_devices; i++) {
        DeviceStatus *device = &health->devices[i];
        cJSON *device_json = cJSON_CreateObject();
        
        cJSON_AddNumberToObject(device_json, "sensor_id", device->sensor_id);
        cJSON_AddNumberToObject(device_json, "room_id", device->room_id);
        cJSON_AddStringToObject(device_json, "room_name", device->room_name);
        cJSON_AddStringToObject(device_json, "status", device->status);
        cJSON_AddNumberToObject(device_json, "last_seen", (double)device->last_seen);
        cJSON_AddNumberToObject(device_json, "last_temperature", device->last_temperature);
        cJSON_AddNumberToObject(device_json, "last_humidity", device->last_humidity);
        cJSON_AddNumberToObject(device_json, "readings_last_hour", device->readings_count_last_hour);
        
        // Calcul minutes depuis dernière lecture
        double minutes_since = difftime(time(NULL), device->last_seen) / 60.0;
        cJSON_AddNumberToObject(device_json, "minutes_since_last_reading", minutes_since);
        
        cJSON_AddItemToArray(devices, device_json);
    }
    cJSON_AddItemToObject(root, "devices", devices);
    
    // Ajouter le tableau d'alertes (vide pour l'instant, mais maintient la compatibilité)
    cJSON_AddItemToObject(root, "alerts", alerts);
    
    char *json_string = cJSON_Print(root);
    cJSON_Delete(root);
    
    return json_string;
}
