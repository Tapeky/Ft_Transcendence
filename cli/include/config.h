#ifndef CONFIG_H
# define CONFIG_H

# define JSON_BUFFER_SIZE 30000
# define MAX_WS_TIMEOUT 5000

typedef enum
{
	term_window_type_LOGIN,
	term_window_type_REGISTER,
	term_window_type_DASHBOARD,
	term_window_type_FRIENDS_VIEW,
	term_window_type_TOURNAMENT_VIEW,
	term_window_type__MAX
}	term_window_type;

#endif
