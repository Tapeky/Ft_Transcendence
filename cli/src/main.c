#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include "ctx.h"

int on_key_event(KeySym key, int on_press)
{
	printf("Key %lu %s\n", key, on_press ? "pressed" : "released");
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
	input_loop(&ctx, on_key_event);
	ctx_deinit(&ctx);
	return (EXIT_SUCCESS);
}
