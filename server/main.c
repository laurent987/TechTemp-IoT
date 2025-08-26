#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include "mqtt_transport.h"
#include "sqlite3.h"
#include "cJSON.h"
#include "db.h"
#include "app_context.h"
#include <time.h>
#include "helpers.h"
#include "db_firestore.h"
#include "system_monitor.h"
#include "http_server.h"



volatile sig_atomic_t keepRunning = 1;
static HttpServer http_server;

void handleSignal(int signal) {
    keepRunning = 0;
    printf("\n[Main] Shutdown signal received\n");
}

// Callback MQTT: message reçu
void on_mqtt_msg(const char* topic, const void* payload, size_t len, void* user) {
    AppContext *appContext = (AppContext*)user;
    char* msg = malloc(len+1);
    memcpy(msg, payload, len);
    msg[len] = '\0';
    cJSON *json = cJSON_Parse(msg);
    free(msg);
    if (!json) return;
    const cJSON *sensor_id_json = cJSON_GetObjectItemCaseSensitive(json, "sensor_id");
    const cJSON *room_id_json = cJSON_GetObjectItemCaseSensitive(json, "room_id");
    const cJSON *temperature_json = cJSON_GetObjectItemCaseSensitive(json, "temperature");
    const cJSON *humidity_json = cJSON_GetObjectItemCaseSensitive(json, "humidity");
    // Firestore + Monitor
    if (cJSON_IsNumber(sensor_id_json) && cJSON_IsNumber(temperature_json) && cJSON_IsNumber(humidity_json)) {
        int sensor_id = sensor_id_json->valueint;
        double temperature = temperature_json->valuedouble;
        double humidity = humidity_json->valuedouble;
        int room_id = room_id_json->valueint;
        char timestamp[32];
        time_t now = time(NULL);
        strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", gmtime(&now));
        
        // Mettre à jour le monitoring temps réel
        monitor_update_device(sensor_id, room_id, temperature, humidity);
        
        if (appContext->use_firestore) {
            extern int post_reading_to_firestore(int sensor_id, int room_id, double temperature, double humidity, const char *timestamp, const char *firestore_url, const char *auth_token);
            post_reading_to_firestore(sensor_id, room_id, temperature, humidity, timestamp, appContext->firestore_url, appContext->auth_token);
        }
    }
    cJSON_Delete(json);
}

int main(int argc, char *argv[]) {
    printf("[Main] TechTemp Server with Real-time Monitoring starting...\n");
    
    // Initialiser le système de monitoring
    if (monitor_init() != 0) {
        fprintf(stderr, "Failed to initialize system monitor\n");
        return 1;
    }
    
    // Initialiser le serveur HTTP
    if (http_server_init(&http_server, 8080) != 0) {
        fprintf(stderr, "Failed to initialize HTTP server\n");
        monitor_cleanup();
        return 1;
    }
    
    AppContext *appContext = malloc(sizeof(AppContext));
    appContext->use_firestore = 1;
    db_firestore_init(&(appContext->firestore_url), &(appContext->auth_token));

    // Config MQTT
    const char* topics[] = { "weather", NULL };
    int qos[] = { 1 };
    MqttConfig mqtt_cfg = {
        .address = "tcp://localhost:1883",
        .client_id = "techtemp_server",
        .keepalive_sec = 20,
        .clean_session = 1,
        .automatic_reconnect = 1,
        .min_retry_sec = 1,
        .max_retry_sec = 30,
        .username = NULL,
        .password = NULL,
        .will = NULL,
        .persist = MQTT_PERSIST_NONE,
        .persist_dir = NULL,
        .init_topics = topics,
        .init_qos = qos,
        .on_msg = on_mqtt_msg,
        .on_conn_lost = NULL,
        .on_delivered = NULL,
        .user = appContext,
        .run_background_thread = 1,
        .loop_interval_ms = 20
    };

    if (mqtt_init(&mqtt_cfg) != 0) {
        fprintf(stderr, "MQTT init failed\n");
        free(appContext);
        monitor_cleanup();
        return 1;
    }

    // Démarrer le serveur HTTP
    if (http_server_start(&http_server) != 0) {
        fprintf(stderr, "Failed to start HTTP server\n");
        mqtt_cleanup();
        free(appContext);
        monitor_cleanup();
        return 1;
    }
    
    printf("[Main] All services started successfully!\n");
    printf("[Main] - MQTT broker: localhost:1883\n");
    printf("[Main] - HTTP API: http://localhost:8080\n");
    printf("[Main] - Monitoring API: http://localhost:8080/api/system/health\n");

    signal(SIGINT, handleSignal);
    while (keepRunning) {
        sleep_ms(1000); // Check every second
    }

    // Nettoyage propre
    printf("[Main] Shutting down services...\n");
    http_server_stop(&http_server);
    mqtt_cleanup();
    monitor_cleanup();
    sqlite3_close(appContext->db);
    free(appContext);
    printf("[Main] Application terminated.\n");
    return 0;
}
