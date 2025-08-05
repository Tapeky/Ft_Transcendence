#ifndef API_H
# define API_H

# include "json_def.h"
# include "curl/curl.h"

#define JSON_BUFFER_SIZE 30000

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

typedef enum
{
	ERR_CURL = 1,
	ERR_JSON_PARSE,
	ERR_JSON_CONTENT
}	api_request_error;

typedef struct
{
	api_request_error err;
	union
	{
		CURLcode curl_code;
		size_t json_error_pos;
		cJSON *json_obj; // courtesy of the caller to call cJSON_Delete
	};
}	api_request_result;

api_request_result do_api_request_to_choice(api_ctx *ctx, const char *endpoint, json_choice *choice, void *out);

api_request_result do_api_request_to_def(api_ctx *ctx, const char *endpoint, json_def *def, void *out);

void print_api_request_result(api_ctx *ctx, api_request_result res, FILE *stream);

#endif
