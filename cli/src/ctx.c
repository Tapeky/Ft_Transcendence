#include "ctx.h"

const char *ctx_init(ctx *ctx)
{
	ctx->dpy = XOpenDisplay(NULL);
	if (!ctx->dpy)
		return ("Unable to open a display");

	ctx->root_win = XDefaultRootWindow(ctx->dpy);
	if (!input_init(ctx))
	{
		XCloseDisplay(ctx->dpy);
		return ("Unable to grab keyboard");
	}
	return (NULL);
}

void ctx_deinit(ctx *ctx)
{
	if (ctx->dpy)
	{
		input_deinit(ctx);
		XCloseDisplay(ctx->dpy);
	}
}
