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

int on_key_event(ctx *ctx, KeySym key, int on_press)
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
		if (cprevious_window(1) && cur_term_window_type == term_window_type_LOGIN)
		{
			api_ctx_remove_token(&ctx->api_ctx);
			cJSON_Delete(ctx->user_login._json_);
			ctx->user_login._json_ = NULL;
		}
	}
	chandle_key_event(key, on_press);
	return (0);
}

void update_tournament_view(void *obj, void *param)
{
	tournament *t = obj;
	ctx *ctx = param;

	if (t)
	{
		label_update_text(ctx->tournament_view.tournament_name, t->name, 0);
		label_update_text(ctx->tournament_view.tournament_description, t->description, 0);
	}
	else
	{
		label_update_text(ctx->tournament_view.tournament_name, "NO TOURNAMENT", 0);
	}
}

void refresh_tournaments(ctx *ctx)
{
	cswitch_window(term_window_type_TOURNAMENT_VIEW, 0);
	if (ctx->tournaments._json_)
		json_clean_obj(&ctx->tournaments, tournaments_def);
	do_api_request_to_def(&ctx->api_ctx, "api/tournaments", GET, tournaments_def, &ctx->tournaments);
	ctx->tournament_view.list_view.list_cursor = 0;
	list_view_update(&ctx->tournament_view.list_view, ctx, 0);
}

int json_success(cJSON *json, char **error_string)
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

void attempt_login(ctx *ctx)
{
	REQ_API_LOGIN(
		ctx->api_ctx.in_buf,
		ctx->login_view.username_field->u.c_text_area.buf,
		ctx->login_view.password_field->u.c_text_area.buf
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
		cswitch_window(term_window_type_DASHBOARD, 1);
	}
}

void handle_login_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		attempt_login((ctx *)param);
}

void attempt_register(ctx *ctx)
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
		cswitch_window(term_window_type_DASHBOARD, 1);
	}
}

void handle_register_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		attempt_register((ctx *)param);
}

void handle_register_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	(void)param;
	if (press)
		cswitch_window(term_window_type_REGISTER, 1);
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

void update_friends_view(void *obj, void *param)
{
	friend *f = obj;
	ctx *ctx = param;

	if (f)
	{
		label_update_text(ctx->friends_view.friend_name, f->display_name, 0);
	}
	else
	{
		label_update_text(ctx->friends_view.friend_name, "NO FRIEND :(", 0);
	}
}

void refresh_friends(ctx *ctx)
{
	cswitch_window(term_window_type_FRIENDS_VIEW, 0);

	if (ctx->friends._json_)
		json_clean_obj(&ctx->friends, friends_def);
	do_api_request_to_def(&ctx->api_ctx, "api/friends", GET, friends_def, &ctx->friends);
	ctx->friends_view.list_view.list_cursor = 0;
	list_view_update(&ctx->friends_view.list_view, ctx, 0);
}

void handle_tournament_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		refresh_tournaments((ctx *)param);
}

void handle_friends_window_switch_button(console_component *button, int press, void *param)
{
	(void)button;
	if (press)
		refresh_friends((ctx *)param);
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
	}
	
	cswitch_window(term_window_type_TOURNAMENT_VIEW, 0);
	{
		const int BOX_X = 4;
		const int BOX_Y = 4;
		const int BOX_W = 50;
		const int BOX_H = 14;

		list_view_init(&ctx->tournament_view.list_view, BOX_X, BOX_Y, BOX_W, BOX_H, update_tournament_view, &ctx->tournaments.data.size, (void **)&ctx->tournaments.data.arr, sizeof(tournament));
		label_init(&component, BOX_X, BOX_Y - 1, "TOURNAMENTS", 0);
		ccomponent_add(component);
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
	creset_window_stack();
	cswitch_window(term_window_type_LOGIN, 1);

	input_loop(ctx, on_key_event);
	ctx_deinit(&g_ctx);
	cdeinit();
	return (EXIT_SUCCESS);
}
