#include "term.h"
#include <X11/keysym.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <sys/ioctl.h>
#include <termios.h>
#include <signal.h>
#include <unistd.h>
#include <assert.h>

u16 		c_y = 0;
u16 		c_x = 0;
float		c_pixel_ratio = 1;
term_info	cterm_info;

struct termios orig_termios;

static void fetch_term_sz()
{
	struct winsize wz;
	ioctl(STDIN_FILENO, TIOCGWINSZ, &wz);
	c_x = wz.ws_col;
	c_y = wz.ws_row;

	// this escape sequence allows to fetch the size in pixels of the terminal. the
	// return format is '\e[4;{y};{x}t'
	PUTS("\e[14t");
	fflush(stdout);

	u32 pixel_x, pixel_y;
	if (scanf("\e[4;%u;%ut", &pixel_y, &pixel_x) != 2 || !pixel_x || !pixel_y)
		c_pixel_ratio = 7.0 / 21.0; // most common ratio for terminals
	else
	{
		int sz_tile_x = pixel_x / c_x;
		int sz_tile_y = pixel_y / c_y;
		c_pixel_ratio = (float)sz_tile_x / sz_tile_y;
	}
}

static void winch(int sig)
{
	(void)sig;
	fetch_term_sz();
}

void cinit()
{
	if (cterm_info.has_initiated)
		return ;
	memset(&cterm_info, 0, sizeof(cterm_info));
	cterm_info.selected_component = -1u;

	// set the terminal in raw mode
	tcgetattr(STDIN_FILENO, &orig_termios);
	struct termios raw_info;
	raw_info = orig_termios;
	cfmakeraw(&raw_info);
	tcsetattr(STDIN_FILENO, TCSANOW,&raw_info);

	PUTS(ESC_DISABLE_CURSOR);
	PUTS(ESC_CLEAR_SCREEN);
	fflush(stdout);
	fetch_term_sz();
	signal(SIGWINCH, winch);
	cterm_info.has_initiated = 1;
}

void cdeinit()
{
	if (!cterm_info.has_initiated)
		return ;
	PUTS(ESC_ENABLE_CURSOR);
	PUTS(ESC_CLEAR_SCREEN);
	fflush(stdout);
	signal(SIGWINCH, SIG_DFL);
	for (size_t i = 0; i < cterm_info.components_count; i++)
	{
		console_component *c = &cterm_info.components[i];
		if (c->type == TEXT_AREA)
			free(c->u.c_text_area.buf);
		else if (c->type == LABEL)
		{
			component_label *label = &c->u.c_label;
			if (label->str && label->str_is_allocated)
				free((void *)label->str);
		}
	}
	memset(&cterm_info, 0, sizeof(cterm_info));

	// restore terminal attributes
	tcsetattr(STDIN_FILENO, TCSANOW,&orig_termios);
	cterm_info.has_initiated = 0;
}

void chandle_key_event(KeySym key, int on_press)
{
	console_component *cur = ccurrent_component();
	if (!cur)
		return;
	if (on_press)
	{
		if (key < 256 && isprint(key) && cur->type == TEXT_AREA)
			text_area_addc(cur, (unsigned char)key);
		else if (key == XK_BackSpace && cur->type == TEXT_AREA)
			text_area_back(cur);
		else if (key == XK_Down && (cur->type != BUTTON || !cur->u.c_button.held))
			cnext_component(DOWN);
		else if (key == XK_Up && (cur->type != BUTTON || !cur->u.c_button.held))
			cnext_component(UP);
		else if (key == XK_Right && (cur->type != BUTTON || !cur->u.c_button.held))
			cnext_component(RIGHT);
		else if (key == XK_Left && (cur->type != BUTTON || !cur->u.c_button.held))
			cnext_component(LEFT);

		crefresh(0);
	}
	if (key == XK_Return && cur->type == BUTTON)
	{
		component_button *button = &cur->u.c_button;
		button->held = on_press;
		if (button->func)
			button->func(cur, on_press, button->func_param);
	}
}

void crefresh(int force_redraw)
{
	if (force_redraw)
		PUTS(ESC_CLEAR_SCREEN);

	for (size_t i = 0; i < cterm_info.components_count; i++)
	{
		console_component *c = &cterm_info.components[i];
		if (c->is_dirty || force_redraw)
		{
			if (i == cterm_info.selected_component)
				PUTS(ESC_MAGENTA_BACKGROUND ESC_BOLD);
			switch (c->type)
			{
				case LABEL:
					label_draw(c);
					break;
				case TEXT_AREA:
					text_area_draw(c, force_redraw);
					break;
				case BOX:
					box_draw(c);
					break;
				case BUTTON:
					button_draw(c);
					break;
				default:
					fprintf(stderr, "Invalid component type %d\n", c->type);
					abort();
			}
			if (i == cterm_info.selected_component)
				PUTS(ESC_RESET_ATTR);
			c->is_dirty = 0;
		}
	}

	fflush(stdout);
}

console_component *ccomponent_add(console_component component)
{
	assert(component.type > 0 && component.type < COMPONENT_TYPE_MAX);
	assert(cterm_info.components_count < MAX_COMPONENT_NUMBER);

	console_component *new_component = &cterm_info.components[cterm_info.components_count];
	*new_component = component;
	if (cterm_info.selected_component == -1u && is_selectable(&component))
		cterm_info.selected_component = cterm_info.components_count;
	cterm_info.components_count++;
	return (new_component);
}

void cnext_component(direction dir)
{
	if (!cterm_info.components_count)
		return ;
	size_t new_selected = find_best_component(dir);
	if (new_selected != -1u)
	{
		mark_dirty(ccurrent_component(), 1);
		mark_dirty(&cterm_info.components[new_selected], 1);
		cterm_info.selected_component = new_selected;
	}
}

void cursor_goto(u16 x, u16 y)
{
	printf("\e[%hd;%hdH", y, x);
}

console_component *add_pretty_textarea(u16 x, u16 y, u16 len, const char *hint, int text_hidden)
{
	console_component text_area, box;
	if (!text_area_init(&text_area, x + 1, y + 1, len, hint, text_hidden))
		return (NULL);

	box_init(&box,
		x, y, len + 2, 3,
		'-', '-', '|', '|',
		'+', '+', '+', '+'
	);

	console_component *result = ccomponent_add(text_area);
	ccomponent_add(box);
	return (result);
}

console_component	*add_pretty_button(u16 x, u16 y, char *text, button_action_func *func, void *param)
{
	assert(text);

	console_component button, box;
	button_init(&button, x + 1, y + 1, text, func, param);

	box_init(&box,
		x, y, strlen(text) + 2, 3,
		'-', '-', '|', '|',
		'+', '+', '+', '+'
	);

	console_component *result = ccomponent_add(button);
	ccomponent_add(box);
	return (result);
}

aabb	component_bouding_box(console_component *c)
{
	switch (c->type)
	{
		case LABEL:
			return (aabb_create(c->x, c->y, c->u.c_label.str_len, 1));
		case BUTTON:
			return (aabb_create(c->x, c->y, c->u.c_button.str_len, 1));
		case TEXT_AREA:
			return (aabb_create(c->x, c->y, c->u.c_text_area.len, 1));
		case BOX:
			return (aabb_create(c->x, c->y, c->u.c_box.w, c->u.c_box.h));
		default:
			fprintf(stderr, "Invalid component type %d\n", c->type);
			abort();
	}
}
