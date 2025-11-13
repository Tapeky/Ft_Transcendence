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
DEFINE_JSON(friend_pong_invite,
	(STRING, inviteId),
	(INT, fromUserId),
	(STRING, fromUsername),
	(INT, expiresAt)
);

DEFINE_JSON(friend_pong_accepted,
	(STRING, gameId),
	(STRING, role),
);

DEFINE_JSON(game_state_state,
	(DOUBLE, ballX),
	(DOUBLE, ballY),
	(DOUBLE, leftPaddleY),
	(DOUBLE, rightPaddleY),
	(INT, leftScore),
	(INT, rightScore),
	(BOOL, gameOver)
);

DEFINE_JSON(game_state,
	(OBJECT, gameState, game_state_state)
);

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

# define REQ_WS_LOGIN(buf, auth_token)	\
	FILL_REQUEST(buf, REQ_WRAP(			\
		REQ_ENTRY("type", "\"auth\"")	\
		REQ_ENTRY_LAST("token")			\
	), auth_token)

# define REQ_WS_INVITE_DECLINE(buf, invite_id)			\
	FILL_REQUEST(buf, REQ_WRAP(							\
		REQ_ENTRY("type", "\"friend_pong_decline\"")	\
		REQ_ENTRY_LAST("inviteId")						\
	), invite_id)

# define REQ_WS_INVITE_ACCEPT(buf, invite_id)			\
	FILL_REQUEST(buf, REQ_WRAP(							\
		REQ_ENTRY("type", "\"friend_pong_accept\"")		\
		REQ_ENTRY_LAST("inviteId")						\
	), invite_id)

# define REQ_WS_PLAYER_READY(buf, game_id)				\
	FILL_REQUEST(buf, REQ_WRAP(							\
		REQ_ENTRY("type", "\"pong_player_ready\"")		\
		REQ_ENTRY_LAST("gameId")						\
	), game_id)

# define REQ_WS_INPUT_UPDATE(buf, up, down)					\
	FILL_REQUEST(buf, REQ_WRAP(								\
		REQ_ENTRY("type", "\"simple_pong_input\"")			\
		REQ_ENTRY("gameId", "\"aaa\"")						\
		"\"input\": {\"up\": %s, \"down\": %s}"				\
	), (up) ? "true" : "false", (down) ? "true" : "false")

# define REQ_API_REGISTER(buf, username, email, password, display_name)	\
	FILL_REQUEST(buf, REQ_WRAP(											\
		REQ_ENTRY("username")											\
		REQ_ENTRY("email")												\
		REQ_ENTRY("password")											\
		REQ_ENTRY("display_name")										\
		REQ_ENTRY_LAST("data_consent", "true")							\
	), username, email, password, display_name)

#endif
