#include "json_def.h"
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

#define FETCH_IS_NULL_AT_OFFSET(obj, offset) ((u8 *)(obj) + (offset))
#define FETCH_AT_OFFSET(obj, offset, type, is_nullable) (type *)((u8 *)(obj) + (offset) + ((is_nullable) * sizeof(u8)))

json_content_error json_parse_from_def(cJSON *obj, const json_def *defs, void *out)
{
	assert(out && defs);
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
					recursive_error = json_parse_from_def(cur, def->recursive_object, out);
					if (recursive_error)
						return (recursive_error);
					break;
				case JSON_OBJECT_N:
					assert(def->recursive_object);
					if (cur->type != cJSON_NULL)
					{
						recursive_error = json_parse_from_def(cur, def->recursive_object, out);
						if (recursive_error)
							return (recursive_error);
					}
					break;
				case JSON_ARRAY:
					*FETCH_AT_OFFSET(out, def->offset, cJSON *, 0) = cur;
					break;
				case JSON_ARRAY_N:
					if (cur->type != cJSON_NULL)
						*FETCH_AT_OFFSET(out, def->offset, cJSON *, 1) = cur;
					break;
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
	return ((parsed_count != def_count(defs)) * json_content_error_PARTIALLY_PARSED);
}

json_content_error json_parse_from_choice(cJSON *json, const json_choice *choice, void *out)
{
	assert(out && choice);
	assert(choice->to_test.type == JSON_BOOL);
	assert(choice->to_test.name);
	// cheap but works hehehehehe
	json_def def[] = {
		choice->to_test,
		DEF_END
	};
	json_content_error err = json_parse_from_def(json, def, out);
	if (err)
		return (err);
	u8 result = *FETCH_AT_OFFSET(out, choice->to_test.offset, u8, 0);
	if (result)
		return (json_parse_from_def(json, choice->true_def, out));
	return (json_parse_from_def(json, choice->false_def, out));
}

json_content_error json_parse_from_switch(cJSON *json, const json_switch *switch_, void *out)
{
	assert(out && switch_);
	assert(switch_->to_test.type == JSON_STRING);
	assert(switch_->to_test.name);
	// cheap but works hehehehehe
	json_def def[] = {
		switch_->to_test,
		DEF_END
	};
	json_content_error err = json_parse_from_def(json, def, out);
	if (err)
		return (err);
	const char *key = *FETCH_AT_OFFSET(out, switch_->to_test.offset, const char *, 0);
	size_t i = 0;
	json_switch_entry *cur = switch_->entries;
	while (cur->name)
	{
		if (!strcmp(cur->name, key))
		{
			err = json_parse_from_def(json, &cur->def, out);
			*FETCH_AT_OFFSET(out, switch_->match_store_offset, size_t, 0) = i;
			return (err);
		}
		cur++;
		i++;
	}
	return (json_content_error_SWITCH_NOT_MATCHED);
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
					json_def_prettyprint(cur->recursive_object, in, stream, level + 1);
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

void json_choice_prettyprint(const json_choice *choice, const void *in, FILE *stream)
{
	assert(choice && in);
	assert(choice->to_test.type == JSON_BOOL);
	assert(choice->to_test.name);
	u8 result = *((u8 *)in + choice->to_test.offset);
	fprintf(stream, "%s = %s\n", choice->to_test.name, result ? "true" : "false");
	if (result)
		json_def_prettyprint(choice->true_def, in, stream, 0);
	else
		json_def_prettyprint(choice->false_def, in, stream, 0);
}

void json_switch_prettyprint(const json_switch *switch_, const void *in, FILE *stream)
{
	assert(switch_ && in);
	assert(switch_->to_test.type == JSON_STRING);
	assert(switch_->to_test.name);
	const char *key = *FETCH_AT_OFFSET(in, switch_->to_test.offset, const char *, 0);
	size_t entry_index = *FETCH_AT_OFFSET(in, switch_->match_store_offset, size_t, 0);
	printf("Switch entry %s:\n", key);
	json_def_prettyprint(&switch_->entries[entry_index].def, in, stream, 1);
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
		case (json_content_error_SWITCH_NOT_MATCHED):
			return ("String to query was not in json_switch.entries");
		default:
			if (!err)
				return ("No error");
			return ("Unknown error");
	}
}
