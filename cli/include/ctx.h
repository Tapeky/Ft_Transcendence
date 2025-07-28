#ifndef CTX_H
# define CTX_H

#include <X11/Xlib.h>
#include "input.h"

typedef struct s_ctx
{
	Display		*dpy;
	Window		root_win;
	input_state	input;
}   ctx;

const char *ctx_init(ctx *ctx);
void ctx_deinit(ctx *ctx);

#endif
