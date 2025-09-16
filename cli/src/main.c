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
	chandle_key_event(key, on_press);
	return (key == XK_Escape);
}

void handle_button(console_component *button, int press, void *param)
{
	ctx *ctx = param;
	if (press && ctx->login_button == button)
	{
		REQ_API_LOGIN(
			ctx->api_ctx.in_buf,
			ctx->username_field->u.c_text_area.buf,
			ctx->password_field->u.c_text_area.buf
		);
		cJSON *json;
		json = do_api_request(&ctx->api_ctx, "api/auth/login", POST);
		if (cJSON_GetObjectItem(json, "success")->type == cJSON_False)
		{
			label_update_text(ctx->login_error_label, xstrdup(cJSON_GetObjectItem(json, "error")->valuestring), 1);
			cJSON_Delete(json);
			crefresh(0);
		}
		else
		{
			json_parse_from_def_force(json, login_def, &ctx->user_login);
			
			if (!api_ctx_append_token(&ctx->api_ctx, ctx->user_login.data.token))
				clean_and_fail("api_ctx_append_token() fail\n");

			tournaments tournaments;
			do_api_request_to_def(&ctx->api_ctx, "api/tournaments", GET, tournaments_def, &tournaments);
			cswitch_window(term_window_type_OTHER, 1);
			console_component label;
			for (size_t i = 0; i < tournaments.data.size; i++)
			{
				tournament *t = &tournaments.data.arr[i];
				label_init(&label, 2, i + 2, xstrdup(t->name), 1);
				ccomponent_add(label);
			}
			json_clean_obj(&tournaments, tournaments_def);
			crefresh(1);
		}
	}
}

static void init_windows(ctx *ctx)
{
	console_component label;

	cswitch_window(term_window_type_LOGIN, 0);
	{
		label_init(&label, 2, 2, "USERNAME", 0);
		ccomponent_add(label);

		label_init(&label, 2, 6, "PASSWORD", 0);
		ccomponent_add(label);

		ctx->username_field = add_pretty_textarea(3, 3, 32, "...", 0);
		ctx->password_field = add_pretty_textarea(3, 7, 32, "...", 1);
		ctx->login_button = add_pretty_button(3, 15, " LOGIN ", handle_button, ctx);

		label_init(&label, 2, 18, NULL, 0);
		ctx->login_error_label = ccomponent_add(label);
	}

	cswitch_window(term_window_type_OTHER, 0);
	{
		
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
