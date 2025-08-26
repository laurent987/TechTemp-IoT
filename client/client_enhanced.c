/* client_enhanced.c - Version avec capture à la demande */
#include "driver_aht20.h"
#include "driver_aht20_interface.h"
#include "mqtt_transport.h"

#include <getopt.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <signal.h>
#include <stdatomic.h>
#include <inttypes.h>
#include <strings.h>
#include <ctype.h>
#include <stdint.h>

#define TOPIC_DATA        "weather"          /* topic de données */
#define TOPIC_STATUS      "weather/status"   /* topic statut online/offline */
#define TOPIC_COMMAND     "weather/command"  /* topic pour commandes */
#define QOS               1
#define INTERVAL_SEC      300               /* période entre mesures (5 min) */
#define MAX_BROKER_IP_LEN 64

/* Variables globales pour communication entre threads */
static atomic_int g_stop = 0;
static atomic_int g_capture_now = 0;  /* flag pour capture immédiate */
static uint8_t g_sensor_id = 0;
static uint8_t g_room_id = 0;

static void on_signal(int signo) { 
    (void)signo; 
    g_stop = 1; 
}

static void sleep_ms(long ms) {
    struct timespec ts;
    ts.tv_sec  = ms / 1000;
    ts.tv_nsec = (ms % 1000) * 1000000L;
    while (nanosleep(&ts, &ts) == -1) {
        continue;
    }
}

static void trim_ascii_inplace(char *s) {
    char *p = s;
    while (*p && isspace((unsigned char)*p)) p++;
    if (p != s) memmove(s, p, strlen(p) + 1);
    size_t n = strlen(s);
    while (n && isspace((unsigned char)s[n-1])) s[--n] = '\0';
}

/* Callback pour les messages MQTT reçus (commandes) */
static void on_mqtt_command(const char* topic, const void* payload, size_t len, void* user) {
    (void)user;
    
    if (strcmp(topic, TOPIC_COMMAND) != 0) return;
    
    char msg[256];
    if (len >= sizeof(msg)) len = sizeof(msg) - 1;
    memcpy(msg, payload, len);
    msg[len] = '\0';
    
    printf("[COMMAND] Received: %s\n", msg);
    
    // Parser la commande JSON simple
    if (strstr(msg, "\"action\":\"capture\"") != NULL) {
        // Vérifier si c'est pour notre capteur
        char sensor_pattern[32];
        snprintf(sensor_pattern, sizeof(sensor_pattern), "\"sensor_id\":%u", g_sensor_id);
        
        if (strstr(msg, sensor_pattern) != NULL || strstr(msg, "\"sensor_id\":\"all\"") != NULL) {
            printf("[COMMAND] Triggering immediate capture for sensor %u\n", g_sensor_id);
            g_capture_now = 1;
        }
    }
}

/* Fonction pour effectuer une capture et l'envoyer */
static int perform_capture_and_send(const char* reason) {
    float temperature = 0.0f;
    uint8_t humidity = 0;
    
    if (aht20_basic_read(&temperature, &humidity) != 0) {
        aht20_interface_debug_print("AHT20 read failed\n");
        return -1;
    }

    time_t now = time(NULL);
    char dt[32];
    strftime(dt, sizeof(dt), "%Y-%m-%d %H:%M:%S", localtime(&now));
    aht20_interface_debug_print("[%s] time: %s | temp: %.1f C | hum: %u%%\n",
                                reason, dt, temperature, humidity);

    char payload[200];
    int n = snprintf(payload, sizeof(payload),
                     "{\"sensor_id\":%u,\"room_id\":%u,"
                     "\"temperature\":%.2f,\"humidity\":%u,\"trigger\":\"%s\"}",
                     g_sensor_id, g_room_id, temperature, humidity, reason);
                     
    if (n < 0 || n >= (int)sizeof(payload)) {
        fprintf(stderr, "payload truncated\n");
        return -1;
    }

    /* Publier avec retries */
    for (int attempt = 0; attempt < 5 && !g_stop; ++attempt) {
        MqttSendStatus s = mqtt_publish(TOPIC_DATA,
                                        payload, (size_t)n,
                                        QOS, 0, 5000);
        if (s == MQTT_SEND_OK) {
            printf("[SENT] %s\n", payload);
            return 0;
        }
        if (s == MQTT_SEND_ERROR) {
            fprintf(stderr, "publish error, attempt=%d\n", attempt);
            break;
        }
        sleep_ms(200);
    }
    return -1;
}

static int load_config(uint8_t *sensor_id, uint8_t *room_id,
                       char *broker_ip, size_t ip_size) {
    if (!sensor_id || !room_id || !broker_ip || ip_size == 0) {
        fprintf(stderr, "load_config: invalid args\n");
        return -1;
    }

    FILE *file = fopen("/etc/surveillance.conf", "r");
    if (!file) {
        perror("load_config: fopen");
        return -1;
    }

    char line[512];
    broker_ip[0] = '\0';
    int have_sensor = 0, have_room = 0, have_broker = 0;

    while (fgets(line, sizeof line, file)) {
        trim_ascii_inplace(line);
        if (line[0] == '#' || line[0] == '\0') continue;

        if (strncmp(line, "SENSOR_ID=", 10) == 0) {
            char *end;
            long v = strtol(line + 10, &end, 10);
            if (end != line + 10 && v >= 0 && v <= 255) {
                *sensor_id = (uint8_t)v;
                have_sensor = 1;
            }
        } else if (strncmp(line, "ROOM_ID=", 8) == 0) {
            char *end;
            long v = strtol(line + 8, &end, 10);
            if (end != line + 8 && v >= 0 && v <= 255) {
                *room_id = (uint8_t)v;
                have_room = 1;
            }
        } else if (strncmp(line, "BROKER_IP=", 10) == 0) {
            char tmp[256];
            size_t max_copy = sizeof(tmp) - 1;
            snprintf(tmp, sizeof tmp, "%.*s", (int)max_copy, line + 10);
            tmp[max_copy] = '\0';
            trim_ascii_inplace(tmp);

            size_t L = strlen(tmp);
            if (L >= 2 && ((tmp[0] == '"' && tmp[L-1] == '"') || (tmp[0] == '\'' && tmp[L-1] == '\''))) {
                memmove(tmp, tmp + 1, L - 2);
                tmp[L - 2] = '\0';
                trim_ascii_inplace(tmp);
                L = strlen(tmp);
            }

            if (L == 0) continue;

            if (L >= 6 && (strncasecmp(tmp, "tcp://", 6) == 0 || strncasecmp(tmp, "ssl://", 6) == 0)) {
                if (strlen(tmp) + 1 > ip_size) {
                    fprintf(stderr, "load_config: broker URI too long\n");
                    fclose(file);
                    return -1;
                }
                memcpy(broker_ip, tmp, strlen(tmp) + 1);
            } else {
                char built[512];
                int needed = snprintf(built, sizeof built, "tcp://%s:1883", tmp);
                if (needed < 0 || (size_t)needed + 1 > sizeof built || (size_t)needed + 1 > ip_size) {
                    fprintf(stderr, "load_config: broker URI too long\n");
                    fclose(file);
                    return -1;
                }
                memcpy(broker_ip, built, (size_t)needed + 1);
            }
            have_broker = 1;
            fprintf(stderr, "load_config: parsed BROKER_IP -> '%s'\n", broker_ip);
        }
    }

    fclose(file);
    return (have_sensor && have_room && have_broker) ? 0 : -1;
}

static void on_conn_lost(const char* cause, void* user) {
    (void)user;
    fprintf(stderr, "[mqtt] connection lost: %s\n", cause ? cause : "(unknown)");
}

static void on_delivered(int token, void* user) {
    (void)user;
    fprintf(stderr, "[mqtt] delivered token=%d\n", token);
}

static void install_signals(void) {
    struct sigaction sa; 
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = on_signal;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;
    sigaction(SIGINT,  &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);

    struct sigaction ign; 
    memset(&ign, 0, sizeof(ign));
    ign.sa_handler = SIG_IGN;
    sigaction(SIGHUP,  &ign, NULL);
    sigaction(SIGPIPE, &ign, NULL);
}

int main(void) {
    install_signals();

    /* 1) Charger configuration */
    char broker_ip[MAX_BROKER_IP_LEN];
    if (load_config(&g_sensor_id, &g_room_id, broker_ip, sizeof(broker_ip)) != 0) {
        fprintf(stderr, "Erreur lors du chargement de /etc/surveillance.conf\n");
        return 1;
    }

    /* 2) Init capteur */
    if (aht20_basic_init() != 0) {
        fprintf(stderr, "AHT20 init failed\n");
        return 1;
    }
    
    printf("🌡️ TechTemp Client Enhanced - Sensor %u, Room %u\n", g_sensor_id, g_room_id);
    printf("📡 Connecting to broker: %s\n", broker_ip);
    printf("⏰ Auto-capture every %d seconds (%.1f min)\n", INTERVAL_SEC, INTERVAL_SEC/60.0f);
    printf("🎛️ Command topic: %s\n", TOPIC_COMMAND);

    /* 3) Init MQTT */
    char client_id[32];
    snprintf(client_id, sizeof(client_id), "sensor_%u", g_sensor_id);

    static char will_payload[64];
    snprintf(will_payload, sizeof(will_payload),
             "{\"sensor_id\":%u,\"status\":\"offline\"}", g_sensor_id);

    MqttWill will = {
        .topic = TOPIC_STATUS,
        .payload = will_payload,
        .payload_len = strlen(will_payload),
        .qos = 1,
        .retained = 1
    };

    const char* init_topics[] = { TOPIC_COMMAND, NULL };
    int init_qos[] = { 1 };

    MqttConfig cfg = {
        .address = broker_ip,
        .client_id = client_id,
        .keepalive_sec = 30,
        .clean_session = 1,
        .automatic_reconnect = 1,
        .min_retry_sec = 1,
        .max_retry_sec = 30,
        .username = NULL,
        .password = NULL,
        .will = &will,
        .persist = MQTT_PERSIST_NONE,
        .persist_dir = NULL,
        .init_topics = init_topics,
        .init_qos = init_qos,
        .on_msg = on_mqtt_command,  /* Callback pour les commandes */
        .on_conn_lost = on_conn_lost,
        .on_delivered = on_delivered,
        .user = NULL,
        .run_background_thread = 1,
        .loop_interval_ms = 20
    };

    if (mqtt_init(&cfg) != 0) {
        fprintf(stderr, "mqtt_init failed\n");
        aht20_basic_deinit();
        return 1;
    }

    /* 4) Publier "online" */
    char online_payload[64];
    snprintf(online_payload, sizeof(online_payload),
             "{\"sensor_id\":%u,\"status\":\"online\"}", g_sensor_id);
    for (int i = 0; i < 5; ++i) {
        MqttSendStatus s = mqtt_publish(TOPIC_STATUS,
                                        online_payload,
                                        strlen(online_payload),
                                        QOS, 1, 2000);
        if (s == MQTT_SEND_OK) break;
        if (s == MQTT_SEND_ERROR) break;
        sleep_ms(200);
    }

    /* 5) Boucle principale */
    int elapsed = INTERVAL_SEC; /* force une première lecture immédiate */
    int exit_code = 0;

    while (!g_stop) {
        /* Capture programmée toutes les 5 min */
        if (elapsed >= INTERVAL_SEC) {
            if (perform_capture_and_send("scheduled") != 0) {
                exit_code = 1;
                break;
            }
            elapsed = 0;
        }

        /* Capture à la demande */
        if (g_capture_now) {
            g_capture_now = 0; /* reset flag */
            perform_capture_and_send("on-demand");
        }

        /* Sommeil réactif: 100 ms x10 = 1 s */
        for (int i = 0; i < 10 && !g_stop; ++i) {
            sleep_ms(100);
        }
        elapsed += 1;
    }

    /* 6) Publier "offline" */
    char offline_payload[64];
    snprintf(offline_payload, sizeof(offline_payload),
             "{\"sensor_id\":%u,\"status\":\"offline\"}", g_sensor_id);
    mqtt_publish(TOPIC_STATUS, offline_payload, strlen(offline_payload), 1, 1, 2000);

    /* 7) Nettoyage */
    mqtt_cleanup();
    aht20_basic_deinit();
    printf("🛑 TechTemp Client stopped cleanly\n");
    return exit_code;
}