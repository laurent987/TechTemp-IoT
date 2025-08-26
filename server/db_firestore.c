#include "db_firestore.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>
#include "cJSON.h"

// Buffer pour la réponse HTTP Firestore
struct curl_string {
    char *ptr;
    size_t len;
};
size_t curl_writefunc(void *ptr, size_t size, size_t nmemb, void *userdata) {
    struct curl_string *s = (struct curl_string *)userdata;
    size_t new_len = s->len + size * nmemb;
    s->ptr = realloc(s->ptr, new_len + 1);
    if (s->ptr == NULL) return 0;
    memcpy(s->ptr + s->len, ptr, size * nmemb);
    s->len = new_len;
    s->ptr[new_len] = '\0';
    return size * nmemb;
}

// À personnaliser pour ton projet
int db_firestore_init(char **url, char **auth_token) {
    // Utiliser notre fonction Firebase custom
    *url = strdup("https://us-central1-techtemp-49c7f.cloudfunctions.net/addReading");
    *auth_token = NULL; // Pas besoin d'auth pour notre fonction
    return 0;
}

int post_reading_to_firestore(
    int sensor_id, int room_id, double temperature, double humidity,
    const char *timestamp, const char *firestore_url, const char *auth_token)
{
    CURL *curl = NULL;
    CURLcode res;
    int ret = 0;

    // Format JSON simple pour notre fonction Firebase
    cJSON *root = cJSON_CreateObject();
    cJSON_AddNumberToObject(root, "sensor_id", sensor_id);
    cJSON_AddNumberToObject(root, "room_id", room_id);
    cJSON_AddNumberToObject(root, "temperature", temperature);
    cJSON_AddNumberToObject(root, "humidity", humidity);
    cJSON_AddStringToObject(root, "timestamp", timestamp);

    char *json_str = cJSON_PrintUnformatted(root);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        
        struct curl_string response;
        response.ptr = malloc(1); response.len = 0;
        curl_easy_setopt(curl, CURLOPT_URL, firestore_url);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_str);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, curl_writefunc);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        
        res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));
            ret = 1;
        } else {
            long http_code = 0;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);
            if (http_code == 200) {
                printf("[Firestore] Data added successfully | room_id=%d | timestamp=%s\n", room_id, timestamp);
            } else {
                printf("[Firestore] HTTP Error %ld | Response: %s\n", http_code, response.ptr);
                ret = 1;
            }
        }
        free(response.ptr);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }
    cJSON_free(json_str);
    cJSON_Delete(root);

    return ret;
}
