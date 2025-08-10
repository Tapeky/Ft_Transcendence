#ifndef WS_H
# define WS_H

# include <curl/curl.h>
# include "json_def.h"
# include "config.h"

typedef struct
{
	CURL			*curl;
	curl_socket_t	sock;
	char			recv_buf[JSON_BUFFER_SIZE];
	char			send_buf[JSON_BUFFER_SIZE];
}	ws_ctx;

int ws_ctx_init(ws_ctx *ctx, const char *url);

void ws_ctx_deinit(ws_ctx *ctx);

typedef enum
{
	ws_xfer_error_CURL = 1,
	ws_xfer_error_POLL,
	ws_xfer_error_TOO_BIG,
	ws_xfer_error_JSON_PARSE,
	ws_xfer_error_JSON_CONTENT,
}	ws_xfer_error;

typedef struct
{
	ws_xfer_error err;
	union
	{
		CURLcode			curl_code;
		int					poll_errno;
		size_t				json_error_pos;
		json_content_error	json_content_error;
		cJSON				*json_obj; // courtesy of the caller to call cJSON_Delete
	};
}	ws_xfer_result;

ws_xfer_result ws_recv_to_switch(ws_ctx *ctx, json_switch *switch_, void *out);

ws_xfer_result ws_send(ws_ctx *ctx);

void ws_ctx_print_xfer_result(ws_ctx *ctx, ws_xfer_result res, int is_recv, FILE *stream);

#endif
