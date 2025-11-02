#include "api.h"
#include "soft_fail.h"
#include "ctx.h"
#include <string.h>
#include <assert.h>

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
		CURLcode	curl_code;
		struct
		{
			size_t 				json_error_pos;
			json_content_error	json_content_error;
			cJSON				*json_obj;
		};
	};
}	api_request_result;

static void print_api_request_result(const char *endpoint, api_ctx *ctx, api_request_result res, FILE *stream);

// does the CURL request and returns a JSON object if succeeded
static api_request_result api_request_common(api_ctx *ctx, const char *endpoint, request_type request_type)
{
	assert(request_type == POST || request_type == GET);
	curl_easy_setopt(ctx->curl, CURLOPT_POST, (long int)(request_type == POST));
	// ctx->api_url_buf was defined by api_ctx_init as the base url. strcpying `endpoint`
	// to its end will always concatenate both strings, overriding the precedent endpoint
	strcpy(ctx->api_url_buf + ctx->api_url_base_len, endpoint);
	curl_easy_setopt(ctx->curl, CURLOPT_URL, ctx->api_url_buf);
	ctx->out_buf_cursor = 0;
	ctx->in_buf_cursor = 0;

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

void do_api_request_to_def(
	api_ctx *ctx,
	const char *endpoint,
	request_type request_type,
	json_def *def,
	void *out)
{
	api_request_result res = api_request_common(ctx, endpoint, request_type);
	if (res.err)
		DO_CLEANUP(print_api_request_result(endpoint, &g_ctx.api_ctx, res, stderr));
	json_content_error err = json_parse_from_def(res.json_obj, def, out);
	if (err.kind)
	{
		res.err = ERR_JSON_CONTENT;
		res.json_content_error = err;
		DO_CLEANUP(print_api_request_result(endpoint, &g_ctx.api_ctx, res, stderr); cJSON_Delete(res.json_obj));
	}
}

cJSON *do_api_request(
	api_ctx *ctx,
	const char *endpoint,
	request_type request_type)
{
	api_request_result res = api_request_common(ctx, endpoint, request_type);
	if (res.err)
		DO_CLEANUP(print_api_request_result(endpoint, &g_ctx.api_ctx, res, stderr));
	return (res.json_obj);
}

static void print_api_request_result(const char *endpoint, api_ctx *ctx, api_request_result res, FILE *stream)
{
	fprintf(stream, "%s: ", endpoint);
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
			fprintf(stream, "Json content wasn't good: ");
			json_content_error_print(stream, res.json_content_error);
			break;
		default:
			if (!res.err)
				fputs("operation succeeded\n", stream);
			else
				fprintf(stream, "unknown error %d\n", res.err);
			break;
	}
}
