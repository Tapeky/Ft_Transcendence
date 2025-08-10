#include "ws.h"
#include <sys/poll.h>
#include <errno.h>
#include <string.h>

static ws_xfer_result ws_recv_common(ws_ctx *ctx)
{
	ws_xfer_result res = {0};
	struct pollfd pollfd = {.events = POLLIN, .fd = ctx->sock, .revents = 0};
	int poll_err = poll(&pollfd, 1, MAX_WS_TIMEOUT);
	if (poll_err < 0)
	{
		res.err = ws_xfer_error_POLL;
		res.poll_errno = errno;
		return (res);
	}
	size_t received = 0;
	const struct curl_ws_frame *meta = NULL;
	CURLcode err = curl_ws_recv(ctx->curl, ctx->recv_buf, sizeof ctx->recv_buf - 1, &received, &meta);
	if (err)
	{
		res.err = ws_xfer_error_CURL;
		res.curl_code = err;
		return (res);
	}
	if (meta->bytesleft)
	{
		res.err = ws_xfer_error_TOO_BIG;
		return (res);
	}
	ctx->recv_buf[received] = 0;
	cJSON *json = cJSON_Parse(ctx->recv_buf);
	if (!json)
	{
		res.err = ws_xfer_error_JSON_PARSE;
		const char *error_ptr = cJSON_GetErrorPtr();
		if (!error_ptr) // allocation error
			res.json_error_pos = -1u;
		else
			res.json_error_pos = error_ptr - ctx->recv_buf;
		return (res);
	}
	res.json_obj = json;
	return (res);
}

ws_xfer_result ws_recv_to_switch(ws_ctx *ctx, json_switch *switch_, void *out)
{
	ws_xfer_result res = ws_recv_common(ctx);
	if (res.err)
		return (res);
	json_content_error content_err = json_parse_from_switch(res.json_obj, switch_, out);
	if (content_err)
	{
		res.err = ws_xfer_error_JSON_CONTENT;
		res.json_content_error = content_err;
		cJSON_Delete(res.json_obj);
		res.json_obj = NULL;
		return (res);
	}
	return (res);
}

ws_xfer_result ws_send(ws_ctx *ctx)
{
	ws_xfer_result res = {0};
	struct pollfd pollfd = {.events = POLLOUT, .fd = ctx->sock, .revents = 0};
	int poll_err = poll(&pollfd, 1, MAX_WS_TIMEOUT);
	if (poll_err < 0)
	{
		res.err = ws_xfer_error_POLL;
		res.poll_errno = errno;
		return (res);
	}
	size_t offset = 0;
	size_t to_send = strnlen(ctx->send_buf, JSON_BUFFER_SIZE);
	CURLcode err = CURLE_OK;
  	while (!err)
	{
		size_t sent;
		err = curl_ws_send(ctx->curl, ctx->send_buf + offset, to_send - offset, &sent, 0, CURLWS_TEXT);
 
		if (err == CURLE_OK)
		{
			offset += sent;
	  		if (offset == to_send)
				break; /* finished sending */
		}
	}
	if (err)
	{
		res.err = ws_xfer_error_CURL;
		res.curl_code = err;
		return (res);
	}
	return (res);
}

void ws_ctx_print_xfer_result(ws_ctx *ctx, ws_xfer_result res, int is_recv, FILE *stream)
{
	const char *xfer_type = is_recv ? "recv" : "send";
	fprintf(stream, "ws_ctx_%s fail: ", xfer_type);
	switch (res.err)
	{
		case ws_xfer_error_CURL:
			fprintf(stream, "curl_ws_%s() fail: %s\n", xfer_type, curl_easy_strerror(res.curl_code));
			break;
		case ws_xfer_error_POLL:
			fprintf(stream, "poll() fail: %s\n", strerror(res.poll_errno));
			break;
		case ws_xfer_error_TOO_BIG:
			fprintf(stream, "message too big !\n");
			break;
		case ws_xfer_error_JSON_PARSE:
			fputs("Json parsing failed: ", stream);
			if (res.json_error_pos == -1u)
				fputs("out of memory\n", stream);
			else
			{
				fprintf(stream, "error at position %zu\n", res.json_error_pos);
				fprintf(stream, "json content: %s\n", ctx->recv_buf);
			}
			break;
		case ws_xfer_error_JSON_CONTENT:
			fprintf(stream, "Json content wasn't what was expected: %s\n", json_content_error_to_string(res.json_content_error));
			fprintf(stream, "Json content: %s\n", ctx->recv_buf);
			break;
		default:
			if (!res.err)
				fputs("Operation succeeded\n", stream);
			else
				fprintf(stream, "Unknown error %d\n", res.err);
			break;
	}
}
