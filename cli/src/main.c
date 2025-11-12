#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>
#include <string.h>
#define JSON_DEF_IMPLEMENTATION
#include "json_def.h"
#include "api.h"
#include "ws.h"
#include "soft_fail.h"
#include "json_defs.h"
#include "ctx.h"
#include "term.h"

ctx g_ctx = {0}; 

static int on_key_event(ctx *ctx, KeySym key, int on_press)
{
	(void)ctx;
	if (key == XK_Left && on_press)
	{
		if (list_view_update(&ctx->tournament_view.list_view, ctx, -1)
			|| list_view_update(&ctx->friends_view.list_view, ctx, -1))
			return (0);
	}
	else if (key == XK_Right && on_press)
	{
		if (list_view_update(&ctx->tournament_view.list_view, ctx, 1)
			|| list_view_update(&ctx->friends_view.list_view, ctx, 1))
			return (0);
	}
	else if (on_press && key == XK_Escape)
	{
		if (cur_term_window_type == term_window_type_LOGIN)
			return (1); // exit
		// if we go back to the login menu
		if (cprevious_window(1))
		{
			if (cur_term_window_type == term_window_type_LOGIN)
			{
				api_ctx_remove_token(&ctx->api_ctx);
				json_clean_obj(&ctx->user_login, login_def);
			}
			else if (cur_term_window_type == term_window_type_PONG_INVITE_OVERLAY && ctx->pong_invite._json_)
			{
				REQ_WS_INVITE_DECLINE(ctx->ws_ctx.send_buf, ctx->pong_invite.inviteId);
				ws_send(&ctx->ws_ctx);
				json_clean_obj(&ctx->pong_invite, friend_pong_invite_def);
			}
		}
	}
	chandle_key_event(key, on_press);
	return (0);
}

static void update_tournament_view(void *obj, void *param)
{
	tournament *t = obj;
	ctx *ctx = param;

	if (t)
	{
		label_update_text(ctx->tournament_view.tournament_name, t->name, 0);
	}
	else
	{
		label_update_text(ctx->tournament_view.tournament_name, "NO TOURNAMENT", 0);
	}
}

static void refresh_tournaments(ctx *ctx)
{
	cswitch_window(term_window_type_TOURNAMENT_VIEW, 0);
	json_clean_obj(&ctx->tournaments, tournaments_def);
	do_api_request_to_def(&ctx->api_ctx, "api/local-tournaments/history", GET, tournaments_def, &ctx->tournaments);
	ctx->tournament_view.list_view.list_cursor = 0;
	list_view_update(&ctx->tournament_view.list_view, ctx, 0);
}

static int json_success(cJSON *json, char **error_string)
{
	cJSON *success_obj = cJSON_GetObjectItem(json, "success");
	if (!success_obj || !(success_obj->type & (cJSON_True | cJSON_False)))
	{
		*error_string = "Invalid JSON returned";
		return (0);
	}
	if (success_obj->type == cJSON_True)
	{
		*error_string = NULL;
		return (1);
	}
	cJSON *error_obj = cJSON_GetObjectItem(json, "error");
	if (!error_obj || error_obj->type != cJSON_String)
		*error_string = "Unspecified error";
	else
		*error_string = error_obj->valuestring;
	return (0);
}

static void attempt_login(ctx *ctx)
{
	REQ_API_LOGIN(
		ctx->api_ctx.in_buf,
		ctx->login_view.username_field->u.c_text_area.buf,
		ctx->login_view.password_field->u.c_text_area.buf,
		ctx->login_view.totp_field->u.c_text_area.buf
	);
	cJSON *json;
	json = do_api_request(&ctx->api_ctx, "api/auth/login", POST);
	char *error;
	if (!json_success(json, &error))
	{
		label_update_text(ctx->login_view.login_error_label, xstrdup(error), 1);
		cJSON_Delete(json);
		crefresh(0);
	}
	else
	{
		json_parse_from_def_force(json, login_def, &ctx->user_login);

		if (!api_ctx_set_token(&ctx->api_ctx, ctx->user_login.data.token))
			clean_and_fail("api_ctx_append_token() fail\n");
		REQ_WS_LOGIN(ctx->ws_ctx.send_buf, ctx->user_login.data.token);
		ws_send(&ctx->ws_ctx);
	}
}

static void handle_login_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		attempt_login((ctx *)param);
}

static void attempt_register(ctx *ctx)
{
	REQ_API_REGISTER(
		ctx->api_ctx.in_buf,
		ctx->register_view.username_field->u.c_text_area.buf,
		ctx->register_view.email_field->u.c_text_area.buf,
		ctx->register_view.password_field->u.c_text_area.buf,
		ctx->register_view.display_name_field->u.c_text_area.buf
	);
	cJSON *json;
	json = do_api_request(&ctx->api_ctx, "api/auth/register", POST);
	char *error;
	if (!json_success(json, &error))
	{
		label_update_text(ctx->register_view.register_error_label, xstrdup(error), 1);
		cJSON_Delete(json);
		crefresh(0);
	}
	else
	{
		json_parse_from_def_force(json, login_def, &ctx->user_login);

		if (!api_ctx_set_token(&ctx->api_ctx, ctx->user_login.data.token))
			clean_and_fail("api_ctx_append_token() fail\n");
		REQ_WS_LOGIN(ctx->ws_ctx.send_buf, ctx->user_login.data.token);
		ws_send(&ctx->ws_ctx);
	}
}

static void handle_register_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		attempt_register((ctx *)param);
}

static void handle_register_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	(void)param;
	if (press)
		cswitch_window(term_window_type_REGISTER, 1);
}

static void handle_tournament_enter_button(console_component *button, int press, void *param)
{
	(void)button;
	ctx *ctx = param;
	if (press)
	{
		(void)ctx;
		// TODO: enter tournament
	}
}

static void handle_friend_challenge_button(console_component *button, int press, void *param)
{
	(void)button;
	ctx *ctx = param;
	const char invite_fmt[] = "api/friends/pong-invite/%d";
	char endpoint_buf[sizeof(invite_fmt) + 20];
	if (press && ctx->friends_view.selected_friend)
	{
		strcpy(ctx->api_ctx.in_buf, "{}");
		snprintf(endpoint_buf, sizeof(endpoint_buf), invite_fmt, ctx->friends_view.selected_friend->id);
		cJSON *json = do_api_request(&ctx->api_ctx, endpoint_buf, POST);
		char *error;
		if (!json_success(json, &error))
			label_update_text(ctx->friends_view.friend_challenge_text, xstrdup(error), 1);
		else
			label_update_text(ctx->friends_view.friend_challenge_text, "Request sent !", 0);
		crefresh(0);
		cJSON_Delete(json);
	}

}

static void update_friends_view(void *obj, void *param)
{
	friend *f = obj;
	ctx *ctx = param;
	
	label_update_text(ctx->friends_view.friend_challenge_text, NULL, 0);
	if (f)
	{
		ctx->friends_view.selected_friend = f;
		label_update_text(ctx->friends_view.friend_name, f->display_name, 0);
	}
	else
	{
		ctx->friends_view.selected_friend = NULL;
		label_update_text(ctx->friends_view.friend_name, "NO FRIEND :(", 0);
	}
}

static void refresh_friends(ctx *ctx)
{
	cswitch_window(term_window_type_FRIENDS_VIEW, 0);

	json_clean_obj(&ctx->friends, friends_def);
	do_api_request_to_def(&ctx->api_ctx, "api/friends", GET, friends_def, &ctx->friends);
	ctx->friends_view.list_view.list_cursor = 0;
	list_view_update(&ctx->friends_view.list_view, ctx, 0);
}

static void handle_tournament_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		refresh_tournaments((ctx *)param);
}

static void handle_friends_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		refresh_friends((ctx *)param);
}

static void handle_invite_decline_button(console_component *button, int press, void *param)
{
	(void)button;
	ctx *ctx = param;
	if (press && ctx->pong_invite._json_)
	{
		REQ_WS_INVITE_DECLINE(ctx->ws_ctx.send_buf, ctx->pong_invite.inviteId);
		ws_send(&ctx->ws_ctx);
		json_clean_obj(&ctx->pong_invite, friend_pong_invite_def);
		cprevious_window(1);
	}
}

static void handle_invite_accept_button(console_component *button, int press, void *param)
{
	(void)button;
	ctx *ctx = param;
	if (press && ctx->pong_invite._json_)
	{
		REQ_WS_INVITE_ACCEPT(ctx->ws_ctx.send_buf, ctx->pong_invite.inviteId);
		ws_send(&ctx->ws_ctx);
		json_clean_obj(&ctx->pong_invite, friend_pong_invite_def);
	}
}

static void game_loop(ctx *ctx);

static void handle_get_ready_button(console_component *button, int press, void *param)
{
	(void)button;
	ctx *ctx = param;
	if (press && ctx->pong_accepted._json_)
	{
		REQ_WS_PLAYER_READY(ctx->ws_ctx.send_buf, ctx->pong_accepted.gameId);
		ws_send(&ctx->ws_ctx);
		ctx->i_am_ready = 1;
		json_clean_obj(&ctx->pong_accepted, friend_pong_accepted_def);
		if (ctx->opponent_ready)
		{
			cswitch_window(term_window_type_PONG_GAME, 1);
			game_loop(ctx);
		}
	}
}

static void init_windows(ctx *ctx)
{
	console_component component;

	cswitch_window(term_window_type_LOGIN, 0);
	{
		label_init(&component, 2, 2, "USERNAME", 0);
		ccomponent_add(component);

		label_init(&component, 2, 6, "PASSWORD", 0);
		ccomponent_add(component);
		
		label_init(&component, 40, 6, "2FA KEY", 0);
		ccomponent_add(component);		

		ctx->login_view.username_field = add_pretty_textarea(3, 3, 32, "...", 0);
		ctx->login_view.password_field = add_pretty_textarea(3, 7, 32, "...", 1);
		ctx->login_view.totp_field = add_pretty_textarea(41, 7, 6, "XXXXXX", 0);

		add_pretty_button(15, 10, " LOGIN ", handle_login_button, ctx);

		button_init(&component, 15, 14, "REGISTER", handle_register_window_switch_button, ctx);
		ccomponent_add(component);

		label_init(&component, 2, 17, NULL, 0);
		ctx->login_view.login_error_label = ccomponent_add(component);
	}

	cswitch_window(term_window_type_REGISTER, 0);
	{
		label_init(&component, 2, 2, "USERNAME", 0);
		ccomponent_add(component);
		ctx->register_view.username_field = add_pretty_textarea(3, 3, 32, "...", 0);

		label_init(&component, 2, 6, "PASSWORD", 0);
		ccomponent_add(component);
		ctx->register_view.password_field = add_pretty_textarea(3, 7, 32, "...", 1);

		label_init(&component, 2, 10, "EMAIL", 0);
		ccomponent_add(component);
		ctx->register_view.email_field = add_pretty_textarea(3, 11, 32, "...", 0);

		label_init(&component, 2, 14, "DISPLAY NAME", 0);
		ccomponent_add(component);
		ctx->register_view.display_name_field = add_pretty_textarea(3, 15, 32, "...", 0);

		add_pretty_button(14, 18, " REGISTER ", handle_register_button, ctx);

		label_init(&component, 2, 21, NULL, 0);
		ctx->register_view.register_error_label = ccomponent_add(component);
	}

	cswitch_window(term_window_type_DASHBOARD, 0);
	{
		label_init(&component, 2, 2, "DASHBOARD", 0);
		add_pretty_button(15, 6, " TOURNAMENTS ", handle_tournament_window_switch_button, ctx);

		add_pretty_button(15, 11, " FRIENDS ", handle_friends_window_switch_button, ctx);
	}

	cswitch_window(term_window_type_FRIENDS_VIEW, 0);
	{
		const int BOX_X = 4;
		const int BOX_Y = 4;
		const int BOX_W = 50;
		const int BOX_H = 14;

		list_view_init(&ctx->friends_view.list_view, BOX_X, BOX_Y, BOX_W, BOX_H, update_friends_view, &ctx->friends.data.size, (void **)&ctx->friends.data.arr, sizeof(friend));
		label_init(&component, BOX_X, BOX_Y - 1, "FRIENDS", 0);
		ccomponent_add(component);
		label_init(&component, BOX_X + 2, BOX_Y + 2, NULL, 0);
		ctx->friends_view.friend_name = ccomponent_add(component);
		button_init(&component, BOX_X + 4, BOX_Y + BOX_H - 3, "CHALLENGE", handle_friend_challenge_button, ctx);
		ccomponent_add(component);
		label_init(&component, BOX_X + 4, BOX_Y + BOX_H - 2, NULL, 0);
		label_wrap_around(&component, BOX_W - 5);
		ctx->friends_view.friend_challenge_text = ccomponent_add(component);
	}
	
	cswitch_window(term_window_type_TOURNAMENT_VIEW, 0);
	{
		const int BOX_X = 4;
		const int BOX_Y = 4;
		const int BOX_W = 50;
		const int BOX_H = 14;

		list_view_init(&ctx->tournament_view.list_view, BOX_X, BOX_Y, BOX_W, BOX_H, update_tournament_view, &ctx->tournaments.data.tournaments.size, (void **)&ctx->tournaments.data.tournaments.arr, sizeof(tournament));
		label_init(&component, BOX_X, BOX_Y - 1, "TOURNAMENTS", 0);
		ccomponent_add(component);
		label_init(&component, BOX_X + 2, BOX_Y + 1, NULL, 0);
		ctx->tournament_view.tournament_name = ccomponent_add(component);
		button_init(&component, BOX_X + 4, BOX_Y + BOX_H - 2, "ENTER", handle_tournament_enter_button, ctx);
		ccomponent_add(component);
	}
	cswitch_window(term_window_type_PONG_INVITE_OVERLAY, 0);
	{
		const int BOX_X = 4;
		const int BOX_Y = 4;
		const int BOX_W = 20;
		const int BOX_H = 8;

		box_init(
			&component, BOX_X, BOX_Y, BOX_W, BOX_H, DEFAULT_BOX_STYLE
		);
		ccomponent_add(component);
		label_init(&component, BOX_X + 1, BOX_Y + 1, NULL, 0);
		label_wrap_around(&component, BOX_W - 1);
		ctx->invite_overlay_view.from_username = ccomponent_add(component);
		label_init(&component, BOX_X + 1, BOX_Y + 3, "has invited you to play a game !!", 0);
		label_wrap_around(&component, BOX_W - 1);
		ccomponent_add(component);
		button_init(&component, BOX_X + 4, BOX_Y + BOX_H - 2, "ACCEPT", handle_invite_accept_button, ctx);
		ccomponent_add(component);
		button_init(&component, BOX_X + 11, BOX_Y + BOX_H - 2, "DECLINE", handle_invite_decline_button, ctx);
		ccomponent_add(component);
		label_init(&component, BOX_X + 1, BOX_Y + BOX_H + 1, NULL, 0);
		ctx->invite_overlay_view.invite_error = ccomponent_add(component);
	}
	cswitch_window(term_window_type_PONG_GET_READY, 0);
	{
		const int BOX_X = 4;
		const int BOX_Y = 4;
		const int BOX_W = 22;
		const int BOX_H = 9;

		box_init(
			&component, BOX_X, BOX_Y, BOX_W, BOX_H, DEFAULT_BOX_STYLE
		);
		ccomponent_add(component);
		label_init(&component, BOX_X + 4, BOX_Y + 4, "GET READY !!", 0);
		label_wrap_around(&component, BOX_W - 4);
		ccomponent_add(component);
		label_init(&component, BOX_X + 4, BOX_Y + 6, NULL, 0);
		label_wrap_around(&component, BOX_W - 4);
		ctx->get_ready_view.opponent_ready_message = ccomponent_add(component);
		ccomponent_add(component);
		add_pretty_button(BOX_X + 4, BOX_Y + BOX_H - 3, "GO", handle_get_ready_button, ctx);
	}
}

static const char * get_ws_message(cJSON *json)
{
	cJSON *message_obj = cJSON_GetObjectItem(json, "message");
	if (!message_obj || !cJSON_IsString(message_obj))
		return ("Unspecified");
	return (message_obj->valuestring);
}

# define FULL_LINE "\u2503"
# define HALF_UP_LINE "\u2579"
# define HALF_DOWN_LINE "\u257B"
# define FULL_BLOCK "\u2588"
# include <math.h>

static void render_paddle(u16 x, float y, float height)
{
	float integral, fractional;
	
	float paddle_start = y - height / 2;
	float paddle_end = y + height / 2;
	fractional = modff(paddle_start, &integral);
	if (fractional < 0.45)
	{
		cursor_goto(x, paddle_start - 1);
		PUTS(HALF_DOWN_LINE);
	}
	int pos = paddle_start;
	int paddle_end_int = paddle_end;
	while (pos < paddle_end_int)
	{
		cursor_goto(x, pos++);
		PUTS(FULL_LINE);
	}
	fractional = modff(paddle_end, &integral);
	if (fractional > 0.55)
	{
		cursor_goto(x, paddle_end_int);
		PUTS(HALF_UP_LINE);
	}
}

static void render_ball(float x, float y, float width_ratio, float height_ratio)
{
	const float true_ball_width = BALL_SIZE * width_ratio;
	const float true_ball_height = BALL_SIZE * height_ratio;
	float ball_start_x, ball_start_y;
	const float ball_end_x = x + true_ball_width;
	const float ball_end_y = y + true_ball_height;
	
	ball_start_y = y - true_ball_height;
	while (ball_start_y < ball_end_y)
	{
		ball_start_x = x - true_ball_width;
		while (ball_start_x < ball_end_x)
		{
			float dist = ((x - ball_start_x) * (x - ball_start_x) / (true_ball_width * true_ball_width)) + ((y - ball_start_y) * (y - ball_start_y) / (true_ball_height * true_ball_height));
			if (dist <= 1)
			{
				cursor_goto(ball_start_x, ball_start_y);
				PUTS(FULL_BLOCK);
			}
			ball_start_x++;
		}
		ball_start_y++;
	}
}

static void render_pong_scene(const game_state *state)
{
	PUTS(ESC_CLEAR_SCREEN);
	if (c_x >= 10 && c_y >= 5)
	{
		float height_ratio = c_y / (float)ARENA_HEIGHT;
		float width_ratio = c_x / (float)ARENA_WIDTH;

		float paddle_height = PADDLE_HEIGHT * height_ratio;
		render_paddle(1, state->gameState.leftPaddleY * height_ratio, paddle_height);
		render_paddle(c_x - 1, state->gameState.rightPaddleY  * height_ratio, paddle_height);
		render_ball(state->gameState.ballX * width_ratio, state->gameState.ballY * height_ratio, width_ratio, height_ratio);
	}
	fflush(stdout);
}

static void game_loop(ctx *ctx)
{
	int last_up = -1;
	int last_down = -1;
	while (1)
	{
		input_poll(ctx);
		if (ctx->input.pressed.up != last_up || ctx->input.pressed.down != last_down)
		{
			last_up = ctx->input.pressed.up;
			last_down = ctx->input.pressed.down;
			REQ_WS_INPUT_UPDATE(ctx->ws_ctx.send_buf, last_up, last_down);
			ws_send(&ctx->ws_ctx);
		}
		ws_recv_data data = ws_recv(&ctx->ws_ctx);
		if (!strcmp(data.type, "simple_pong_state") || !strcmp(data.type, "friend_pong_state"))
		{
			game_state state;
			json_parse_from_def_force(data.json, game_state_def, &state);
			if (!state.gameState.gameOver)
			{
				render_pong_scene(&state);
			}
		}
		else if (!strcmp(data.type, "opponent_disconnected"))
		{
			cJSON_Delete(data.json);
			break;
		}
		cJSON_Delete(data.json);
	}
	input_burn_events(ctx);
	cprevious_window(0);
	if (ctx->i_was_invited)
		cprevious_window(0);
	ctx->i_was_invited = 0;
	cprevious_window(1);
}

static void on_sock_event(ctx *ctx)
{
	ws_recv_data data = ws_recv(&ctx->ws_ctx);

	int delete_json = 1;
	if (!strcmp(data.type, "auth_success"))
	{
		cswitch_window(term_window_type_DASHBOARD, 1);
	}
	else if (!strcmp(data.type, "auth_error"))
	{
		label_update_text(ctx->login_view.login_error_label, "Websocket Login Error", 0);
		json_clean_obj(&ctx->user_login, login_def);
		crefresh(0);
	}
	else if (!strcmp(data.type, "friend_pong_invite"))
	{
		if (cur_term_window_type != term_window_type_PONG_INVITE_OVERLAY)
		{
			json_parse_from_def_force(data.json, friend_pong_invite_def, &ctx->pong_invite);
			label_update_text(ctx->invite_overlay_view.from_username, ctx->pong_invite.fromUsername, 0);
			cswitch_window(term_window_type_PONG_INVITE_OVERLAY, 1);
			ctx->i_was_invited = 1;
			ctx->opponent_ready = 0;
			ctx->i_am_ready = 0;
			delete_json = 0;
		}
	}
	else if (!strcmp(data.type, "friend_pong_accepted") || !strcmp(data.type, "simple_pong_start"))
	{
		if (cur_term_window_type != term_window_type_PONG_GET_READY)
		{
			json_parse_from_def_force(data.json, friend_pong_accepted_def, &ctx->pong_accepted);
			label_update_text(ctx->get_ready_view.opponent_ready_message, NULL, 0);
			cswitch_window(term_window_type_PONG_GET_READY, 1);
			delete_json = 0;
		}
	}
	else if (!strcmp(data.type, "friend_pong_error"))
	{
		if (cur_term_window_type == term_window_type_PONG_INVITE_OVERLAY)
		{
			label_update_text(ctx->invite_overlay_view.invite_error, xstrdup(get_ws_message(data.json)), 1);
			crefresh(0);
		}
	}
	else if (!strcmp(data.type, "player_ready_update"))
	{
		if (cur_term_window_type == term_window_type_PONG_GET_READY)
		{
			ctx->opponent_ready = 1;
			if (ctx->i_am_ready)
			{
				cswitch_window(term_window_type_PONG_GAME, 1);
				game_loop(ctx);
			}
			else
			{
				label_update_text(ctx->get_ready_view.opponent_ready_message, xstrdup(get_ws_message(data.json)), 1);
			}
		}
	}
	if (delete_json)
		cJSON_Delete(data.json);
}

int main()
{
	ctx *ctx = &g_ctx;
	if (!ctx_init(ctx, "https://localhost:8443/", "wss://localhost:8443/ws"))
	{
		dprintf(STDERR_FILENO, "ctx_init fail\n");
		return (EXIT_FAILURE);
	}
	cinit();

	init_windows(ctx);
	creset_window_stack();
	cswitch_window(term_window_type_LOGIN, 1);

	input_loop(ctx, on_key_event, on_sock_event);

	ctx_deinit(&g_ctx);
	cdeinit();
	return (EXIT_SUCCESS);
}
