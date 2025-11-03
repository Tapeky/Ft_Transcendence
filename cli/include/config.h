#ifndef CONFIG_H
# define CONFIG_H

# define JSON_BUFFER_SIZE 30000
# define MAX_WS_TIMEOUT 5000

# define ARENA_WIDTH 800
# define ARENA_HEIGHT 400
# define PADDLE_HEIGHT 80
# define PADDLE_WIDTH 10
# define BALL_SIZE 10
# define BALL_SPEED 300
# define PADDLE_SPEED 350
# define WINNING_SCORE 5

typedef enum
{
	term_window_type_LOGIN,
	term_window_type_REGISTER,
	term_window_type_DASHBOARD,
	term_window_type_FRIENDS_VIEW,
	term_window_type_TOURNAMENT_VIEW,
	term_window_type_PONG_INVITE_OVERLAY,
	term_window_type_PONG_GET_READY,
	term_window_type_PONG_GAME,
	term_window_type__MAX
}	term_window_type;

#endif
