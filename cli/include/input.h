#ifndef INPUT_H
# define INPUT_H

# include "types.h"
# include <X11/keysym.h>
# include <X11/Xlib.h>

typedef struct s_ctx ctx;

static const KeySym observed_keys[] = {
	XK_Up,
	XK_Down,
	XK_Left,
	XK_Right,
	XK_Escape
};

typedef union
{
	struct
	{
		u8	up: 1;
		u8	down: 1;
		u8	left: 1;
		u8	right: 1;
		u8	escape: 1;
	};
	u64 n;
}	input_bits;

typedef struct
{
	input_bits	just_pressed;
	input_bits	just_released;
	input_bits	pressed;
}   input_state;

int input_init(ctx *ctx);
void input_deinit(ctx *ctx);
void input_poll(ctx *ctx);


#endif
