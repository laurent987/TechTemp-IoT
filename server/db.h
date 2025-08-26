
#include "sqlite3.h"
#include "stdlib.h"
#include "stdio.h"
#include <string.h>


#ifndef DB_H
#define DB_H

int init_db(sqlite3 **db);
int create_tables(sqlite3 *db);
int tableExists(sqlite3 *db, const char *tableName);
int callback(void *data, int argc, char **argv, char **azColName);

#endif