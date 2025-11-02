#include "input.h"
#include "ctx.h"
#include <X11/XKBlib.h>
#include <poll.h>
#include <errno.h>
#include <stdio.h>
#include <string.h>

int input_init(ctx *ctx)
{
	return (!XGrabKeyboard(ctx->dpy, 
		ctx->root_win,
		False, 
		GrabModeAsync, 
		GrabModeAsync, 
		CurrentTime
	));
}

void input_deinit(ctx *ctx)
{
	XUngrabKeyboard(ctx->dpy, CurrentTime);
}

static void update_key_state(ctx *ctx, XKeyEvent xkey, int is_press)
{
	KeySym keysym = XkbKeycodeToKeysym(ctx->dpy, xkey.keycode, 0, xkey.state & ShiftMask);

	u32 bit_pos;
	for (bit_pos = 0; bit_pos < sizeof(observed_keys) / sizeof(observed_keys[0]); bit_pos++)
	{
		if (keysym == observed_keys[bit_pos])
		{
			if (is_press)
			{
				ctx->input.just_pressed.n |= (1 << bit_pos); // set bit
				ctx->input.just_released.n &= ~(1 << bit_pos); // clear bit
			}
			else
			{
				ctx->input.just_released.n |= (1 << bit_pos); // set bit
				ctx->input.just_pressed.n &= ~(1 << bit_pos); // clear bit
			}
			break;
		}
	}
}

void input_poll(ctx *ctx)
{
	ctx->input.just_pressed.n = 0;
	ctx->input.just_released.n = 0;
	XEvent event;
	while (XPending(ctx->dpy))
	{
		XNextEvent(ctx->dpy, &event);
		if (event.type == KeyPress || event.type == KeyRelease)
		{
			if (event.type == KeyRelease && XPending(ctx->dpy))
			{
				// check for auto-repeating key and remove it
				XEvent next_event;
				XPeekEvent(ctx->dpy, &next_event);
				if (next_event.type == KeyPress
					&& next_event.xkey.time == event.xkey.time
					&& next_event.xkey.keycode == event.xkey.keycode)
				{
					XNextEvent(ctx->dpy, &next_event); // consume event
					continue;
				}
			}
			update_key_state(ctx, event.xkey, event.type == KeyPress);
		}
	}
	ctx->input.pressed.n |= ctx->input.just_pressed.n; // add all bits whose inputs were just pressed
	ctx->input.pressed.n &= ~ctx->input.just_released.n; // clear all bits whose inputs were just released
}

#define KEY_BACKSPACE 0x16

void input_loop(ctx *ctx, on_input_func on_key_event, void (*on_ws_sock_event)(struct s_ctx *ctx))
{
	XEvent event;
	struct pollfd fds[2] = {
		{.fd = ConnectionNumber(ctx->dpy), .revents = 0, .events = POLLIN},
		{.fd = ctx->ws_ctx.sock, .revents = 0, .events = POLLIN}
	};
	while (1)
	{
		int err = poll(fds, 2, -1);
		if (err < 0)
		{
			if (errno == EINTR)
				continue;
			fprintf(stderr, "poll() error: %s", strerror(errno));
			break;
		}
		if (fds[1].revents & POLLIN)
			on_ws_sock_event(ctx);
		if (!(fds[0].revents & POLLIN))
			continue;
		while (XPending(ctx->dpy))
		{
			XNextEvent(ctx->dpy, &event);
			if (event.type == KeyPress || event.type == KeyRelease)
			{
				if (event.type == KeyRelease && event.xkey.keycode != KEY_BACKSPACE && XPending(ctx->dpy))
				{
					// check for auto-repeating key and remove it
					XEvent next_event;
					XPeekEvent(ctx->dpy, &next_event);
					if (next_event.type == KeyPress
						&& next_event.xkey.time == event.xkey.time
						&& next_event.xkey.keycode == event.xkey.keycode)
					{
						XNextEvent(ctx->dpy, &next_event); // consume event
						continue;
					}
				}
				KeySym keysym = XkbKeycodeToKeysym(ctx->dpy, event.xkey.keycode, 0, event.xkey.state & ShiftMask);
				if (on_key_event(ctx, keysym, event.type == KeyPress))
					goto end;
			}
		}
	}
	end:
	// burn remaining events
	while (XPending(ctx->dpy))
		XNextEvent(ctx->dpy, &event);
}
