#ifndef APP_CONTEXT_H
#define APP_CONTEXT_H

#include <sqlite3.h>

// Structure contenant le contexte d'application
typedef struct {
    int use_firestore;      // 1 = Firestore, 0 = sqlite local
    sqlite3 *db;           // si SQLite
    char *firestore_url;   // si Firestore
    char *auth_token;      // si Firestore (optionnel pour clé API)
} AppContext;

#endif
