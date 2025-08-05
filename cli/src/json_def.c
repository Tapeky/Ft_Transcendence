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

int json_parse_from_def(cJSON *obj, const json_def *defs, void *out)
{
	assert(out && defs);
	if (!cJSON_IsObject(obj))
		return (0);
	size_t parsed_count = 0;
	cJSON *cur = obj->child;
	while (cur)
	{
		if (cJSON_IsInvalid(cur))
			return (0);
		const json_def *def = find_def(defs, cur->string);
		if (!def)
		{
			cur = cur->next;
			continue;
		}
		if ((def->type & 0xFF) & (cur->type & 0xFF) || (def->type == JSON_STRING && cur->type == cJSON_NULL))
		{
			#define OFFSET_AS(type) (type *)((u8 *)out + def->offset)
			switch (def->type)
			{
				case JSON_BOOL:
					*OFFSET_AS(u8) = cur->type == cJSON_True;
					break;
				case JSON_DOUBLE:
					*OFFSET_AS(double) = cur->valuedouble;
					break;
				case JSON_INT:
					*OFFSET_AS(int) = cur->valueint;
					break;
				case JSON_STRING:
					*OFFSET_AS(const char *) = NULL;
					if (cur->type == cJSON_String)
						*OFFSET_AS(const char *) = cur->valuestring;
					break;
				case JSON_OBJECT:
					assert(def->recursive_object);
					if (!json_parse_from_def(cur, def->recursive_object, out))
						return (0);
					break;
				case JSON_ARRAY:
					*OFFSET_AS(cJSON *) = cur->child;
					break;
				default:
					fprintf(stderr, "FATAL: Invalid json_def.type value: %d\n", cur->type);
					abort();
			}
			#undef OFFSET_AS
			parsed_count++;
		}
		else
			return (0);
		cur = cur->next;
	}
	return (parsed_count == def_count(defs));
}

int json_parse_from_switch(cJSON *json, const json_switch *switch_, void *out)
{
	assert(out && switch_);
	assert(switch_->to_test.type == JSON_BOOL);
	assert(switch_->to_test.name);
	// cheap but works hehehehehe
	json_def def[] = {
		switch_->to_test,
		DEF_END
	};
	int err = json_parse_from_def(json, def, out);
	if (!err)
		return (0);
	u8 result = *((u8 *)out + switch_->to_test.offset);
	if (result)
		return (json_parse_from_def(json, switch_->true_def, out));
	return (json_parse_from_def(json, switch_->false_def, out));
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
		#define OFFSET_AS(type) (type *)((u8 *)in + cur->offset)
		switch (cur->type)
		{
			case JSON_BOOL:
				fprintf(stream, "%d\n", *OFFSET_AS(u8));
				break;
			case JSON_DOUBLE:
				fprintf(stream, "%lf\n", *OFFSET_AS(double));
				break;
			case JSON_INT:
				fprintf(stream, "%d\n", *OFFSET_AS(int));
				break;
			case JSON_STRING:
				fprintf(stream, "%s\n", *OFFSET_AS(const char * _Nullable));
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
		#undef OFFSET_AS
		cur++;
	}
	if (level)
	{
		for (int i = 0; i < level - 1; i++)
			putc('\t', stream);
		puts("}\n");
	}
}

void json_switch_prettyprint(const json_switch *switch_, const void *in, FILE *stream)
{
	assert(switch_ && in);
	assert(switch_->to_test.type == JSON_BOOL);
	assert(switch_->to_test.name);
	u8 result = *((u8 *)in + switch_->to_test.offset);
	fprintf(stream, "%s = %s\n", switch_->to_test.name, result ? "true" : "false");
	if (result)
		json_def_prettyprint(switch_->true_def, in, stream, 0);
	else
		json_def_prettyprint(switch_->false_def, in, stream, 0);
}
