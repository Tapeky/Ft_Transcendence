#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <curl/curl.h>
#include <string.h>
#include "json_def.h"
#include "api.h"
#include "ws.h"
#include "soft_fail.h"
#include "json_defs.h"
#include "ctx.h"
#include "term.h"

ctx g_ctx = {0};

void update_tournament_view(ctx *ctx);

int on_key_event(ctx *ctx, KeySym key, int on_press)
{
	(void)ctx;
	if (cur_term_window_type == term_window_type_TOURNAMENT_VIEW && on_press)
	{
		if (key == XK_Left)
		{
			if (ctx->tournament_view.tournament_cursor)
			{
				--ctx->tournament_view.tournament_cursor;
				update_tournament_view(ctx);
				crefresh(1);
			}
		}
		else if (key == XK_Right)
		{
			if (ctx->tournament_view.tournament_cursor + 1 < ctx->tournaments.data.size)
			{
				++ctx->tournament_view.tournament_cursor;
				update_tournament_view(ctx);
				crefresh(1);
			}
		}
		else if (key == XK_b)
			cswitch_window(term_window_type_DASHBOARD, 1);
	}
	chandle_key_event(key, on_press);
	return (key == XK_Escape);
}

void update_tournament_view(ctx *ctx)
{
	size_t i = ctx->tournament_view.tournament_cursor;
	size_t n = ctx->tournaments.data.size;

	tournament *t = &ctx->tournaments.data.arr[i];

	label_update_text(ctx->tournament_view.tournament_name, t->name, 0);
	label_update_text(ctx->tournament_view.tournament_description, t->description, 0);

	if (!i)
		component_hide(ctx->tournament_view.left_arrow);
	else
		component_show(ctx->tournament_view.left_arrow);
	if (i + 1 == n)
		component_hide(ctx->tournament_view.right_arrow);
	else
		component_show(ctx->tournament_view.right_arrow);
}

void refresh_tournaments(ctx *ctx)
{
	cswitch_window(term_window_type_TOURNAMENT_VIEW, 0);
	if (ctx->tournaments._json_)
		json_clean_obj(&ctx->tournaments, tournaments_def);
	do_api_request_to_def(&ctx->api_ctx, "api/tournaments", GET, tournaments_def, &ctx->tournaments);
	ctx->tournament_view.tournament_cursor = 0;
	component_hide(ctx->tournament_view.left_arrow);
	
	size_t number_of_tournaments = ctx->tournaments.data.size;
	if (number_of_tournaments)
		update_tournament_view(ctx);

	crefresh(1);
}

void attempt_login(ctx *ctx)
{
	REQ_API_LOGIN(
		ctx->api_ctx.in_buf,
		ctx->login_view.username_field->u.c_text_area.buf,
		ctx->login_view.password_field->u.c_text_area.buf
	);
	cJSON *json;
	json = do_api_request(&ctx->api_ctx, "api/auth/login", POST);
	if (cJSON_GetObjectItem(json, "success")->type == cJSON_False)
	{
		label_update_text(ctx->login_view.login_error_label, xstrdup(cJSON_GetObjectItem(json, "error")->valuestring), 1);
		cJSON_Delete(json);
		crefresh(0);
	}
	else
	{
		json_parse_from_def_force(json, login_def, &ctx->user_login);

		if (!api_ctx_append_token(&ctx->api_ctx, ctx->user_login.data.token))
			clean_and_fail("api_ctx_append_token() fail\n");
		cswitch_window(term_window_type_DASHBOARD, 1);
	}
}

void handle_login_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		attempt_login((ctx *)param);
}

void handle_tournament_enter_button(console_component *button, int press, void *param)
{
	(void)button;
	ctx *ctx = param;
	if (press)
	{
		(void)ctx;
		// TODO: enter tournament
	}
}

void handle_tournament_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		refresh_tournaments((ctx *)param);
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

		ctx->login_view.username_field = add_pretty_textarea(3, 3, 32, "...", 0);
		ctx->login_view.password_field = add_pretty_textarea(3, 7, 32, "...", 1);

		strcpy(ctx->login_view.username_field->u.c_text_area.buf, "admin@transcendence.com");
		strcpy(ctx->login_view.password_field->u.c_text_area.buf, "admin123");

		add_pretty_button(3, 15, " LOGIN ", handle_login_button, ctx);

		label_init(&component, 2, 18, NULL, 0);
		ctx->login_view.login_error_label = ccomponent_add(component);
	}

	cswitch_window(term_window_type_DASHBOARD, 0);
	{
		label_init(&component, 2, 2, "DASHBOARD", 0);
		add_pretty_button(15, 6, " TOURNAMENTS ", handle_tournament_window_switch_button, ctx);

		add_pretty_button(15, 11, " FRIENDS ", NULL, NULL);
	}
	
	cswitch_window(term_window_type_TOURNAMENT_VIEW, 0);
	{
		const int BOX_X = 4;
		const int BOX_Y = 4;
		const int BOX_W = 50;
		const int BOX_H = 14;

		label_init(&component, BOX_X, BOX_Y - 1, "TOURNAMENTS", 0);
		ccomponent_add(component);
		box_init(&component,
			BOX_X, BOX_Y, BOX_W, BOX_H,
			'-', '-', '|', '|',
			'+', '+', '+', '+'
		);
		ccomponent_add(component);
		label_init(&component, BOX_X - 2, BOX_Y + BOX_H / 2, "<", 0);
		ctx->tournament_view.left_arrow = ccomponent_add(component);
		label_init(&component, BOX_X + BOX_W + 1, BOX_Y + BOX_H / 2, ">", 0);
		ctx->tournament_view.right_arrow = ccomponent_add(component);
		label_init(&component, BOX_X + 2, BOX_Y + 1, NULL, 0);
		ctx->tournament_view.tournament_name = ccomponent_add(component);
		label_init(&component, BOX_X + 2, BOX_Y + 3, NULL, 0);
		label_wrap_around(&component, BOX_W - 3);
		ctx->tournament_view.tournament_description = ccomponent_add(component);
		button_init(&component, BOX_X + 4, BOX_Y + BOX_H - 2, "ENTER", handle_tournament_enter_button, ctx);
		ccomponent_add(component);
	}
}

int main()
{
	ctx *ctx = &g_ctx;
	if (!ctx_init(ctx, "http://localhost:8000/", "ws://localhost:8000/ws"))
	{
		dprintf(STDERR_FILENO, "ctx_init fail\n");
		return (EXIT_FAILURE);
	}
	cinit();

	init_windows(ctx);
	cswitch_window(term_window_type_LOGIN, 1);

	input_loop(ctx, on_key_event);
	ctx_deinit(&g_ctx);
	cdeinit();
	return (EXIT_SUCCESS);
}
