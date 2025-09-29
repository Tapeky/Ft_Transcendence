#include "soft_fail.h"
#include <string.h>
#include <stdlib.h>
#include <stdarg.h>

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
