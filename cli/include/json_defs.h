#ifndef JSON_DEFS_H
# define JSON_DEFS_H

# include "json_def.h"
# include <stdio.h>

/* API */

typedef struct
{
	int id;
	const char *username;
	const char *email;
	const char *display_name;
	NULLABLE(const char *, avatar_url);
	u8 is_online;
}	userdef;

typedef struct
{
	u8 success;
	userdef user;
	const char *data_token;
	const char *data_expiresin;

	union
	{
		// on success == false
		const char *error;
		// on success == true
		const char *message;
	};
}	api_login_request;

# define CUR_JSON_STRUCT api_login_request

CHOICE_DEF(api_login_def,
	"success", success,
	DEF_STRING("message", message)
	DEF_OBJECT("data",
		DEF_OBJECT("user", 
			DEF_INT("id", user.id)
			DEF_STRING("username", user.username)
			DEF_STRING("email", user.email)
			DEF_STRING("display_name", user.display_name)
			DEF_STRING_N("avatar_url", user.avatar_url)
			DEF_BOOL("is_online", user.is_online)
		)
		DEF_STRING("expires_in", data_expiresin)
		DEF_STRING("token", data_token)
	)
	,
	DEF_STRING("error", error)
);

typedef struct
{
	const char	*type;
	size_t		type_idx;
	union
	{
		const char *message;
	};
}	ws_message;

/* WEBSOCKETS */

#undef CUR_JSON_STRUCT
#define CUR_JSON_STRUCT ws_message

SWITCH_DEF(ws_message_json_def, "type", type, type_idx,
	SWITCH_ENTRY("pong", {})
	SWITCH_ENTRY("connected",
		DEF_STRING("message", message)
	)
);

/* REQUESTS */
#define FILL_REQUEST__OFFSET_OF(struct, field) \
	(size_t)&(((struct *)0)->field)
#define FILL_REQUEST(buf, fmt, ...) \
	snprintf( \
		buf, sizeof(buf), fmt, ## __VA_ARGS__ \
	)

#define REQ_API_LOGIN(buf, username, password) \
	FILL_REQUEST(buf, "{\"email\":\"%s\",\"password\":\"%s\"}", username, password)

#endif
