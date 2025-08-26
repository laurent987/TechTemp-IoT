#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <time.h>
#include <stdarg.h>
#include <errno.h>

#include "mqtt_transport.h"
#include "MQTTClient.h"

/* ------- État interne ------- */
static MQTTClient g_client = NULL;
static pthread_mutex_t g_pub_mtx = PTHREAD_MUTEX_INITIALIZER;
static int g_connected = 0;

static MqttOnMsg       g_on_msg = NULL;
static MqttOnConnLost  g_on_connlost = NULL;
static MqttOnDelivered g_on_delivered = NULL;
static void*           g_user = NULL;

static MqttLogFn       g_log = NULL;
static void*           g_log_user = NULL;

/* Thread de fond optionnel */
static int g_run_bg = 0;
static int g_loop_ms = 20;
static pthread_t g_bg_thread;
static volatile int g_bg_stop = 0;

/* Utilitaires */
static void msleep(int ms) {
    struct timespec ts;
    ts.tv_sec = ms / 1000;
    ts.tv_nsec = (ms % 1000) * 1000000L;
    nanosleep(&ts, NULL);
}

static void log_msg(int level, const char* fmt, ...) {
    char buf[512];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    if (g_log) g_log(level, buf, g_log_user);
}

/* ------- Callbacks Paho ------- */
static void delivered_cb(void *context, MQTTClient_deliveryToken dt) {
    (void)context;
    if (g_on_delivered) g_on_delivered((int)dt, g_user);
}

static int msgarrvd_cb(void *context, char *topicName, int topicLen, MQTTClient_message *message) {
    (void)context; (void)topicLen;
    if (g_on_msg) {
        g_on_msg(topicName ? topicName : "", message->payload, (size_t)message->payloadlen, g_user);
    }
    MQTTClient_freeMessage(&message);
    MQTTClient_free(topicName);
    return 1;
}

static void connlost_cb(void *context, char *cause) {
    (void)context;
    g_connected = 0;
    log_msg(1, "MQTT conn lost: %s", cause ? cause : "(null)");
    if (g_on_connlost) g_on_connlost(cause ? cause : "", g_user);
}

/* ------- Thread de fond ------- */
static void* bg_loop(void* arg) {
    (void)arg;
    while (!g_bg_stop) {
        MQTTClient_yield();
        msleep(g_loop_ms);
    }
    return NULL;
}

/* ------- API ------- */
void mqtt_set_logger(MqttLogFn fn, void* user) {
    g_log = fn;
    g_log_user = user;
}

int mqtt_is_connected(void) { return g_connected; }

int mqtt_init(const MqttConfig* cfg) {
    if (!cfg || !cfg->address || !cfg->client_id) return -1;
    if (g_client) return 0; /* déjà init */

    int rc;

    rc = MQTTClient_create(&g_client, cfg->address, cfg->client_id,
                           MQTTCLIENT_PERSISTENCE_NONE , NULL);

    if (rc != MQTTCLIENT_SUCCESS) {
        log_msg(1, "MQTTClient_create failed rc=%d", rc);
        return -3;
    }

    /* ATTENTION: pour utiliser la persistance custom, Paho recommande MQTTClient_createWithOptions
       mais MQTTClient_create + set persistence globale via build fonctionne.
       Ici on laisse la persistance par défaut. Si vous voulez absolument filePersistence,
       vous pouvez utiliser createWithOptions dans votre version de Paho. */

    MQTTClient_setCallbacks(g_client, NULL, connlost_cb, msgarrvd_cb, delivered_cb);

    MQTTClient_connectOptions conn_opts = MQTTClient_connectOptions_initializer;

    conn_opts.httpsProxy = NULL;
    conn_opts.keepAliveInterval = (cfg->keepalive_sec > 0) ? cfg->keepalive_sec : 20;
    conn_opts.cleansession = cfg->clean_session ? 1 : 0;


    if (cfg->username) conn_opts.username = (char*)cfg->username;
    if (cfg->password) conn_opts.password = (char*)cfg->password;

    /* Last Will */
    MQTTClient_willOptions will_opts = MQTTClient_willOptions_initializer;
    if (cfg->will && cfg->will->topic && cfg->will->payload && cfg->will->payload_len > 0) {
        will_opts.topicName = (char*)cfg->will->topic;
        will_opts.message   = (char*)cfg->will->payload;
        will_opts.qos       = cfg->will->qos;
        will_opts.retained  = cfg->will->retained ? 1 : 0;
        conn_opts.will      = &will_opts;
    }

    rc = MQTTClient_connect(g_client, &conn_opts);
    if (rc != MQTTCLIENT_SUCCESS) {
        int my_errno = errno;
    log_msg(1, "MQTTClient_connect rc=%d errno=%d (%s)", rc, my_errno, my_errno ? strerror(my_errno) : "no errno");
        MQTTClient_destroy(&g_client);
        g_client = NULL;
        return -4;
    }
    g_connected = 1;
    log_msg(5, "MQTT connected to %s as %s", cfg->address, cfg->client_id);

    /* Abonnements initiaux */
    if (cfg->init_topics) {
        for (int i = 0; cfg->init_topics[i] != NULL; ++i) {
            int qos = 0;
            if (cfg->init_qos) qos = cfg->init_qos[i];
            rc = MQTTClient_subscribe(g_client, cfg->init_topics[i], qos);
            if (rc != MQTTCLIENT_SUCCESS) {
                log_msg(2, "subscribe('%s') failed rc=%d", cfg->init_topics[i], rc);
            }
        }
    }

    /* Callbacks app */
    g_on_msg       = cfg->on_msg;
    g_on_connlost  = cfg->on_conn_lost;
    g_on_delivered = cfg->on_delivered;
    g_user         = cfg->user;

    /* Thread de fond optionnel */
    g_run_bg = cfg->run_background_thread ? 1 : 0;
    g_loop_ms = (cfg->loop_interval_ms > 0) ? cfg->loop_interval_ms : 20;
    if (g_run_bg) {
        g_bg_stop = 0;
        if (pthread_create(&g_bg_thread, NULL, bg_loop, NULL) != 0) {
            log_msg(1, "failed to start background thread");
            g_run_bg = 0;
        }
    }

    return 0;
}

void mqtt_cleanup(void) {
    if (!g_client) return;

    if (g_run_bg) {
        g_bg_stop = 1;
        pthread_join(g_bg_thread, NULL);
        g_run_bg = 0;
    }

    /* Laisser le temps aux ACK en vol */
    MQTTClient_disconnect(g_client, 2000);
    MQTTClient_destroy(&g_client);
    g_client = NULL;
    g_connected = 0;
    g_on_msg = NULL; g_on_connlost = NULL; g_on_delivered = NULL; g_user = NULL;
}

int mqtt_subscribe(const char* topic, int qos) {
    if (!g_client || !topic) return -1;
    int rc = MQTTClient_subscribe(g_client, topic, (qos>=0 && qos<=2)?qos:0);
    return (rc == MQTTCLIENT_SUCCESS) ? 0 : rc;
}

int mqtt_unsubscribe(const char* topic) {
    if (!g_client || !topic) return -1;
    int rc = MQTTClient_unsubscribe(g_client, topic);
    return (rc == MQTTCLIENT_SUCCESS) ? 0 : rc;
}

MqttSendStatus mqtt_publish(const char* topic,
                            const void* payload, size_t len,
                            int qos, int retained, int timeout_ms)
{
    if (!g_client || !topic || (!payload && len>0)) return MQTT_SEND_ERROR;

    MQTTClient_message msg = MQTTClient_message_initializer;
    MQTTClient_deliveryToken token = 0;

    msg.payload    = (void*)payload;
    msg.payloadlen = (int)len;
    msg.qos        = (qos<0)?0:((qos>2)?2:qos);
    msg.retained   = retained ? 1 : 0;

    int rc;
    pthread_mutex_lock(&g_pub_mtx);
    rc = MQTTClient_publishMessage(g_client, topic, &msg, &token);
    pthread_mutex_unlock(&g_pub_mtx);

    if (rc != MQTTCLIENT_SUCCESS) {
        if (rc == MQTTCLIENT_MAX_MESSAGES_INFLIGHT || rc == MQTTCLIENT_DISCONNECTED) {
            return MQTT_SEND_RETRY_LATER;
        }
        log_msg(2, "publishMessage('%s') failed rc=%d", topic, rc);
        return MQTT_SEND_ERROR;
    }

    if (msg.qos == 0) return MQTT_SEND_OK;

    /* Attente ACK QoS1/2 */
    rc = MQTTClient_waitForCompletion(g_client, token, (timeout_ms>0)?timeout_ms:5000);
    if (rc == MQTTCLIENT_SUCCESS) return MQTT_SEND_OK;

    /* Laisser Paho traiter; l’ACK peut encore arriver en arrière-plan */
    MQTTClient_yield();
    if (rc == MQTTCLIENT_DISCONNECTED) return MQTT_SEND_RETRY_LATER;
    return MQTT_SEND_TIMEOUT;
}

MqttSendStatus mqtt_publish_str(const char* topic,
                                const char* s,
                                int qos, int retained, int timeout_ms)
{
    size_t len = s ? strlen(s) : 0;
    return mqtt_publish(topic, s, len, qos, retained, timeout_ms);
}

void mqtt_loop(void) {
    /* À utiliser si vous n’avez pas activé le thread interne */
    MQTTClient_yield();
}
