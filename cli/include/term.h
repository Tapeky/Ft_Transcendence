#ifndef TERM_H
# define TERM_H

#include "types.h"
#include "aabb.h"
#include "config.h"
#include <X11/X.h>
#include <stdio.h>

#define ESC_DISABLE_CURSOR		"\e[?25l"
#define ESC_CLEAR_SCREEN		"\e[H\e[2J\e[3J"
#define ESC_ENABLE_CURSOR		"\e[?25h"
#define ESC_CURSOR_UP			"\e[A"
#define ESC_CURSOR_DOWN			"\e[B"
#define ESC_CURSOR_RIGHT		"\e[C"
#define ESC_CURSOR_LEFT			"\e[D"
#define ESC_MAGENTA_BACKGROUND	"\e[45m"
#define ESC_HALFBRIGHT			"\e[2m"
#define ESC_BLINK				"\e[5m"
#define ESC_BOLD				"\e[1m"
#define ESC_RESET_ATTR			"\e[0m"

typedef enum
{
	LABEL = 1,
	TEXT_AREA,
	BOX,
	BUTTON,
	COMPONENT_TYPE_MAX
}	component_type;

typedef struct
{
	const char	*str;
	size_t		str_len;
	int			str_is_allocated;
}	component_label;

typedef struct
{
	char		*buf;
	size_t		len;
	size_t		cursor;
	const char	*hint;
	size_t		hint_len;
	int			text_hidden;
	int			has_to_do_full_redraw;
	size_t		last_draw_num_chars;
}	component_text_area;

typedef struct
{
	u16		w;
	u16		h;
	char	top;
	char	bottom;
	char	left;
	char	right;
	char	top_left;
	char	top_right;
	char	bottom_left;
	char	bottom_right;
}	component_box;

typedef struct s_console_component console_component;

typedef void (button_action_func)(console_component *button, int pressed, void *param);

// basically just a label that you can select and press
typedef struct s_component_button
{
	char				*str;
	size_t				str_len;
	button_action_func	*func;
	void				*func_param;
	int					held;
}	component_button;

typedef struct s_console_component
{
	component_type	type;
	u16				x;
	u16				y;
	u8				is_dirty;
	union
	{
		component_label 	c_label;
		component_text_area	c_text_area;
		component_box		c_box;
		component_button	c_button;
	}	u;
}	console_component;

#define PUTS(s) fputs(s, stdout)
#define PUTC(c) fputc(c, stdout)

void	mark_dirty(console_component *c, int full_redraw);

void	label_init(console_component *c, u16 x, u16 y, const char *content, int str_is_allocated);
void	label_draw(console_component *c);
void	label_update_text(console_component *c, const char *new_content, int str_is_allocated);

void	text_area_init(console_component *c, u16 x, u16 y, size_t max_text_size, const char *hint, int text_hidden);
void	text_area_draw(console_component *c, int force_redraw);
void	text_area_addc(console_component *c, char chr);
void	text_area_back(console_component *c);

void	box_init(console_component *c,
	u16 x, u16 y,
	u16 w, u16 h,
	char top, char bottom, char left, char right,
	char top_left, char top_right, char bottom_left, char bottom_right);

void	box_draw(console_component *c);

void	button_init(console_component *c, u16 x, u16 y, char *text, button_action_func *func, void *param);
void	button_draw(console_component *c);

aabb	component_bouding_box(console_component *c);

extern u16 		c_y;
extern u16 		c_x;
extern float	c_pixel_ratio;

#define MAX_COMPONENT_NUMBER 100
typedef struct
{
	int					has_initiated;
	console_component	components[MAX_COMPONENT_NUMBER];
	size_t				components_count;
	size_t				selected_component;
}	term_window;

extern term_window		term_windows[term_window_type__MAX];
extern term_window		*cur_term_window;
extern term_window_type	cur_term_window_type;

void cinit();
void cdeinit();
void crefresh(int force_redraw);
console_component *ccomponent_add(console_component component);
void chandle_key_event(KeySym key, int on_press);
void cswitch_window(term_window_type window_type);

typedef enum
{
	LEFT = 1,
	UP,
	RIGHT,
	DOWN
}	direction;

void cnext_component(direction dir);

static inline int is_selectable(console_component *component)
{
	return (component->type == TEXT_AREA || component->type == BUTTON);
}

static inline console_component *ccurrent_component()
{
	if (cur_term_window->selected_component == -1u)
		return (NULL);
	return (&cur_term_window->components[cur_term_window->selected_component]);
}

void cursor_goto(u16 x, u16 y);

console_component	*add_pretty_textarea(u16 x, u16 y, u16 len, const char *hint, int text_hidden);
console_component	*add_pretty_button(u16 x, u16 y, char *text, button_action_func *func, void *param);

// this algorithm is responsible for finding the closest component from the current
// component and following a direction. more or less based on this answer:
// https://stackoverflow.com/a/16577312
// not perfect but close enough
size_t find_best_component(direction dir);

#endif
