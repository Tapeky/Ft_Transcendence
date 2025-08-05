#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include "ctx.h"
#include "term.h"

// int on_key_event(KeySym key, int on_press)
// {
// 	chandle_key_event(key, on_press);
// 	return (key == XK_Escape);
// }

// void handle_button(int press)
// {
// 	dprintf(2, "BUTTON PRESS: %d\n", press);
// }

// int main()
// {
// 	ctx ctx = {0};
// 	const char *err = ctx_init(&ctx);
// 	if (err)
// 	{
// 		dprintf(STDERR_FILENO, "ctx_init fail: %s\n", err);
// 		return (EXIT_FAILURE);
// 	}
// 	cinit();

// 	console_component label1;
// 	label_init(&label1, 2, 2, "USERNAME");

// 	console_component label2;
// 	label_init(&label2, 2, 6, "PASSWORD");

// 	add_pretty_textarea(3, 3, 32, "...", 0);
// 	add_pretty_textarea(3, 7, 32, "...", 1);
// 	add_pretty_button(3, 15, " LOGIN ", handle_button);

// 	ccomponent_add(label1);
// 	ccomponent_add(label2);
// 	crefresh(0);

// 	input_loop(&ctx, on_key_event);
// 	ctx_deinit(&ctx);
// 	cdeinit();
// 	return (EXIT_SUCCESS);
// }

#include <curl/curl.h>
#include <string.h>
#include "json_def.h"
#include "api.h"

typedef struct
{
	int id;
	const char *username;
	const char *email;
	const char *display_name;
	const char *avatar_url;
	u8 is_online;
}	userdef;

typedef struct
{
	u8 success;
	userdef user;
	const char *data_token;
	const char *data_expiresin;

	// on success == false
	const char *error;
	// on success == true
	const char *message;
}	login_request;

#define CUR_JSON_STRUCT login_request

CHOICE_DEF(login_switch,
	"success", success,
	DEF_STRING("message", message)
	DEF_OBJECT("data",
		DEF_OBJECT("user", 
			DEF_INT("id", user.id)
			DEF_STRING("username", user.username)
			DEF_STRING("email", user.email)
			DEF_STRING("display_name", user.display_name)
			DEF_STRING("avatar_url", user.avatar_url)
			DEF_BOOL("is_online", user.is_online)
		)
		DEF_STRING("expires_in", data_expiresin)
		DEF_STRING("token", data_token)
	)
	,
	DEF_STRING("error", error)
);

const char *json = "{\"email\":\"admin@transcendence.com\",\"password\":\"admin123\"}";

int main()
{
	CURLcode err = curl_global_init(CURL_GLOBAL_ALL);
	if (err)
	{
		fprintf(stderr, "curl_global_init() fail: %s\n", curl_easy_strerror(err));
		return (EXIT_FAILURE);
	}
	api_ctx ctx;
	if (!api_ctx_init(&ctx, "http://localhost:8000/"))
	{
		curl_global_cleanup();
		return (EXIT_FAILURE);
	}
	strcpy(ctx.in_buf, json);

	login_request login_request = {0};
	api_request_result res = do_api_request_to_choice(&ctx, "api/auth/login", &login_switch, &login_request);
	if (res.err)
	{
		fputs("do_api_request_to_choice() fail: ", stderr);
		print_api_request_result(&ctx, res, stderr);
		curl_easy_cleanup(ctx.curl);
		curl_global_cleanup();
		return (EXIT_FAILURE);
	}
	
	if (login_request.success)
	{
		printf("managed to log in with message '%s'\ntoken is %s\ndisplay name is %s\n", login_request.message, login_request.data_token, login_request.user.display_name);
	}
	else
	{
		printf("error logging in with message '%s'\n", login_request.error);
	}

	cJSON_Delete(res.json_obj);
	api_ctx_deinit(&ctx);
	curl_global_cleanup();
	return (EXIT_SUCCESS);
}
