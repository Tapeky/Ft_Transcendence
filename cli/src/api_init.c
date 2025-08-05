#include "api.h"
#include <string.h>

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
	curl_easy_setopt(easy, CURLOPT_POST, 1);
	curl_easy_setopt(easy, CURLOPT_POSTFIELDS, ctx->in_buf);
	
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

void api_ctx_deinit(api_ctx *ctx)
{
	curl_easy_cleanup(ctx->curl);
	curl_slist_free_all(ctx->header_list);
}
