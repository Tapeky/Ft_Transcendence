#ifndef API_H
# define API_H

# include "json_def.h"
# include "curl/curl.h"
# include "config.h"

typedef struct
{
	CURL				*curl;
	struct curl_slist	*header_list; // only there so it can be deallocated later

	char				in_buf[JSON_BUFFER_SIZE];
	size_t				in_buf_cursor;
	char				out_buf[JSON_BUFFER_SIZE];
	size_t				out_buf_cursor;

	const char			*api_base_url;
	char				api_url_buf[1000];
	size_t				api_url_base_len;
}	api_ctx;


int	api_ctx_init(api_ctx *ctx, const char *api_base_url);

void api_ctx_deinit(api_ctx *ctx);

cJSON *do_api_request_to_choice(api_ctx *ctx, const char *endpoint, json_choice *choice, void *out);

cJSON *do_api_request_to_def(api_ctx *ctx, const char *endpoint, json_def *def, void *out);

#endif
