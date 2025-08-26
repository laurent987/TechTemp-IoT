
#include "db.h"

int callback(void *data, int argc, char **argv, char **azColName) {
    int *exists = (int *)data;
    if (argc == 1 && argv[0] && strcmp(argv[0], "0") != 0) {
        *exists = 1;
    }
    return 0;
}

int init_db(sqlite3 **db) {
    // Initialiser et ouvrir la base de données
    int rc_db = sqlite3_open("techtemp.db", db);
    if (rc_db != SQLITE_OK) {
        fprintf(stderr, "Cannot open database: %s\n", sqlite3_errmsg(*db));
        sqlite3_close(*db);
        exit(1);
    }

    return 0;
}

int tableExists(sqlite3 *db, const char *tableName) {
    char *err_msg = NULL;
    int exists = 0;
    char sql[256];
    snprintf(sql, sizeof(sql), "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='%s';", tableName);

    if (sqlite3_exec(db, sql, callback, &exists, &err_msg) != SQLITE_OK) {
        fprintf(stderr, "SQL error: %s\n", err_msg);
        sqlite3_free(err_msg);
    }

    return exists;
}

int create_tables(sqlite3 *db) {
    int rc_db;
    char *err_msg = 0;
    


    if (tableExists(db, "readings")) {
        printf("Table 'readings' already exists.\n");
    } else {
        printf("Table 'readings' does not exist. Creating...\n");
        const char* createTableSQL = "CREATE TABLE IF NOT EXISTS readings ("
                                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                                    "sensor_id INTEGER, "
                                    "temperature REAL, "
                                    "humidity REAL, "
                                    "timestamp TEXT);";
        rc_db = sqlite3_exec(db, createTableSQL, 0, 0, &err_msg);
        if (rc_db != SQLITE_OK) {
            fprintf(stderr, "Failed to create table 'readings': %s\n", err_msg);
            sqlite3_free(err_msg);
            sqlite3_close(db);
            exit(1);
        } else {
            fprintf(stdout, "Table 'readings' created successfully\n");
        }
    }

    if (tableExists(db, "raspi")) {
        printf("Table 'raspi' already exists.\n");
    } else {
        printf("Table 'raspi' does not exist. Creating...\n");
        const char* createTableSQL = "CREATE TABLE IF NOT EXISTS raspi ("
                                        "raspi_id INTEGER PRIMARY KEY AUTOINCREMENT, "
                                        "name VARCHAR(255), "
                                        "location VARCHAR(255));";
        rc_db = sqlite3_exec(db, createTableSQL, 0, 0, &err_msg);
        if (rc_db != SQLITE_OK) {
            fprintf(stderr, "Failed to create table 'raspi': %s\n", err_msg);
            sqlite3_free(err_msg);
            sqlite3_close(db);
            exit(1);
        } else {
            fprintf(stdout, "Table 'raspi' created successfully\n");
        }
    }

    if (tableExists(db, "sensors")) {
        printf("Table 'sensors' already exists.\n");
    } else {
        printf("Table 'sensors' does not exist. Creating...\n");
        const char* createTableSQL =    "CREATE TABLE IF NOT EXISTS sensors ("
                                        "sensor_id INTEGER PRIMARY KEY AUTOINCREMENT, "
                                        "type VARCHAR(255), "
                                        "location VARCHAR(255), "
                                        "installation_date DATE, "
                                        "raspi_id INTEGER, "
                                        "FOREIGN KEY (raspi_id) REFERENCES raspi(raspi_id));";
        rc_db = sqlite3_exec(db, createTableSQL, 0, 0, &err_msg);
        if (rc_db != SQLITE_OK) {
            fprintf(stderr, "Failed to create table 'sensors': %s\n", err_msg);
            sqlite3_free(err_msg);
            sqlite3_close(db);
            exit(1);
        } else {
            fprintf(stdout, "Table 'sensors' created successfully\n");
        }
    }

    return 0;
}
