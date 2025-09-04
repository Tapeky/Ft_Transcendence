#ifndef JSON_DEF_H
# define JSON_DEF_H

# include "cJSON.h"
# include "types.h"
# include "bits/types/FILE.h"

typedef enum
{
	JSON_INVALID,
	JSON_BOOL = cJSON_False | cJSON_True,
	JSON_INT = cJSON_Number,
	JSON_DOUBLE = cJSON_Number | (1 << 16),
	JSON_STRING = cJSON_String,
	JSON_ARRAY = cJSON_Array,
	JSON_OBJECT = cJSON_Object
}	json_type;

typedef struct json_def
{
	const char *const	name;
	size_t				offset;
	json_type			type;
	struct json_def		*recursive_object; // if type == JSON_OBJECT
}	json_def;

# define JSON_DEF_OFFSETOF(field) (size_t)(&((CUR_JSON_STRUCT *)0)->field)

#define DEF_BOOL(name, field) {name, JSON_DEF_OFFSETOF(field), JSON_BOOL, NULL},
#define DEF_INT(name, field) {name, JSON_DEF_OFFSETOF(field), JSON_INT, NULL},
#define DEF_DOUBLE(name, field) {name, JSON_DEF_OFFSETOF(field), JSON_DOUBLE, NULL},
#define DEF_STRING(name, field) {name, JSON_DEF_OFFSETOF(field), JSON_STRING, NULL},
#define DEF_ARRAY(name, field) {name, JSON_DEF_OFFSETOF(field), JSON_ARRAY, NULL},
#define DEF_OBJECT(name, def) {name, 0, JSON_OBJECT, (json_def[]){def DEF_END}},
#define DEF_END {NULL, 0, JSON_INVALID, NULL}

typedef struct
{
	json_def to_test;
	json_def *true_def;
	json_def *false_def;
}	json_choice;

// if the json field represented by `boolean_name` is true, parse `true_def`.
// else, parse `false_def`
#define CHOICE_DEF(name, boolean_name, boolean_field_name, true_def, false_def) \
	json_choice name = { \
		DEF_BOOL(boolean_name, boolean_field_name) \
		(json_def[]){true_def DEF_END}, \
		(json_def[]){false_def DEF_END}, \
	}

typedef struct
{
	const char	*name;
	json_def	def;
}	json_switch_entry;

typedef struct
{
	json_def			to_test;
	size_t				match_store_offset; // where the index of the matched entry is stored (as a size_t)
	json_switch_entry	*entries;
}	json_switch;

#define SWITCH_DEF(name, string_json_name, string_field_name, match_store_entry, defs) \
	json_switch name = { \
		DEF_STRING(string_json_name, string_field_name) \
		JSON_DEF_OFFSETOF(match_store_entry), \
		(json_switch_entry[]) { \
			defs \
			{0} \
		} \
	}

#define SWITCH_ENTRY(name, def) \
	{ (name), def },

typedef enum
{
	json_content_error_INVALID_JSON = 1,
	json_content_error_INCORRECT_TYPE,
	json_content_error_PARTIALLY_PARSED,
	json_content_error_SWITCH_NOT_MATCHED
}	json_content_error;

const char *json_content_error_to_string(json_content_error err);

/*
 parses the cJSON object, following directions from `defs`, outputting values to `out`
*/
json_content_error json_parse_from_def(cJSON *obj, const json_def *defs, void *out);

/*
 parses the cJSON object, first finding the boolean field `choice->to_test.name`,
 then parsing `choice->true_def` if said field is true, otherwise parsing `choice->false_def`
*/
json_content_error json_parse_from_choice(cJSON *json, const json_choice *choice, void *out);

/*
 parses the cJSON object, first finding the string field `switch_->to_test.name`,
 then parsing the `json_switch_entry` whose `name` matches with its value
*/
json_content_error json_parse_from_switch(cJSON *json, const json_switch *switch_, void *out);

// mostly used for debugging, to use after a `json_parse_from_def`
void json_def_prettyprint(const json_def *defs, const void *in, FILE *stream, int level);

// mostly used for debugging, to use after a `json_parse_from_choice`
void json_choice_prettyprint(const json_choice *choice, const void *in, FILE *stream);

// mostly used for debugging, to use after a `json_parse_from_switch`
void json_switch_prettyprint(const json_switch *switch_, const void *in, FILE *stream);

#endif
