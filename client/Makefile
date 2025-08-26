APP_NAME := techtemp
VERSION  := 1.0.0

CC      := gcc
CSTD    := -std=c11
WARN    := -Wall -Wextra -Wpedantic
OPT     := -O3 -DNDEBUG

SRC := $(wildcard ./*.c)
OBJ := $(SRC:.c=.o)
DEP := $(OBJ:.o=.d)

# Includes de ton projet + includes système
INC_DIRS := -I.
SYS_INC  := -I/usr/include

# Choisis la variante synchrone (3c) ou asynchrone (3a)
PAHO_LIB := -lpaho-mqtt3c

# Libs usuelles
LDLIBS   := $(PAHO_LIB) -lpthread
LDFLAGS  :=

CFLAGS   := $(CSTD) $(WARN) $(OPT) $(INC_DIRS) $(SYS_INC) -D_POSIX_C_SOURCE=200809L

.PHONY: all clean enhanced
all: $(APP_NAME)

# Version enhanced avec capture à la demande
enhanced: techtemp_enhanced

techtemp_enhanced: $(OBJ)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

$(APP_NAME): $(OBJ)
	$(CC) $(LDFLAGS) -o $@ $^ $(LDLIBS)

%.o: %.c
	$(CC) $(CFLAGS) -MMD -MP -c $< -o $@

clean:
	$(RM) $(OBJ) $(DEP) $(APP_NAME) techtemp_enhanced

-include $(DEP)
