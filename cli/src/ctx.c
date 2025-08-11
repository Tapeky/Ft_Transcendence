#include "ctx.h"

int ctx_init(ctx *ctx, const char *api_endpoint_base, const char *ws_endpoint)
{
	ctx->dpy = XOpenDisplay(NULL);
	if (!ctx->dpy)
	{
		fprintf(stderr, "Unable to open a display\n");
		return (0);
	}

	ctx->root_win = XDefaultRootWindow(ctx->dpy);
	if (!input_init(ctx))
	{
		XCloseDisplay(ctx->dpy);
		ctx->dpy = NULL;
		fprintf(stderr, "Unable to grab keyboard");
		return (0);
	}

	CURLcode curl_err = curl_global_init(CURL_GLOBAL_ALL);
	if (curl_err)
	{
		fprintf(stderr, "curl_global_init() fail: %s\n", curl_easy_strerror(curl_err));
		ctx_deinit(ctx);
		return (0);
	}
	if (!api_ctx_init(&ctx->api_ctx, api_endpoint_base))
	{
		ctx_deinit(ctx);
		return (0);
	}
	if (!ws_ctx_init(&ctx->ws_ctx, ws_endpoint))
	{
		ctx_deinit(ctx);
		return (0);
	}
	return (1);
}

void ctx_deinit(ctx *ctx)
{
	if (!ctx)
		return ;
	if (ctx->dpy)
	{
		input_deinit(ctx);
		XCloseDisplay(ctx->dpy);
		ctx->dpy = NULL;
	}
	curl_global_cleanup();
	ws_ctx_deinit(&ctx->ws_ctx);
	api_ctx_deinit(&ctx->api_ctx);
}
