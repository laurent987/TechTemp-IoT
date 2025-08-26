/* test_mqtt.c - programme minimal de test pour mqtt_transport.c */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <signal.h>
#include <time.h>
#include <unistd.h>

#include "mqtt_transport.h"

#define TOPIC_DATA   "weather"
#define TOPIC_STATUS "weather/status"
#define QOS          1

static volatile int stop = 0;
static void on_sig(int s) { (void)s; stop = 1; }

/* callbacks d'exemple */
static void on_msg_cb(const char *topic, const void *payload, size_t len, void *user) {
    (void)user;
    printf(">>> Received message on '%s' (%zu bytes): %.*s\n",
           topic, len, (int)len, (const char*)payload);
}
static void on_conn_lost_cb(const char *cause, void *user) {
    (void)user;
    fprintf(stderr, "conn lost: %s\n", cause ? cause : "(null)");
}
static void on_delivered_cb(int mid, void *user) {
    (void)user;
    printf("publish delivered token=%d\n", mid);
}

/* simple logger bridge */
static void mylog(int level, const char *msg, void *user) {
    (void)user;
    fprintf(stderr, "LOG[%d] %s\n", level, msg);
}

int main(int argc, char **argv)
{
    const char *addr = "tcp://127.0.0.1:1883"; /* override par argv si voulu */
    const char *cid  = "test_client_c";
    if (argc >= 2) addr = argv[1];
    if (argc >= 3) cid = argv[2];

    signal(SIGINT, on_sig);
    signal(SIGTERM, on_sig);

    /* Construire et dupliquer les chaînes (durée de vie sur heap) */
    char *addr_dup = strdup(addr);
    char *cid_dup  = strdup(cid);
    if (!addr_dup || !cid_dup) {
        perror("strdup");
        free(addr_dup); free(cid_dup);
        return 1;
    }

    /* Will payload (statique ou dupliqué) - ici static pour simplicité */
    static char will_payload[128];
    snprintf(will_payload, sizeof will_payload, "{\"client\":\"%s\",\"status\":\"offline\"}", cid);

    MqttWill will = {
        .topic = TOPIC_STATUS,
        .payload = will_payload,
        .payload_len = (int)strlen(will_payload),
        .qos = 1,
        .retained = 1
    };

    const char *init_topics[] = { TOPIC_DATA, NULL };

    MqttConfig cfg = {
        .address = addr_dup,
        .client_id = cid_dup,
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
        .on_msg = on_msg_cb,
        .on_conn_lost = on_conn_lost_cb,
        .on_delivered = on_delivered_cb,
        .user = NULL,
        .run_background_thread = 1,
        .loop_interval_ms = 20
    };

    mqtt_set_logger(mylog, NULL);

    if (mqtt_init(&cfg) != 0) {
        fprintf(stderr, "mqtt_init failed\n");
        free(addr_dup); free(cid_dup);
        return 2;
    }

    /* Publier "online" retained (best-effort retry) */
    char online[128];
    snprintf(online, sizeof online, "{\"client\":\"%s\",\"status\":\"online\"}", cid);
    (void)mqtt_publish_str(TOPIC_STATUS, online, QOS, 1, 2000);

    /* Publier quelques messages de test */
    for (int i = 0; i < 5 && !stop; ++i) {
        char payload[128];
        snprintf(payload, sizeof payload, "{\"seq\":%d,\"time\":%ld}", i, time(NULL));
        MqttSendStatus st = mqtt_publish(TOPIC_DATA, payload, strlen(payload), QOS, 0, 2000);
        if (st == MQTT_SEND_OK) {
            printf("published: %s\n", payload);
        } else {
            printf("publish status=%d\n", (int)st);
        }
        sleep(1);
    }

    /* attendre quelques secondes pour recevoir messages */
    for (int t = 0; t < 5 && !stop; ++t) sleep(1);

    /* Publier offline */
    char offline[128];
    snprintf(offline, sizeof offline, "{\"client\":\"%s\",\"status\":\"offline\"}", cid);
    (void)mqtt_publish_str(TOPIC_STATUS, offline, QOS, 1, 2000);

    /* Nettoyage */
    mqtt_cleanup();

    free(addr_dup);
    free(cid_dup);
    return 0;
}
