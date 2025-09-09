#include "api.h"
#include "soft_fail.h"
#include "ctx.h"
#include <string.h>

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
		CURLcode			 curl_code;
		size_t 				json_error_pos;
		json_content_error	json_content_error;
		cJSON *json_obj; // courtesy of the caller to call cJSON_Delete
	};
}	api_request_result;

static void print_api_request_result(api_ctx *ctx, api_request_result res, FILE *stream);

// does the CURL request and returns a JSON object if succeeded
static api_request_result api_request_common(api_ctx *ctx, const char *endpoint)
{
	// ctx->api_url_buf was defined by api_ctx_init as the base url. strcpying `endpoint`
	// to its end will always concatenate both strings, overriding the precedent endpoint
	strcpy(ctx->api_url_buf + ctx->api_url_base_len, endpoint);
	curl_easy_setopt(ctx->curl, CURLOPT_URL, ctx->api_url_buf);

	api_request_result result = {0};
	CURLcode curl_err = curl_easy_perform(ctx->curl);
	if (curl_err)
	{
		result.err = ERR_CURL;
		result.curl_code = curl_err;
		return (result);
	}
	cJSON *json = cJSON_Parse(ctx->out_buf);
	if (!json)
	{
		result.err = ERR_JSON_PARSE;
		const char *error_ptr = cJSON_GetErrorPtr();
		if (!error_ptr) // allocation error
			result.json_error_pos = -1u;
		else
			result.json_error_pos = error_ptr - ctx->out_buf;
		return (result);
	}
	result.json_obj = json;
	return (result);
}

cJSON *do_api_request_to_choice(api_ctx *ctx, const char *endpoint, json_choice *choice, void *out)
{
	api_request_result res = api_request_common(ctx, endpoint);
	if (res.err)
		DO_CLEANUP(print_api_request_result(&g_ctx.api_ctx, res, stderr));
	json_content_error err = json_parse_from_choice(res.json_obj, choice, out);
	if (err)
	{
		res.err = ERR_JSON_CONTENT;
		res.json_content_error = err;
		cJSON_Delete(res.json_obj);
		res.json_obj = NULL;
		DO_CLEANUP(print_api_request_result(&g_ctx.api_ctx, res, stderr));
	}
	return (res.json_obj);
}

cJSON *do_api_request_to_def(api_ctx *ctx, const char *endpoint, json_def *def, void *out)
{
	api_request_result res = api_request_common(ctx, endpoint);
	if (res.err)
		DO_CLEANUP(print_api_request_result(&g_ctx.api_ctx, res, stderr));
	json_content_error err = json_parse_from_def(res.json_obj, def, out);
	if (err)
	{
		res.err = ERR_JSON_CONTENT;
		res.json_content_error = err;
		cJSON_Delete(res.json_obj);
		res.json_obj = NULL;
		DO_CLEANUP(print_api_request_result(&g_ctx.api_ctx, res, stderr));
	}
	return (res.json_obj);
}

static void print_api_request_result(api_ctx *ctx, api_request_result res, FILE *stream)
{
	switch (res.err)
	{
		case ERR_CURL:
			fprintf(stream, "curl_easy_perform() fail: %s\n", curl_easy_strerror(res.curl_code));
			break;
		case ERR_JSON_PARSE:
			fputs("json parsing failed: ", stream);
			if (res.json_error_pos == -1u)
				fputs("out of memory\n", stream);
			else
			{
				fprintf(stream, "error at position %zu\n", res.json_error_pos);
				fprintf(stream, "json content: %s\n", ctx->out_buf);
			}
			break;
		case ERR_JSON_CONTENT:
			fprintf(stream, "json content wasn't what was expected: %s\n", json_content_error_to_string(res.json_content_error));
			fprintf(stream, "json content: %s\n", ctx->out_buf);
			break;
		default:
			if (!res.err)
				fputs("operation succeeded\n", stream);
			else
				fprintf(stream, "unknown error %d\n", res.err);
			break;
	}
}
