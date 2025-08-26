#ifndef DB_SQLITE_H
#define DB_SQLITE_H
#include <sqlite3.h>

int db_sqlite_init(sqlite3 **db);
void db_sqlite_close(sqlite3 *db);
int db_sqlite_create_tables(sqlite3 *db);
int db_sqlite_insert(sqlite3 *db, int sensor_id, double temperature, double humidity, const char *timestamp);

#endif
