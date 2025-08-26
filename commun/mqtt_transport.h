#pragma once
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Codes de retour publication */
typedef enum {
  MQTT_SEND_OK = 0,
  MQTT_SEND_TIMEOUT,
  MQTT_SEND_RETRY_LATER,   /* déconnecté, inflight plein… réessayer */
  MQTT_SEND_ERROR
} MqttSendStatus;

/* Callbacks application */
typedef void (*MqttOnMsg)(const char* topic, const void* payload, size_t len, void* user);
typedef void (*MqttOnConnLost)(const char* cause, void* user);
typedef void (*MqttOnDelivered)(int token, void* user);
typedef void (*MqttLogFn)(int level, const char* msg, void* user);

/* Last‑Will optionnel */
typedef struct {
  const char* topic;
  const void* payload;
  size_t      payload_len;
  int         qos;        /* 0..2 */
  int         retained;   /* 0/1 */
} MqttWill;

/* Persistance (Paho file persistence) */
typedef enum {
  MQTT_PERSIST_NONE = 0,
  MQTT_PERSIST_FILE
} MqttPersistType;

/* Configuration */
typedef struct {
  const char* address;        /* ex: "tcp://192.168.1.10:1883" */
  const char* client_id;      /* unique par device */
  int keepalive_sec;          /* ex: 20 */
  int clean_session;          /* 1 conseillé côté edge */
  int automatic_reconnect;    /* 1 pour auto-reconnect Paho */
  int min_retry_sec;          /* 1 */
  int max_retry_sec;          /* 30 */

  /* Auth optionnelle */
  const char* username;
  const char* password;

  /* Last‑Will optionnel (peut être NULL) */
  const MqttWill* will;

  /* Persistance */
  MqttPersistType persist;
  const char* persist_dir;    /* requis si persist = FILE */

  /* Abonnements initiaux (peuvent être NULL) */
  const char* const* init_topics; /* tableau de C strings, terminé par NULL */
  const int*         init_qos;    /* même longueur, ou NULL => QoS 0 */

  /* Callbacks (peuvent être NULL) */
  MqttOnMsg        on_msg;
  MqttOnConnLost   on_conn_lost;
  MqttOnDelivered  on_delivered;
  void*            user;

  /* Boucle interne (optionnel) */
  int  run_background_thread; /* 1 => crée un thread interne qui appelle yield */
  int  loop_interval_ms;      /* ex: 10..100 ms */
} MqttConfig;

/* API */
int  mqtt_init(const MqttConfig* cfg);                 /* 0 = OK */
void mqtt_cleanup(void);

int  mqtt_is_connected(void);                          /* 1 si connecté */

int  mqtt_subscribe(const char* topic, int qos);       /* 0 = OK */
int  mqtt_unsubscribe(const char* topic);              /* 0 = OK */

/* Publication binaire/texte */
MqttSendStatus mqtt_publish(const char* topic,
                            const void* payload, size_t len,
                            int qos, int retained, int timeout_ms);

MqttSendStatus mqtt_publish_str(const char* topic,
                                const char* s,
                                int qos, int retained, int timeout_ms);

/* Si vous ne lancez pas le thread interne, appelez régulièrement mqtt_loop() */
void mqtt_loop(void);

/* Journalisation optionnelle */
void mqtt_set_logger(MqttLogFn fn, void* user);

#ifdef __cplusplus
}
#endif
