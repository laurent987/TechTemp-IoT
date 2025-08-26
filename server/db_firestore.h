#ifndef DB_FIRESTORE_H
#define DB_FIRESTORE_H

int db_firestore_init(char **url, char **auth_token); // Perso, tu peux le rendre optionnel
int post_reading_to_firestore(int sensor_id, int room_id, double temperature, double humidity, const char *timestamp, const char *firestore_url, const char *auth_token);

#endif
