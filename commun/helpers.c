
#include "helpers.h"

void sleep_ms(long ms)
{
    struct timespec ts;
  ts.tv_sec = ms / 1000;
  ts.tv_nsec = (ms % 1000) * 1000000L;
  while (nanosleep(& ts, & ts) == -1) {
    /* si interrompu par un signal, on reprend */
    continue;
  }
}
