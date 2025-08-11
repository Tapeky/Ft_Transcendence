#ifndef CTX_H
# define CTX_H

# include <X11/Xlib.h>
# include "input.h"
# include "api.h"
# include "ws.h"

typedef struct s_ctx
{
	Display		*dpy;
	Window		root_win;
	input_state	input;
	ws_ctx		ws_ctx;
	api_ctx		api_ctx;
}   ctx;

int ctx_init(ctx *ctx, const char *api_endpoint_base, const char *ws_endpoint);
void ctx_deinit(ctx *ctx);

#endif
