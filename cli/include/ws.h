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

cJSON *ws_recv(ws_ctx *ctx);

void ws_send(ws_ctx *ctx);

#endif
