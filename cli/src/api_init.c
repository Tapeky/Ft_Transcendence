#include "api.h"
#include <string.h>
#include <stdlib.h>

static size_t api_ctx_writer(char *data, size_t size, size_t nmemb, void *clientp)
{
	size_t realsize = size * nmemb;
	api_ctx *ctx = (api_ctx *)clientp;
 
	if (ctx->out_buf_cursor + realsize + 1 > JSON_BUFFER_SIZE)
		return (CURL_WRITEFUNC_ERROR);
	memcpy(&(ctx->out_buf[ctx->out_buf_cursor]), data, realsize);
	ctx->out_buf_cursor += realsize;
	ctx->out_buf[ctx->out_buf_cursor] = 0;
 
	return realsize;
}

int	api_ctx_init(api_ctx *ctx, const char *api_base_url)
{
	memset(ctx, 0, sizeof *ctx);

	size_t api_base_url_len = strlen(api_base_url);
	if (api_base_url_len < 5)
	{
		fprintf(stderr, "base API URL too short\n");
		return (0);
	}
	if (api_base_url_len > 500)
	{
		fprintf(stderr, "base API URL too long\n");
		return (0);
	}
	ctx->api_base_url = api_base_url;
	ctx->api_url_base_len = api_base_url_len;
	strcpy(ctx->api_url_buf, ctx->api_base_url);
	if (ctx->api_base_url[ctx->api_url_base_len - 1] != '/')
		ctx->api_url_buf[ctx->api_url_base_len++] = '/'; // leave a trailing slash at the end

	CURL *easy = curl_easy_init();
	if (!easy)
	{
		fprintf(stderr, "curl_easy_init() fail\n");
		return (0);
	}
    curl_easy_setopt(easy, CURLOPT_WRITEFUNCTION, api_ctx_writer);
    curl_easy_setopt(easy, CURLOPT_WRITEDATA, (void *)ctx);
	curl_easy_setopt(easy, CURLOPT_POSTFIELDS, ctx->in_buf);
    curl_easy_setopt(easy, CURLOPT_SSL_VERIFYPEER, 0L);
    curl_easy_setopt(easy, CURLOPT_SSL_VERIFYHOST, 0L);

	struct curl_slist *list = NULL;
	if (!(
    	(list = curl_slist_append(NULL, "Content-Type: application/json")) &&
    	(list = curl_slist_append(list, "Accept: application/json"))
	))
	{
		fprintf(stderr, "curl_slist_append() fail\n");
		curl_easy_cleanup(easy);
		return (0);
	}
	curl_easy_setopt(easy, CURLOPT_HTTPHEADER, list);
	ctx->header_list = list;
	ctx->curl = easy;
	
	return (1);
}

int api_ctx_set_token(api_ctx *ctx, const char *token)
{
	const char prepend[] = "Authorization: Bearer ";
	
	size_t token_len = strlen(token);
	char *str = malloc(token_len + sizeof(prepend));
	if (!str)
		return (0);
	memcpy(str, prepend, sizeof(prepend) - 1);
	strcpy(str + sizeof(prepend) - 1, token);

	struct curl_slist *new_list = curl_slist_append(ctx->header_list, str);
	free(str);
	if (!new_list)
		return (0);
	curl_easy_setopt(ctx->curl, CURLOPT_HTTPHEADER, new_list);
	return (1);
}

void api_ctx_remove_token(api_ctx *ctx)
{
	const char header[] = "Authorization:";
	struct curl_slist *list = ctx->header_list;
	struct curl_slist *previous = NULL;
	while (list)
	{
		if (!strncmp(list->data, header, sizeof(header) - 1))
		{
			if (!previous)
			{
				curl_easy_setopt(ctx->curl, CURLOPT_HTTPHEADER, NULL);
				ctx->header_list = NULL;
			}
			else
			{
				struct curl_slist *next = list->next;
				free(list->data);
				free(list);
				previous->next = next;
				return;
			}
		}
		previous = list;
		list = list->next;
	}
}

void api_ctx_deinit(api_ctx *ctx)
{
	if (ctx->curl)
	{
		curl_easy_cleanup(ctx->curl);
		ctx->curl = NULL;
	}
	if (ctx->header_list)
	{
		curl_slist_free_all(ctx->header_list);
		ctx->header_list = NULL;
	}
}
