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
		api_login_request req;
		cJSON *json;
		assert_api_request_success(do_api_request_to_choice(&ctx->api_ctx, "api/auth/login", &api_login_def, &req), &json);
		if (req.success)
		{
			label_update_text(ctx->login_error_label, xstrdup(req.message), 1);
		}
		else
		{
			label_update_text(ctx->login_error_label, xstrdup(req.error), 1);
		}
		crefresh(0);
		cJSON_Delete(json);
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

	console_component label1;
	label_init(&label1, 2, 2, "USERNAME", 0);

	console_component label2;
	label_init(&label2, 2, 6, "PASSWORD", 0);

	ctx->username_field = add_pretty_textarea(3, 3, 32, "...", 0);
	ctx->password_field = add_pretty_textarea(3, 7, 32, "...", 1);
	ctx->login_button = add_pretty_button(3, 15, " LOGIN ", handle_button, ctx);

	console_component label3;
	label_init(&label3, 2, 18, NULL, 0);

	ccomponent_add(label1);
	ccomponent_add(label2);
	ctx->login_error_label = ccomponent_add(label3);
	crefresh(0);

	input_loop(ctx, on_key_event);
	ctx_deinit(&g_ctx);
	cdeinit();
	return (EXIT_SUCCESS);
}
