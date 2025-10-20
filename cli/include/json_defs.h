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
);

DEFINE_JSON(login_data,
	(OBJECT, user, userdef),
	(STRING, expires_in),
	(STRING, token)
);

DEFINE_JSON(login,
	(OBJECT, data, login_data)
);

DEFINE_JSON(friend,
	(INT, id),
	(STRING, username),
	(STRING, display_name),
	(INT, is_online), // int ???
	(INT, total_wins),
	(INT, total_losses),
	(STRING, created_at)
);

DEFINE_JSON(friends,
	(ARRAY, data, friend),
);

DEFINE_JSON(bracket_data,
	(STRING, winner)
);

DEFINE_JSON(tournament,
	(INT, id),
	(STRING, name),
	(INT, maxPlayers),
	(INT, currentPlayers),
	(STRING, status),
	(OBJECT_N, bracketData, bracket_data),
	(STRING_N, winnerAlias),
	(INT_N, winnerId),
	(STRING, createdAt),
);

DEFINE_JSON(tournaments_data,
	(ARRAY, tournaments, tournament)
);

DEFINE_JSON(tournaments,
	(OBJECT, data, tournaments_data)
);

/* WEBSOCKETS */

/* REQUESTS */
# define FILL_REQUEST__OFFSET_OF(struct, field) \
	(size_t)&(((struct *)0)->field)
# define FILL_REQUEST(buf, fmt, ...) \
	snprintf( \
		buf, sizeof(buf), fmt, ## __VA_ARGS__ \
	)

# define REQ_WRAP(expr) \
	"{" expr "}"

# define REQ_CHOOSE(a, b, ...) b

# define REQ_ENTRY_LAST(name, ...) \
	"\"" name "\"" ":" REQ_CHOOSE(0, ## __VA_ARGS__, "\"%s\"")

# define REQ_ENTRY(name, ...) \
	REQ_ENTRY_LAST(name, ## __VA_ARGS__) ","

# define REQ_API_LOGIN(buf, email, password, totp_password)	\
	FILL_REQUEST(buf, REQ_WRAP(								\
		REQ_ENTRY("email")									\
		REQ_ENTRY("password")								\
		REQ_ENTRY_LAST("totp_password")						\
	), email, password, totp_password)

# define REQ_API_REGISTER(buf, username, email, password, display_name)	\
	FILL_REQUEST(buf, REQ_WRAP(											\
		REQ_ENTRY("username")											\
		REQ_ENTRY("email")												\
		REQ_ENTRY("password")											\
		REQ_ENTRY("display_name")										\
		REQ_ENTRY_LAST("data_consent", "true")							\
	), username, email, password, display_name)

#endif
