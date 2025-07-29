#include "term.h"
#include <X11/keysym.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <sys/ioctl.h>
#include <signal.h>
#include <unistd.h>
#include <assert.h>

u16 c_y = 0;
u16 c_x = 0;
term_info	cterm_info;

static void fetch_term_sz()
{
	struct winsize wz;
	ioctl(STDIN_FILENO, TIOCGWINSZ, &wz);
	c_x = wz.ws_col;
	c_y = wz.ws_row;
}

static void winch(int sig)
{
	(void)sig;
	fetch_term_sz();
}

void cinit()
{
	memset(&cterm_info, 0, sizeof(cterm_info));
	cterm_info.selected_component = -1u;
	PUTS(ESC_DISABLE_CURSOR);
	PUTS(ESC_CLEAR_SCREEN);
	fflush(stdout);
	fetch_term_sz();
	signal(SIGWINCH, winch);
}

void cdeinit()
{
	PUTS(ESC_ENABLE_CURSOR);
	PUTS(ESC_CLEAR_SCREEN);
	fflush(stdout);
	signal(SIGWINCH, SIG_DFL);
	for (size_t i = 0; i < cterm_info.components_count; i++)
	{
		console_component *c = &cterm_info.components[i];
		if (c->type == TEXT_AREA)
			free(c->u.c_text_area.buf);
	}
	memset(&cterm_info, 0, sizeof(cterm_info));
}

void chandle_key_event(KeySym key, int on_press)
{
	if (on_press)
	{
		console_component *cur = ccurrent_component();
		if (key < 256 && isprint(key) && cur && cur->type == TEXT_AREA)
			text_area_addc(cur, (unsigned char)key);
		else if (key == XK_BackSpace && cur && cur->type == TEXT_AREA)
			text_area_back(cur);
			
		else if (key == XK_Down)
			cnext_component();
		else if (key == XK_Up)
			cprev_component();

		crefresh(0);
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

void ccomponent_add(console_component component)
{
	assert(component.type > 0 && component.type < COMPONENT_TYPE_MAX);
	assert(cterm_info.components_count < MAX_COMPONENT_NUMBER);

	cterm_info.components[cterm_info.components_count] = component;
	if (cterm_info.selected_component == -1u && is_selectable(&component))
		cterm_info.selected_component = cterm_info.components_count;
	cterm_info.components_count++;
}

void cnext_component()
{
	size_t old, new, i;

	if (!cterm_info.components_count || cterm_info.selected_component == -1u)
		return;
	i = 0;
	old = cterm_info.selected_component;
	new = old;
	while (i < cterm_info.components_count)
	{
		new = (new + 1) % cterm_info.components_count;
		if (is_selectable(&cterm_info.components[new]))
		{
			cterm_info.selected_component = new;
			mark_dirty(&cterm_info.components[new], 1);
			mark_dirty(&cterm_info.components[old], 1);
			return;
		}
		i++;
	}
}

void cprev_component()
{
	size_t old, new, i;

	if (!cterm_info.components_count || cterm_info.selected_component == -1u)
		return;
	i = 0;
	old = cterm_info.selected_component;
	new = old;
	while (i < cterm_info.components_count)
	{
		if (!new)
			new = cterm_info.components_count - 1;
		else
			new--;
		if (is_selectable(&cterm_info.components[new]))
		{
			cterm_info.selected_component = new;
			mark_dirty(&cterm_info.components[new], 1);
			mark_dirty(&cterm_info.components[old], 1);
			return;
		}
		i++;
	}
}

void cursor_goto(u16 x, u16 y)
{
	printf("\e[%hd;%hdH", y, x);
}

int add_pretty_textarea(u16 x, u16 y, u16 len, const char *hint, int text_hidden)
{
	console_component text_area, box;
	if (!text_area_init(&text_area, x + 1, y + 1, len, hint, text_hidden))
		return (0);

	box_init(&box,
		x, y, len + 2, 3,
		'-', '-', '|', '|',
		'+', '+', '+', '+'
	);

	ccomponent_add(text_area);
	ccomponent_add(box);

	return (1);
}
