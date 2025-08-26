#ifndef HTTP_SERVER_H
#define HTTP_SERVER_H

#include <pthread.h>

// Configuration du serveur HTTP
typedef struct {
    int port;
    int max_connections;
    pthread_t server_thread;
    volatile int running;
} HttpServer;

// Fonctions principales
int http_server_init(HttpServer *server, int port);
int http_server_start(HttpServer *server);
void http_server_stop(HttpServer *server);
void http_server_cleanup(HttpServer *server);

#endif // HTTP_SERVER_H
