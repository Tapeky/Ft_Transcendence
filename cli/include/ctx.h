#ifndef CTX_H
# define CTX_H

# include <X11/Xlib.h>
# include "input.h"
# include "api.h"
# include "term.h"
# include "ws.h"
# include "json_defs.h"

# define C(x) console_component *x

typedef struct s_ctx
{
	Display					*dpy;
	Window					root_win;
	input_state				input;
	ws_ctx					ws_ctx;
	api_ctx					api_ctx;
	login					user_login;
	tournaments				tournaments;
	friends					friends;
	friend_pong_invite		pong_invite;
	friend_pong_accepted	pong_accepted;
	int						i_was_invited;
	int						i_am_ready;
	int						opponent_ready;

	struct
	{
		C(username_field);
		C(password_field);
		C(totp_field);
		C(login_error_label);
	}	login_view;
	struct
	{
		C(username_field);
		C(password_field);
		C(email_field);
		C(display_name_field);
		C(register_error_label);
	}	register_view;
	struct
	{
		list_view list_view;
		C(tournament_name);
	}	tournament_view;
	struct
	{
		list_view list_view;
		friend *selected_friend;
		C(friend_name);
		C(friend_challenge_text);
	}	friends_view;
	struct
	{
		C(from_username);
		C(invite_error);
	}	invite_overlay_view;
	struct
	{
		C(opponent_ready_message);
	}	get_ready_view;
}   ctx;

# undef C

int ctx_init(ctx *ctx, const char *api_endpoint_base, const char *ws_endpoint);
void ctx_deinit(ctx *ctx);

#endif
