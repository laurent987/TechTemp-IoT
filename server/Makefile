# set the project version
VERSION := 1.0.0

# set the application name (modifiable)
APP_NAME := techtemp

# set the compiler
CC := gcc

# set flags of the compiler
CFLAGS := -O3 -DNDEBUG -Wall

# includes (adapte le chemin si besoin)
INCLUDES := -I. -I/usr/local/opt/cjson/include/cjson

# libraries
LIBS := -lcjson -lpaho-mqtt3c -lsqlite3 -lcurl -lpthread

# the source files (ajoute ici tous tes .c !)
SRC := main.c db.c utils.c db_firestore.c mqtt_transport.c db_sqlite.c helpers.c system_monitor.c http_server.c

# object files
OBJ := $(SRC:.c=.o)

# default rule
all: $(APP_NAME)

$(APP_NAME): $(OBJ)
	$(CC) $(CFLAGS) $(INCLUDES) $^ -o $@ $(LIBS)

%.o: %.c
	$(CC) $(CFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -f $(APP_NAME) $(OBJ)

.PHONY: all clean
