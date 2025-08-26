#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <time.h>
#include <curl/curl.h>

#include "MQTTClient.h"
#include "sqlite3.h"
#include "cJSON.h"
#include "db.h"



#define ADDRESS     "tcp://localhost:1883"
#define CLIENTID    "Server_Client"
#define TOPIC_DATA_WEATHER  "weather"

typedef struct {
    sqlite3 *db; // Connexion à la base de données
} AppContext;

volatile sig_atomic_t keepRunning = 1;

void handleSignal(int signal) {
    keepRunning = 0;
}

void delivered(void *context, MQTTClient_deliveryToken dt) {
    printf("Message with token value %d delivery confirmed\n", dt);
}

int msgarrvd(void *context, char *topicName, int topicLen, MQTTClient_message *message) {
    int rc;
    char *err_msg = 0;

    char* payload = (char*)message->payload;
    cJSON *json = cJSON_Parse(payload);
    if (json == NULL) {
        const char *error_ptr = cJSON_GetErrorPtr();
        if (error_ptr != NULL) {
            fprintf(stderr, "Error before: %s\n", error_ptr);
        }
        return 1;
    }
    const cJSON *sensor_id_json = cJSON_GetObjectItemCaseSensitive(json, "sensor_id");
    const cJSON *temperature_json = cJSON_GetObjectItemCaseSensitive(json, "temperature");
    const cJSON *humidity_json = cJSON_GetObjectItemCaseSensitive(json, "humidity");

    if (!cJSON_IsNumber(sensor_id_json) || !cJSON_IsNumber(temperature_json) || !cJSON_IsNumber(humidity_json)) {
        printf("One or more required fields are missing or not correctly formatted.\n");
    } else {
        int sensor_id = sensor_id_json->valueint;
        double temperature = temperature_json->valuedouble;
        double humidity = humidity_json->valuedouble;

        // Obtenir l'heure actuelle
        time_t now = time(NULL);
        // Convertir l'heure en chaîne de caractères lisible
        char* dt = ctime(&now);

        printf("[Time] %s", dt);
        printf("[Received] Sensor ID: %d - Temperature: %.2f °C - Humidity: %.0f%%\n", sensor_id, temperature, humidity);


        // Ici, vous pouvez insérer les valeurs dans votre base de données SQLite
        // Initialiser et ouvrir la base de données
        AppContext *appContext = (AppContext*)context;
        sqlite3 *db = appContext->db;
        
        if (db == NULL) {
            fprintf(stderr, "db param is NULL %s\n", sqlite3_errmsg(db));
            exit(1);
        }

        char *sql = sqlite3_mprintf("INSERT INTO readings (sensor_id, temperature, humidity, timestamp) VALUES (%d, %f, %f, datetime('now'));", 
                                sensor_id, temperature, humidity);
    
        rc = sqlite3_exec(db, sql, 0, 0, &err_msg);
        
        if (rc != SQLITE_OK ) {
            fprintf(stderr, "SQL error: %s\n", err_msg);
            sqlite3_free(err_msg);        
        } else {
            fprintf(stdout, "[Database] New temperature and humidity data inserted successfully\n\n");
        }
        sqlite3_free(sql);
    }

    cJSON_Delete(json);
    MQTTClient_freeMessage(&message);
    MQTTClient_free(topicName);
    return 1;
}

void connlost(void *context, char *cause) {
    fprintf(stderr, "\nConnection lost\n");
    fprintf(stderr, "     cause: %s\n", cause);
}





int main(int argc, char* argv[]) {
    sqlite3 *db = NULL;

    MQTTClient client;
    MQTTClient_connectOptions conn_opts = MQTTClient_connectOptions_initializer;
    MQTTClient_create(&client, ADDRESS, CLIENTID, MQTTCLIENT_PERSISTENCE_NONE, NULL);
    conn_opts.keepAliveInterval = 20;
    conn_opts.cleansession = 1;
    int rc_mqtt;

    init_db(&db);
    create_tables(db);

    AppContext *appContext = malloc(sizeof(AppContext));
    appContext->db = db; 

    MQTTClient_setCallbacks(client, appContext, connlost, msgarrvd, delivered);

    if ((rc_mqtt = MQTTClient_connect(client, &conn_opts)) != MQTTCLIENT_SUCCESS) {
        printf("Failed to connect, return code %d\n", rc_mqtt);
        exit(EXIT_FAILURE);
    }

    printf("Subscribing to topic %s\nfor client %s using QoS%d\n\n", TOPIC_DATA_WEATHER, CLIENTID, 1);
    MQTTClient_subscribe(client, TOPIC_DATA_WEATHER, 1);





    signal(SIGINT, handleSignal);
    struct timespec req, rem;
    req.tv_sec = 0;
    req.tv_nsec = 1000L * 1000L; // 1000 microsecondes converties en nanosecondes

    while (keepRunning) {
        nanosleep(&req, &rem);
    }

    MQTTClient_disconnect(client, 10000);
    MQTTClient_destroy(&client);
    sqlite3_close(db);
    free(appContext);

    printf("Application terminated.\n");
    return 0;
}
