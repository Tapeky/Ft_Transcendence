#ifndef JSON_DEFS_H
# define JSON_DEFS_H

# include "json_def.h"
# include <stdio.h>

/* API */

DEFINE_JSON(userdef,
	(INT, id),
	(STRING, username),
	(STRING, email),
	(STRING, display_name),
	(STRING_N, avatar_url),
	(BOOL, is_online),
);

DEFINE_JSON(login_data,
	(OBJECT, user, userdef),
	(STRING, expires_in),
	(STRING, token)
);

DEFINE_JSON(login,
	(OBJECT, data, login_data)
);

DEFINE_JSON(bracket_data);

DEFINE_JSON(tournament,
	(INT, id),
	(STRING, name),
	(STRING, description),
	(INT, max_players),
	(INT, current_players),
	(STRING, status),
	(OBJECT_N, bracket_data, bracket_data),
	(INT_N, winner_id),
	(STRING, creator_username),
	(STRING, created_at),
);

DEFINE_JSON(tournaments,
	(ARRAY, data, tournament)
);

/* WEBSOCKETS */

/* REQUESTS */
# define FILL_REQUEST__OFFSET_OF(struct, field) \
	(size_t)&(((struct *)0)->field)
# define FILL_REQUEST(buf, fmt, ...) \
	snprintf( \
		buf, sizeof(buf), fmt, ## __VA_ARGS__ \
	)

# define REQ_API_LOGIN(buf, username, password) \
	FILL_REQUEST(buf, "{\"email\":\"%s\",\"password\":\"%s\"}", username, password)

#endif
