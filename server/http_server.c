#include "http_server.h"
#include "system_monitor.h"
#include "mqtt_transport.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <pthread.h>
#include <time.h>

static void send_http_response(int client_socket, int status_code, const char* content_type, const char* body) {
    char header[1024];
    int content_length = body ? strlen(body) : 0;
    
    const char* status_text = (status_code == 200) ? "OK" : 
                             (status_code == 404) ? "Not Found" : 
                             (status_code == 500) ? "Internal Server Error" : "Unknown";
    
    snprintf(header, sizeof(header),
        "HTTP/1.1 %d %s\r\n"
        "Content-Type: %s\r\n"
        "Content-Length: %d\r\n"
        "Access-Control-Allow-Origin: *\r\n"
        "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        "Access-Control-Allow-Headers: Content-Type\r\n"
        "Connection: close\r\n"
        "\r\n",
        status_code, status_text, content_type, content_length);
    
    send(client_socket, header, strlen(header), 0);
    if (body && content_length > 0) {
        send(client_socket, body, content_length, 0);
    }
}

// Fonction pour déclencher une lecture à la demande
static int trigger_sensor_reading(int sensor_id) {
    char command[128];
    
    if (sensor_id <= 0) {
        // Déclencher tous les capteurs
        snprintf(command, sizeof(command), "{\"action\":\"capture\",\"sensor_id\":\"all\"}");
    } else {
        // Déclencher un capteur spécifique
        snprintf(command, sizeof(command), "{\"action\":\"capture\",\"sensor_id\":%d}", sensor_id);
    }
    
    printf("[TRIGGER] Publishing command: %s\n", command);
    
    MqttSendStatus status = mqtt_publish("weather/command", command, strlen(command), 1, 0, 5000);
    
    if (status == MQTT_SEND_OK) {
        printf("[TRIGGER] Command sent successfully\n");
        return 0;
    } else {
        printf("[TRIGGER] Failed to send command (status: %d)\n", status);
        return -1;
    }
}

static void handle_client_request(int client_socket) {
    char buffer[2048];
    int bytes_received = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
    
    if (bytes_received <= 0) {
        close(client_socket);
        return;
    }
    
    buffer[bytes_received] = '\0';
    
    // Parser la requête HTTP
    char method[16], path[256], version[16];
    if (sscanf(buffer, "%15s %255s %15s", method, path, version) != 3) {
        send_http_response(client_socket, 400, "text/plain", "Bad Request");
        close(client_socket);
        return;
    }
    
    printf("[HTTP] %s %s\n", method, path);
    
    // Gérer les OPTIONS pour CORS
    if (strcmp(method, "OPTIONS") == 0) {
        send_http_response(client_socket, 200, "text/plain", "");
        close(client_socket);
        return;
    }
    
    // Routes API
    if (strcmp(method, "GET") == 0) {
        if (strcmp(path, "/api/system/health") == 0) {
            char *json_status = monitor_get_json_status();
            if (json_status) {
                send_http_response(client_socket, 200, "application/json", json_status);
                free(json_status);
            } else {
                send_http_response(client_socket, 500, "application/json", "{\"error\":\"Monitor not initialized\"}");
            }
        } else if (strcmp(path, "/api/system/status") == 0) {
            // Version simple pour debug
            SystemHealth *health = monitor_get_system_health();
            if (health) {
                char simple_status[512];
                snprintf(simple_status, sizeof(simple_status),
                    "{\"status\":\"%s\",\"devices\":%d,\"online\":%d,\"timestamp\":%ld}",
                    health->global_status, health->total_devices, health->online_devices, health->last_update);
                send_http_response(client_socket, 200, "application/json", simple_status);
            } else {
                send_http_response(client_socket, 500, "application/json", "{\"error\":\"Monitor not available\"}");
            }
        } else if (strcmp(path, "/") == 0 || strcmp(path, "/health") == 0) {
            send_http_response(client_socket, 200, "text/plain", "TechTemp System Monitor API\n\nEndpoints:\n/api/system/health - Full system status\n/api/system/status - Simple status\n/api/trigger-reading - Trigger sensor reading (POST)");
        } else {
            send_http_response(client_socket, 404, "application/json", "{\"error\":\"Endpoint not found\"}");
        }
    } else if (strcmp(method, "POST") == 0) {
        if (strcmp(path, "/api/trigger-reading") == 0) {
            // Parser le body pour récupérer sensor_id (optionnel)
            int sensor_id = 0; // 0 = tous les capteurs
            
            // Rechercher sensor_id dans le body si présent
            char *body_start = strstr(buffer, "\r\n\r\n");
            if (body_start) {
                body_start += 4; // Skip "\r\n\r\n"
                char *sensor_id_str = strstr(body_start, "\"sensor_id\":");
                if (sensor_id_str) {
                    sscanf(sensor_id_str + 12, "%d", &sensor_id);
                }
            }
            
            if (trigger_sensor_reading(sensor_id) == 0) {
                char response[256];
                snprintf(response, sizeof(response), 
                    "{\"status\":\"success\",\"message\":\"Reading triggered for sensor %s\",\"timestamp\":%ld}",
                    sensor_id > 0 ? "specific" : "all",
                    time(NULL));
                send_http_response(client_socket, 200, "application/json", response);
            } else {
                send_http_response(client_socket, 500, "application/json", "{\"error\":\"Failed to trigger reading\"}");
            }
        } else {
            send_http_response(client_socket, 404, "application/json", "{\"error\":\"Endpoint not found\"}");
        }
    } else {
        send_http_response(client_socket, 405, "application/json", "{\"error\":\"Method not allowed\"}");
    }
    
    close(client_socket);
}

static void* server_thread_func(void* arg) {
    HttpServer *server = (HttpServer*)arg;
    int server_socket;
    struct sockaddr_in server_addr, client_addr;
    socklen_t client_len = sizeof(client_addr);
    
    // Créer le socket serveur
    server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket < 0) {
        perror("Socket creation failed");
        return NULL;
    }
    
    // Permettre la réutilisation de l'adresse
    int opt = 1;
    setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    
    // Configuration de l'adresse
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(server->port);
    
    // Bind et Listen
    if (bind(server_socket, (struct sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        perror("Bind failed");
        close(server_socket);
        return NULL;
    }
    
    if (listen(server_socket, server->max_connections) < 0) {
        perror("Listen failed");
        close(server_socket);
        return NULL;
    }
    
    printf("[HTTP] Server listening on port %d\n", server->port);
    
    // Boucle principale du serveur
    while (server->running) {
        fd_set read_fds;
        struct timeval timeout;
        
        FD_ZERO(&read_fds);
        FD_SET(server_socket, &read_fds);
        
        timeout.tv_sec = 1;
        timeout.tv_usec = 0;
        
        int activity = select(server_socket + 1, &read_fds, NULL, NULL, &timeout);
        
        if (activity < 0) {
            if (server->running) perror("Select error");
            break;
        }
        
        if (activity > 0 && FD_ISSET(server_socket, &read_fds)) {
            int client_socket = accept(server_socket, (struct sockaddr*)&client_addr, &client_len);
            if (client_socket >= 0) {
                handle_client_request(client_socket);
            }
        }
    }
    
    close(server_socket);
    printf("[HTTP] Server stopped\n");
    return NULL;
}

int http_server_init(HttpServer *server, int port) {
    memset(server, 0, sizeof(HttpServer));
    server->port = port;
    server->max_connections = 10;
    server->running = 0;
    return 0;
}

int http_server_start(HttpServer *server) {
    server->running = 1;
    
    if (pthread_create(&server->server_thread, NULL, server_thread_func, server) != 0) {
        perror("Failed to create server thread");
        server->running = 0;
        return -1;
    }
    
    return 0;
}

void http_server_stop(HttpServer *server) {
    server->running = 0;
    pthread_join(server->server_thread, NULL);
}

void http_server_cleanup(HttpServer *server) {
    if (server->running) {
        http_server_stop(server);
    }
}
