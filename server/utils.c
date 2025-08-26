#include "utils.h"
#include <time.h>
#include <stdio.h>

void get_iso_time_now(char *out, size_t maxlen) {
    time_t now = time(NULL);
    struct tm *gtm = gmtime(&now);
    strftime(out, maxlen, "%Y-%m-%dT%H:%M:%SZ", gtm);
}
