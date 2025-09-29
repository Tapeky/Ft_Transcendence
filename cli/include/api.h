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

typedef enum
{
	POST,
	GET
}	request_type;

int	api_ctx_init(api_ctx *ctx, const char *api_base_url);
int api_ctx_set_token(api_ctx *ctx, const char *token);
void api_ctx_remove_token(api_ctx *ctx);
void api_ctx_deinit(api_ctx *ctx);

void do_api_request_to_def(
	api_ctx *ctx,
	const char *endpoint,
	request_type request_type,
	json_def *def,
	void *out);

cJSON *do_api_request(
	api_ctx *ctx,
	const char *endpoint,
	request_type request_type
);

#endif
