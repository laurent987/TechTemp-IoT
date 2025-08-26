/* client.c */
#include "driver_aht20.h"
#include "driver_aht20_interface.h"
#include "mqtt_transport.h"   /* notre module */

#include <getopt.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <signal.h>
#include <stdatomic.h>
#include <inttypes.h>
#include <strings.h> 
#include <string.h>
#include <ctype.h>
#include <stdint.h>


#define TOPIC_DATA        "weather"          /* topic de données */
#define TOPIC_STATUS      "weather/status"   /* topic statut online/offline */
#define QOS               1
#define INTERVAL_SEC      300               /* période entre mesures */
#define MAX_BROKER_IP_LEN 64

/* arrêt propre via signaux */
static atomic_int g_stop = 0;
static void on_signal(int signo) { (void)signo; g_stop = 1; }

/* petit helper sommeil en millisecondes (POSIX) */
static void sleep_ms(long ms)
{
    struct timespec ts;
    ts.tv_sec  = ms / 1000;
    ts.tv_nsec = (ms % 1000) * 1000000L;
    while (nanosleep(&ts, &ts) == -1) {
        /* reprend si interrompu par un signal */
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

static int load_config(uint8_t *sensor_id, uint8_t *room_id,
                       char *broker_ip, size_t ip_size)
{
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
            } else {
                fprintf(stderr, "load_config: invalid SENSOR_ID value: '%s'\n", line+10);
            }
        } else if (strncmp(line, "ROOM_ID=", 8) == 0) {
            char *end;
            long v = strtol(line + 8, &end, 10);
            if (end != line + 8 && v >= 0 && v <= 255) {
                *room_id = (uint8_t)v;
                have_room = 1;
            } else {
                fprintf(stderr, "load_config: invalid ROOM_ID value: '%s'\n", line+8);
            }
        } else if (strncmp(line, "BROKER_IP=", 10) == 0) {
            /* extrait la partie droite */
            char tmp[256];
            /* copie une portion raisonnable de la valeur (sans dépasser tmp) */
            size_t max_copy = sizeof(tmp) - 1;
            /* skip "BROKER_IP=" (10 chars) */
            snprintf(tmp, sizeof tmp, "%.*s", (int)max_copy, line + 10);
            tmp[max_copy] = '\0';
            trim_ascii_inplace(tmp);

            size_t L = strlen(tmp);
            /* si entre guillemets, enlever les quotes (et retrimer) */
            if (L >= 2 && ((tmp[0] == '"' && tmp[L-1] == '"') || (tmp[0] == '\'' && tmp[L-1] == '\''))) {
                /* memmove gère correctement le chevauchement */
                memmove(tmp, tmp + 1, L - 2);
                tmp[L - 2] = '\0';
                trim_ascii_inplace(tmp);
                L = strlen(tmp);
            }

            if (L == 0) {
                fprintf(stderr, "load_config: BROKER_IP value empty after trimming\n");
                continue;
            }

            /* Si le contenu commence par tcp:// ou ssl://, on le prend tel quel.
               On compare de façon insensible à la casse pour les 6 premiers caractères. */
            if (L >= 6 && (strncasecmp(tmp, "tcp://", 6) == 0 || strncasecmp(tmp, "ssl://", 6) == 0)) {
                /* vérifier la place dans broker_ip */
                if (strlen(tmp) + 1 > ip_size) {
                    fprintf(stderr, "load_config: broker URI too long (%zu >= %zu)\n", strlen(tmp), ip_size);
                    fclose(file);
                    return -1;
                }
                memcpy(broker_ip, tmp, strlen(tmp) + 1);
            } else {
                /* construire tcp://%s:1883 */
                char built[512];
                int needed = snprintf(built, sizeof built, "tcp://%s:1883", tmp);
                if (needed < 0 || (size_t)needed + 1 > sizeof built) {
                    fprintf(stderr, "load_config: built broker URI would be too long\n");
                    fclose(file);
                    return -1;
                }
                if ((size_t)needed + 1 > ip_size) {
                    fprintf(stderr, "load_config: broker URI (%d) doesn't fit into ip_size (%zu)\n", needed, ip_size);
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

    if (!(have_sensor && have_room && have_broker)) {
        fprintf(stderr, "load_config: missing config entries; sensor=%d room=%d broker=%d\n",
                have_sensor, have_room, have_broker);
        return -1;
    }

    return 0;
}


/* Callbacks (facultatifs) */
static void on_conn_lost(const char* cause, void* user) {
    (void)user;
    fprintf(stderr, "[mqtt] connection lost: %s\n", cause ? cause : "(unknown)");
}

static void on_delivered(int token, void* user) {
    (void)user;
    fprintf(stderr, "[mqtt] delivered token=%d\n", token);
}

static void install_signals(void) {
    struct sigaction sa; memset(&sa, 0, sizeof(sa));
    sa.sa_handler = on_signal;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = SA_RESTART;
    sigaction(SIGINT,  &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);

    struct sigaction ign; memset(&ign, 0, sizeof(ign));
    ign.sa_handler = SIG_IGN;
    sigaction(SIGHUP,  &ign, NULL);   /* pas de reload ici */
    sigaction(SIGPIPE, &ign, NULL);   /* éviter crash sur socket cassée */
}

int main(void) {
    install_signals();

    /* 1) Charger configuration */
    uint8_t sensor_id = 0, room_id = 0;
    char broker_ip[MAX_BROKER_IP_LEN];
    if (load_config(&sensor_id, &room_id, broker_ip, sizeof(broker_ip)) != 0) {
        fprintf(stderr, "Erreur lors du chargement de /etc/surveillance.conf\n");
        return 1;
    }
    if (broker_ip[0] == '\0') {
        fprintf(stderr, "Erreur: BROKER_IP manquant\n");
        return 1;
    }

    /* 2) Init capteur */
    if (aht20_basic_init() != 0) {
        fprintf(stderr, "AHT20 init failed\n");
        return 1;
    }
    aht20_interface_debug_print("AHT20 OK | sensor_id=%u room_id=%u broker=%s\n",
                                sensor_id, room_id, broker_ip);

    /* 3) Init MQTT (via mqtt_transport) */
    char address[96];

    snprintf(address, sizeof(address), "%s", broker_ip);
    fprintf(stderr, "Connecting to MQTT broker at %s\n", address);
    char client_id[32];
    snprintf(client_id, sizeof(client_id), "sensor_%u", sensor_id);

    static char will_payload[64]; /* statique pour rester valide tant que le process vit */
    snprintf(will_payload, sizeof(will_payload),
             "{\"sensor_id\":%u,\"status\":\"offline\"}", sensor_id);

    MqttWill will = {
        .topic       = TOPIC_STATUS,
        .payload     = will_payload,
        .payload_len = strlen(will_payload),
        .qos         = 1,
        .retained    = 1
    };

       char *address_dup = strdup(address);
    if (!address_dup) { perror("strdup"); return 1; }
    char *client_id_dup = strdup(client_id);
    if (!client_id_dup) { perror("strdup"); free(address_dup); return 1; }
    const char* init_topics[] = { NULL };

    MqttConfig cfg = {
        .address = address, /* exemple, peut être remplacé par broker_ip */
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
        .init_qos = NULL,
        .on_msg = NULL,
        .on_conn_lost = on_conn_lost,
        .on_delivered = on_delivered,
        .user = NULL,
        .run_background_thread = 1,
        .loop_interval_ms = 20
    };

    if (mqtt_init(&cfg) != 0) {
        fprintf(stderr, "mqtt_init failed\n");
        free(address_dup);
        free(client_id_dup);
        (void)aht20_basic_deinit();
        return 1;
    }

    /* 4) Publier “online” retained (meilleur effort) */
    char online_payload[64];
    snprintf(online_payload, sizeof(online_payload),
             "{\"sensor_id\":%u,\"status\":\"online\"}", sensor_id);
    for (int i = 0; i < 5; ++i) { /* petit retry si pas encore connecté */
        MqttSendStatus s = mqtt_publish(TOPIC_STATUS,
                                        online_payload,
                                        strlen(online_payload),
                                        QOS, /* qos */
                                        1,   /* retained */
                                        2000 /* timeout ms */);
        if (s == MQTT_SEND_OK) break;
        if (s == MQTT_SEND_ERROR) break;
        sleep_ms(200);
    }

    /* 5) Boucle principale */
    int elapsed = INTERVAL_SEC; /* force une première lecture immédiate */
    int exit_code = 0;

    while (!g_stop) {
        if (elapsed >= INTERVAL_SEC) {
            float   temperature = 0.0f;
            uint8_t humidity    = 0;
            if (aht20_basic_read(&temperature, &humidity) != 0) {
                aht20_interface_debug_print("AHT20 read failed\n");
                exit_code = 1;
                break;
            }

            time_t now = time(NULL);
            char dt[32];
            strftime(dt, sizeof(dt), "%Y-%m-%d %H:%M:%S", localtime(&now));
            aht20_interface_debug_print("time: %s | temp: %.1f C | hum: %u%%\n",
                                        dt, temperature, humidity);

            char payload[200];
            int n = snprintf(payload, sizeof(payload),
                             "{\"sensor_id\":%u,\"room_id\":%u,"
                             "\"temperature\":%.2f,\"humidity\":%u}",
                             sensor_id, room_id, temperature, humidity);
            if (n < 0 || n >= (int)sizeof(payload)) {
                fprintf(stderr, "payload truncated\n");
            } else {
                /* Publier avec retries légers si le transport demande de réessayer */
                for (int attempt = 0; attempt < 5 && !g_stop; ++attempt) {
                    MqttSendStatus s = mqtt_publish(TOPIC_DATA,
                                                    payload, (size_t)n,
                                                    QOS, /* qos */
                                                    0,   /* retained */
                                                    5000 /* timeout ms */);
                    if (s == MQTT_SEND_OK) break;
                    if (s == MQTT_SEND_ERROR) { /* erreur non récupérable immédiate */
                        fprintf(stderr, "publish error, attempt=%d\n", attempt);
                        break;
                    }
                    /* MQTT_SEND_RETRY_LATER ou timeout: patienter un peu */
                    sleep_ms(200);
                }
            }
            elapsed = 0;
        }

        /* sommeil réactif: 100 ms x10 = 1 s */
        for (int i = 0; i < 10 && !g_stop; ++i) {
            sleep_ms(100);
        }
        elapsed += 1;
    }

    /* 6) Publier “offline” retained (best effort, non bloquant) */
    if (!g_stop) g_stop = 1; /* cohérence */
    char offline_payload2[64];
    snprintf(offline_payload2, sizeof(offline_payload2),
             "{\"sensor_id\":%u,\"status\":\"offline\"}", sensor_id);
    (void)mqtt_publish(TOPIC_STATUS, offline_payload2, strlen(offline_payload2),
                       1, 1, 2000);

    /* 7) Nettoyage */
    mqtt_cleanup();
    (void)aht20_basic_deinit();
    return exit_code;
}
