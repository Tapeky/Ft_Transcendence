#include "ctx.h"
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>

extern ctx g_ctx;

#define DO_CLEANUP(error_message_expr) \
	do { \
		cdeinit(); \
		error_message_expr; \
		ctx_deinit(&g_ctx); \
		exit(EXIT_FAILURE); \
	} while (0)

void assert_api_request_success(api_request_result res, cJSON **store)
{
	if (res.err)
		DO_CLEANUP(print_api_request_result(&g_ctx.api_ctx, res, stderr));
	*store = res.json_obj;
}

void assert_ws_xfer_success(ws_xfer_result res, int is_recv, cJSON **store)
{
	if (res.err)
		DO_CLEANUP(ws_ctx_print_xfer_result(&g_ctx.ws_ctx, res, is_recv, stderr));
	*store = res.json_obj;
}

void *xmalloc(size_t n)
{
	void *ptr = malloc(n);
	if (!ptr)
		DO_CLEANUP(fprintf(stderr, "FATAL: malloc(): unable to allocate chunk of size %zu\n", n));
	return (ptr);
}

void *xcalloc(size_t nmemb, size_t size)
{
	void *ptr = calloc(nmemb, size);
	if (!ptr)
		DO_CLEANUP(fprintf(stderr, "FATAL: calloc(): unable to allocate chunk of size %zu * %zu\n", nmemb, size));
	return (ptr);
}

char *xstrdup(const char *str)
{
	char *copy = strdup(str);
	if (!copy)
		DO_CLEANUP(fprintf(stderr, "FATAL: strdup() fail\n"));
	return (copy);
}

__attribute__((noreturn)) void clean_and_fail(const char *fmt, ...)
{
	va_list va;
	va_start(va, fmt);
	DO_CLEANUP(if (fmt) vfprintf(stderr, fmt, va));
}
