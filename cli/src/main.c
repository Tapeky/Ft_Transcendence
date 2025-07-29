#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include "ctx.h"
#include "term.h"

int on_key_event(KeySym key, int on_press)
{
	chandle_key_event(key, on_press);
	return (key == XK_Escape);
}

int main()
{
	ctx ctx = {0};
	const char *err = ctx_init(&ctx);
	if (err)
	{
		dprintf(STDERR_FILENO, "ctx_init fail: %s\n", err);
		return (EXIT_FAILURE);
	}
	cinit();

	console_component label1;
	label_init(&label1, 2, 2, "USERNAME");

	console_component label2;
	label_init(&label2, 2, 6, "PASSWORD");

	add_pretty_textarea(3, 3, 32, "...", 0);
	add_pretty_textarea(3, 7, 32, "...", 1);

	ccomponent_add(label1);
	ccomponent_add(label2);
	crefresh(0);

	input_loop(&ctx, on_key_event);
	ctx_deinit(&ctx);
	cdeinit();
	return (EXIT_SUCCESS);
}
