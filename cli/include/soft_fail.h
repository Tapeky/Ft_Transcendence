#ifndef SOFT_FAIL_H
# define SOFT_FAIL_H

// contains functions to clean and exit the program on fatal error
// as well as allocation functions that clean and exit on fail

# include "cJSON.h"
# include "ws.h"
# include "api.h"

__attribute__((noreturn)) void clean_and_fail(const char *fmt, ...);

void assert_api_request_success(api_request_result res, cJSON **store);
void assert_ws_xfer_success(ws_xfer_result res, int is_recv, cJSON **store);

void *xmalloc(size_t n);
char *xstrdup(const char *str);
void *xcalloc(size_t nmemb, size_t size);

#endif
