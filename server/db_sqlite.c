#include "db_sqlite.h"
#include <stdio.h>

int db_sqlite_init(sqlite3 **db) {
    return sqlite3_open("mydb.sqlite", db);
}

void db_sqlite_close(sqlite3 *db) {
    sqlite3_close(db);
}

int db_sqlite_create_tables(sqlite3 *db) {
    char *err_msg = 0;
    const char *sql =
        "CREATE TABLE IF NOT EXISTS readings ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "sensor_id INTEGER, "
        "temperature REAL, "
        "humidity REAL, "
        "timestamp TEXT);";

    int rc = sqlite3_exec(db, sql, 0, 0, &err_msg);
    if (rc != SQLITE_OK) {
        fprintf(stderr, "SQL error: %s\n", err_msg);
        sqlite3_free(err_msg);
        return -1;
    }
    return 0;
}

int db_sqlite_insert(sqlite3 *db, int sensor_id, double temperature, double humidity, const char *timestamp) {
    char *err_msg = 0;
    char sql[512];
    snprintf(sql, sizeof(sql),
             "INSERT INTO readings (sensor_id, temperature, humidity, timestamp) VALUES (%d, %f, %f, '%s');",
             sensor_id, temperature, humidity, timestamp);

    int rc = sqlite3_exec(db, sql, 0, 0, &err_msg);

    if (rc != SQLITE_OK) {
        fprintf(stderr, "SQL error: %s\n", err_msg);
        sqlite3_free(err_msg);
        return -1;
    }
    printf("[Database] Data inserted: sensor=%d, temp=%.2f, hum=%.2f, ts=%s\n",
           sensor_id, temperature, humidity, timestamp);
    return 0;
}
