#ifndef SOFT_FAIL_H
# define SOFT_FAIL_H

// contains functions to clean and exit the program on fatal error
// as well as allocation functions that clean and exit on fail

# include "cJSON.h"
# include "ctx.h"
# include "term.h"
# include <stdlib.h>

extern ctx g_ctx;

# define DO_CLEANUP(error_message_expr) \
	do { \
		cdeinit(); \
		error_message_expr; \
		ctx_deinit(&g_ctx); \
		exit(EXIT_FAILURE); \
	} while (0)

__attribute__((noreturn)) void clean_and_fail(const char *fmt, ...);

void *xmalloc(size_t n);
char *xstrdup(const char *str);
void *xcalloc(size_t nmemb, size_t size);

#endif
