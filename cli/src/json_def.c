#include "json_def.h"
#include "soft_fail.h"
#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

static const json_def *find_def(const json_def *defs, const char *const name)
{
	const json_def *cur = defs;
	while (cur->name)
	{
		if (!strcmp(cur->name, name))
			return (cur);
		cur++;
	}
	return (NULL);
}

static size_t def_count(const json_def *defs)
{
	const json_def *cur = defs;
	size_t cnt = 0;
	while (cur->name)
	{
		cnt++;
		cur++;
	}
	return (cnt);
}

json_content_error parse_array(cJSON *base, const json_def *def, void *out)
{
	json_content_error error;
	size_t *size_ptr = (size_t *)((u8 *)out + def->offset);
	void **ptr_loc = (void **)((u8 *)out + def->offset + sizeof(size_t));

	int sz = cJSON_GetArraySize(base);

	void *ptr = xmalloc(sz * def->element_len);
	*ptr_loc = ptr;
	cJSON *elem;
	cJSON_ArrayForEach(elem, base)
	{
		error = json_parse_from_def(elem, def->recursive_object, ptr);
		if (error)
		{
			free(ptr);
			*ptr_loc = NULL;
			return error;
		}
		ptr += def->element_len;
	}
	*size_ptr = sz;
	return (0);
}

#define FETCH_IS_NULL_AT_OFFSET(obj, offset) ((u8 *)(obj) + (offset))
#define FETCH_AT_OFFSET(obj, offset, type, is_nullable) (type *)((u8 *)(obj) + (offset) + ((is_nullable) * sizeof(u8)))

json_content_error json_parse_from_def(cJSON *obj, const json_def *defs, void *out)
{
	assert(out && defs);
	*(cJSON **)out = NULL;
	if (!cJSON_IsObject(obj))
		return (json_content_error_INVALID_JSON);
	size_t parsed_count = 0;
	cJSON *cur = obj->child;
	json_content_error recursive_error;
	while (cur)
	{
		if (cJSON_IsInvalid(cur))
			return (json_content_error_INVALID_JSON);
		const json_def *def = find_def(defs, cur->string);
		if (!def)
		{
			cur = cur->next;
			continue;
		}
		if ((def->type & 0xFF) & (cur->type & 0xFF))
		{
			if (def->type & cJSON_NULL)
				*FETCH_IS_NULL_AT_OFFSET(out, def->offset) = cur->type == cJSON_NULL;
			switch (def->type)
			{
				case JSON_BOOL:
					*FETCH_AT_OFFSET(out, def->offset, u8, 0) = cur->type == cJSON_True;
					break;
				case JSON_BOOL_N:
					if (cur->type != cJSON_NULL)
						*FETCH_AT_OFFSET(out, def->offset, u8, 1) = cur->type == cJSON_True;
					break;
				case JSON_DOUBLE:
					*FETCH_AT_OFFSET(out, def->offset, double, 0) = cur->valuedouble;
					break;
				case JSON_DOUBLE_N:
					if (cur->type != cJSON_NULL)
						*FETCH_AT_OFFSET(out, def->offset, double, 1) = cur->valuedouble;
					break;
				case JSON_INT:
					*FETCH_AT_OFFSET(out, def->offset, int, 0) = cur->valueint;
					break;
				case JSON_INT_N:
					if (cur->type != cJSON_NULL)
						*FETCH_AT_OFFSET(out, def->offset, int, 1) = cur->valueint;
					break;
				case JSON_STRING:
					*FETCH_AT_OFFSET(out, def->offset, const char *, 0) = cur->valuestring;
					break;
				case JSON_STRING_N:
					if (cur->type != cJSON_NULL)
						*FETCH_AT_OFFSET(out, def->offset, const char *, 1) = cur->valuestring;
					break;
				case JSON_OBJECT:
					assert(def->recursive_object);
					recursive_error = json_parse_from_def(cur, def->recursive_object, out + def->offset);
					if (recursive_error)
						return (recursive_error);
					break;
				case JSON_OBJECT_N:
					assert(def->recursive_object);
					if (cur->type != cJSON_NULL)
					{
						recursive_error = json_parse_from_def(cur, def->recursive_object, out + def->offset);
						if (recursive_error)
							return (recursive_error);
					}
					break;
				case JSON_ARRAY:
					recursive_error = parse_array(cur, def, out);
					if (recursive_error)
						return recursive_error;
					break;
				// case JSON_ARRAY_N:
				// 	if (cur->type != cJSON_NULL)
				// 	{
				// 		recursive_error = parse_array(cur, def, out);
				// 		if (recursive_error)
				// 			return recursive_error;
				// 	}
				// 	break;
				default:
					fprintf(stderr, "FATAL: Invalid json_def.type value: %d\n", cur->type);
					abort();
			}
			parsed_count++;
		}
		else
			return (json_content_error_INCORRECT_TYPE);
		cur = cur->next;
	}
	if (parsed_count != def_count(defs))
		return (json_content_error_PARTIALLY_PARSED);
	*(cJSON **)out = obj;
	return (0);
}

void json_parse_from_def_force(cJSON *obj, const json_def *defs, void *out)
{
	json_content_error err = json_parse_from_def(obj, defs, out);
	if (err)
	{
		cJSON_Delete(obj);
		clean_and_fail("%s\n", json_content_error_to_string(err));
	}
}

static void json_clean_obj_rec(const json_def *defs, void *in);

static void json_clean_array(const json_def *def, void *in)
{
	size_t *size_ptr = (size_t *)((u8 *)in + def->offset);
	void **ptr_loc = (void **)((u8 *)in + def->offset + sizeof(size_t));

	size_t size = *size_ptr; 
	void *ptr = *ptr_loc;
	for (size_t i = 0; i < size; i++)
	{
		json_clean_obj_rec(def->recursive_object, ptr);
		ptr += def->element_len;
	}
	free(*ptr_loc);
	*ptr_loc = NULL;
}

static void json_clean_obj_rec(const json_def *defs, void *in)
{
	const json_def *cur = defs;
	while (cur->name)
	{
		switch (cur->type)
		{
			case JSON_ARRAY:
				json_clean_array(cur, in);
				break;
			case JSON_OBJECT:
				json_clean_obj_rec(cur->recursive_object, in + cur->offset);
				break;
			case JSON_OBJECT_N:
				if (!*FETCH_IS_NULL_AT_OFFSET(in, cur->offset))
					json_clean_obj_rec(cur->recursive_object, in + cur->offset + sizeof(u8));
				break;
			default:
				break;
		}
		cur++;
	}
}

void json_clean_obj(void *in, const json_def *defs)
{
	cJSON *json = *(cJSON **)in;
	json_clean_obj_rec(defs, in);
	if (json)
		cJSON_Delete(json);
}

void json_def_prettyprint(const json_def *defs, const void *in, FILE *stream, int level)
{
	assert(in && defs);
	const json_def *cur = defs;
	while (cur->name)
	{
		for (int i = 0; i < level; i++)
			putc('\t', stream);
		fprintf(stream, "%s = ", cur->name);
		u8 is_nullable = !!(cur->type & cJSON_NULL);
		if (is_nullable && *FETCH_IS_NULL_AT_OFFSET(in, cur->offset))
			fprintf(stream, "(null)\n");
		else
		{
			switch (cur->type & ~cJSON_NULL)
			{
				case JSON_BOOL:
					fprintf(stream, "%d\n", *FETCH_AT_OFFSET(in, cur->offset, u8, is_nullable));
					break;
				case JSON_DOUBLE:
					fprintf(stream, "%lf\n", *FETCH_AT_OFFSET(in, cur->offset, double, is_nullable));
					break;
				case JSON_INT:
					fprintf(stream, "%d\n", *FETCH_AT_OFFSET(in, cur->offset, int, is_nullable));
					break;
				case JSON_STRING:
					fprintf(stream, "\"%s\"\n", *FETCH_AT_OFFSET(in, cur->offset, const char *, is_nullable));
					break;
				case JSON_OBJECT:
					assert(cur->recursive_object);
					fputs("{\n", stream);
					json_def_prettyprint(cur->recursive_object, in + cur->offset, stream, level + 1);
					break;
				case JSON_ARRAY:
					fputs("[]\n", stream); // sybau
					break;
				default:
					fprintf(stderr, "FATAL: Invalid json_def.type value: %d\n", cur->type);
					abort();
			}
		}
		cur++;
	}
	if (level)
	{
		for (int i = 0; i < level - 1; i++)
			putc('\t', stream);
		putc('}', stream);
		putc('\n', stream);
	}
}

const char *json_content_error_to_string(json_content_error err)
{
	switch (err)
	{
		case (json_content_error_INVALID_JSON):
			return ("Invalid JSON");
		case (json_content_error_PARTIALLY_PARSED):
			return ("Not all expected entries were found");
		case (json_content_error_INCORRECT_TYPE):
			return ("A JSON element was not of the correct type");
		default:
			if (!err)
				return ("No error");
			return ("Unknown error");
	}
}
