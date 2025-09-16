#include "term.h"
#include "soft_fail.h"
#include <string.h>
#include <stdlib.h>
#include <assert.h>

void mark_dirty(console_component *c, int full_redraw)
{
	c->is_dirty = 1;
	if (full_redraw && c->type == TEXT_AREA)
		c->u.c_text_area.has_to_do_full_redraw = 1;
}

void	component_hide(console_component *c)
{
	if (!c->is_hidden)
	{
		c->is_hidden = 1;
		c->is_dirty = 1;
	}
}

void	component_show(console_component *c)
{
	if (c->is_hidden)
	{
		c->is_hidden = 0;
		c->is_dirty = 1;
	}
}

void	component_toggle_visibility(console_component *c)
{
	c->is_hidden = !c->is_hidden;
	c->is_dirty = 1;
}

#define BASE_INIT(t, c, x, y) do { \
	(c)->type = t; \
	(c)->is_dirty = 1; \
	(c)->is_hidden = 0; \
	(c)->x = x; \
	(c)->y = y; \
} while (0)

void label_init(console_component *c, u16 x, u16 y, const char *content, int str_is_allocated)
{
	BASE_INIT(LABEL, c, x, y);
	component_label *self = &c->u.c_label;
	self->str = NULL;
	self->wrap_around = -1;
	label_update_text(c, content, str_is_allocated);
}

void label_draw(console_component *c)
{
	int y = c->y;
	cursor_goto(c->x, y);

	const char *content = c->u.c_label.str;
	int n_on_cur_line = 0;
	int wrap_around = c->u.c_label.wrap_around;
	if (content)
	{
		while (*content)
		{
			char chr = *content++;
			if (chr == '\n')
			{
				n_on_cur_line = 0;
				cursor_goto(c->x, ++y);
			}
			else
			{
				PUTC(chr);
				n_on_cur_line++;
				if (wrap_around > 0 && n_on_cur_line >= wrap_around)
				{
					n_on_cur_line = 0;
					cursor_goto(c->x, ++y);
				}
			}
		}
	}
}

void	label_wrap_around(console_component *c, int n)
{
	c->u.c_label.wrap_around = n;
}

void	label_update_text(console_component *c, const char *new_content, int str_is_allocated)
{
	component_label *self = &c->u.c_label;
	if (self->str && self->str_is_allocated)
		free((void *)self->str);
	if (!new_content)
	{
		self->str = "";
		self->str_len = 0;
	}
	else
	{
		self->str = new_content;
		self->str_len = strlen(new_content);
	}
	self->str_is_allocated = str_is_allocated;
	c->is_dirty = 1;
}

void	text_area_init(console_component *c, u16 x, u16 y, size_t max_text_size, const char *hint, int text_hidden)
{
	BASE_INIT(TEXT_AREA, c, x, y);

	component_text_area *self = &c->u.c_text_area;
	memset(self, 0, sizeof(*self));
	self->len = max_text_size;
	self->buf = xcalloc(max_text_size + 1, 1);
	self->hint = hint;
	self->hint_len = hint ? strlen(hint) : 0;
	self->text_hidden = text_hidden;
}

static void putcn(char c, size_t n)
{
	for (size_t i = 0; i < n; i++)
		PUTC(c);
}

void text_area_draw(console_component *c, int force_redraw)
{
	component_text_area *self = &c->u.c_text_area;

	assert(self->cursor <= self->len);
	if (!self->cursor)
	{
		if (self->hint)
		{
			cursor_goto(c->x, c->y);
			PUTS(ESC_BLINK ESC_HALFBRIGHT);
			PUTS(self->hint);
			PUTS(ESC_RESET_ATTR);
		}
	}
	else
	{
		if (force_redraw || self->has_to_do_full_redraw)
		{
			cursor_goto(c->x, c->y);
			if (self->text_hidden)
				putcn('*', self->cursor);
			else
				printf("%.*s", (int)self->cursor, self->buf);
			self->has_to_do_full_redraw = 0;
		}
		else
		{
			if (self->last_draw_num_chars > self->cursor)
			{
				// there are less characters than during the previous draw, so we erase the surplus
				PUTS(ESC_RESET_ATTR);
				cursor_goto(c->x + self->cursor, c->y);
				for (size_t i = self->cursor; i < self->last_draw_num_chars; i++)
					PUTC(' ');
			}
			else if (self->last_draw_num_chars < self->cursor)
			{
				// write only the new characters
				cursor_goto(c->x + self->last_draw_num_chars, c->y);
				if (self->text_hidden)
					putcn('*', self->cursor - self->last_draw_num_chars);
				else
					for (size_t i = self->last_draw_num_chars; i < self->cursor; i++)
						PUTC(self->buf[i]);
			}
		}

		if (self->cursor < self->hint_len)
		{
			PUTS(ESC_RESET_ATTR);
			size_t diff = self->hint_len - self->cursor;
			for (size_t i = 0; i < diff; i++)
				PUTC(' ');
		}
	}
	self->last_draw_num_chars = self->cursor;
}

void	text_area_addc(console_component *c, char chr)
{
	component_text_area *self = &c->u.c_text_area;

	if (self->cursor < self->len)
	{
		self->buf[self->cursor++] = chr;
		self->buf[self->cursor] = '\0';
		mark_dirty(c, 0);
	}
}

void	text_area_back(console_component *c)
{
	component_text_area *self = &c->u.c_text_area;

	if (self->cursor)
	{
		self->cursor--;
		self->buf[self->cursor] = '\0';
		mark_dirty(c, 0);
	}
}

void	box_init(console_component *c,
	u16 x, u16 y,
	u16 w, u16 h,
	char top, char bottom, char left, char right,
	char top_left, char top_right, char bottom_left, char bottom_right)
{
	BASE_INIT(BOX, c, x, y);
	component_box *self = &c->u.c_box;
	self->w = w;
	self->h = h;
	self->top = top;
	self->bottom = bottom;
	self->left = left;
	self->right = right;
	self->top_left = top_left;
	self->top_right = top_right;
	self->bottom_left = bottom_left;
	self->bottom_right = bottom_right;
}

void	box_draw(console_component *c)
{
	component_box *self = &c->u.c_box;
	if (!self->w || !self->h)
		return;
	cursor_goto(c->x, c->y);
	PUTC(self->top_left);
	if (self->w > 1)
	{
		for (u16 i = 0; i < self->w - 2; i++)
			PUTC(self->top);
		PUTC(self->top_right);
	}

	if (self->h > 2)
	{
		cursor_goto(c->x, c->y + 1);
		for (u16 i = 0; i < self->h - 2; i++)
		{
			PUTC(self->left);
			PUTS(ESC_CURSOR_LEFT ESC_CURSOR_DOWN);
		}
		if (self->w > 1)
		{
			cursor_goto(c->x + self->w - 1, c->y + 1);
			for (u16 i = 0; i < self->h - 2; i++)
			{
				PUTC(self->right);
				PUTS(ESC_CURSOR_LEFT ESC_CURSOR_DOWN);
			}
		}
	}

	if (self->h > 1)
	{
		cursor_goto(c->x, c->y + self->h - 1);
		PUTC(self->bottom_left);

		if (self->w > 1)
		{
			for (u16 i = 0; i < self->w - 2; i++)
				PUTC(self->bottom);
			if (self->w > 1)
				PUTC(self->bottom_right);
		}
	}
}

void	button_init(console_component *c, u16 x, u16 y, char *text, button_action_func *func, void *param)
{
	BASE_INIT(BUTTON, c, x, y);
	component_button *self = &c->u.c_button;
	self->str = text;
	self->str_len = strlen(text);
	self->wrap_around = -1;
	self->func = func;
	self->func_param = param;
	self->held = 0;
}

void	button_draw(console_component *c)
{
	// dirty ? yes. works ? yes.
	label_draw(c);
}
