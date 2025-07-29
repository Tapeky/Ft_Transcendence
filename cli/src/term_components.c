#include "term.h"
#include <string.h>
#include <stdlib.h>
#include <assert.h>

void mark_dirty(console_component *c, int full_redraw)
{
	c->is_dirty = 1;
	if (full_redraw && c->type == TEXT_AREA)
		c->u.c_text_area.has_to_do_full_redraw = 1;
}

#define BASE_INIT(t, c, x, y) do { \
	(c)->type = t; \
	(c)->is_dirty = 1; \
	(c)->x = x; \
	(c)->y = y; \
} while (0)

void label_init(console_component *c, u16 x, u16 y, char *content)
{
	BASE_INIT(LABEL, c, x, y);
	c->u.c_label.str = content;
	c->u.c_label.str_len = strlen(content);
}

void label_draw(console_component *c)
{
	cursor_goto(c->x, c->y);

	char *content = c->u.c_label.str;
	if (content)
		PUTS(content);
}

int	text_area_init(console_component *c, u16 x, u16 y, size_t max_text_size, const char *hint, int text_hidden)
{
	BASE_INIT(TEXT_AREA, c, x, y);

	component_text_area *self = &c->u.c_text_area;
	memset(self, 0, sizeof(*self));
	self->len = max_text_size;
	self->buf = malloc(max_text_size);
	self->hint = hint;
	self->hint_len = hint ? strlen(hint) : 0;
	self->text_hidden = text_hidden;
	return (!!self->buf);
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
		mark_dirty(c, 0);
	}
}

void	text_area_back(console_component *c)
{
	component_text_area *self = &c->u.c_text_area;

	if (self->cursor)
	{
		self->cursor--;
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

void	button_init(console_component *c, u16 x, u16 y, char *text, button_action_func *func)
{
	BASE_INIT(BUTTON, c, x, y);
	component_button *self = &c->u.c_button;
	self->str = text;
	self->str_len = strlen(text);
	self->func = func;
	self->held = 0;
}

void	button_draw(console_component *c)
{
	// dirty ? yes. works ? yes.
	label_draw(c);
}
