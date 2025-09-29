#include "ws.h"

int ws_ctx_init(ws_ctx *ctx, const char *url)
{
	CURL *easy = curl_easy_init();
	if (!easy)
	{
		fprintf(stderr, "curl_easy_init() fail !\n");
		return (0);
	}
	curl_easy_setopt(easy, CURLOPT_CONNECT_ONLY, 2L);
	curl_easy_setopt(easy, CURLOPT_URL, url);
	CURLcode err = curl_easy_perform(easy);
	if (err)
	{
		fprintf(stderr, "curl_easy_perform() fail: %s\n", curl_easy_strerror(err));
		curl_easy_cleanup(easy);
		return (0);
	}
	ctx->curl = easy;
	curl_socket_t sockfd;
	curl_easy_getinfo(easy, CURLINFO_ACTIVESOCKET, &sockfd);
	ctx->sock = sockfd;
	return (1);
}

void ws_ctx_deinit(ws_ctx *ctx)
{
	if (ctx->curl)
	{
		curl_easy_cleanup(ctx->curl);
		ctx->curl = NULL;
	}
}
