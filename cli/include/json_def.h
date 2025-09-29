#ifndef JSON_DEF_H
# define JSON_DEF_H

# include "cJSON.h"
# include "types.h"
# include "bits/types/FILE.h"

typedef enum
{
	JSON_INVALID,
	JSON_BOOL = cJSON_False | cJSON_True,
	JSON_BOOL_N = JSON_BOOL | cJSON_NULL,
	JSON_INT = cJSON_Number,
	JSON_INT_N = JSON_INT | cJSON_NULL,
	JSON_DOUBLE = cJSON_Number | (1 << 8),
	JSON_DOUBLE_N = JSON_DOUBLE | cJSON_NULL,
	JSON_STRING = cJSON_String,
	JSON_STRING_N = JSON_STRING | cJSON_NULL,
	JSON_ARRAY = cJSON_Array,
	// JSON_ARRAY_N = JSON_ARRAY | cJSON_NULL,
	JSON_OBJECT = cJSON_Object,
	JSON_OBJECT_N = JSON_OBJECT | cJSON_NULL
}	json_type;

typedef struct json_def
{
	const char *const	name;
	size_t				offset;
	json_type			type;
	struct json_def		*recursive_object; // if type == JSON_OBJECT or JSON_ARRAY
	size_t				element_len; // if type == JSON_ARRAY
}	json_def;

# define DEF_END {NULL, 0, JSON_INVALID, NULL}

# define GLUE_I(x, y) x ## y
# define GLUE(x, y) GLUE_I(x, y)

# define _NULLABLE(x) struct {	\
		u8 is_null;						\
		x value;						\
	} __attribute__((packed))
# define _ARRAY(x) struct { \
		i64 size;						\
		x *arr;							\
	} __attribute__((packed))

# define _DEF_BOOL(x)		u8
# define _DEF_BOOL_N(x)		_NULLABLE(u8)
# define _DEF_INT(x)		int
# define _DEF_INT_N(x)		_NULLABLE(int)
# define _DEF_DOUBLE(x)		double
# define _DEF_DOUBLE_N(x)	_NULLABLE(double)
# define _DEF_STRING(x)		const char *
# define _DEF_STRING_N(x)	_NULLABLE(const char *)
# define _DEF_OBJECT(x)		x
# define _DEF_OBJECT_N(x)	_NULLABLE(x)
# define _DEF_ARRAY(x)		_ARRAY(x)
# define _DEF_ARRAY_N(x)	_NULLABLE(_ARRAY(x))

# define _REC_BOOL(...)
# define _REC_BOOL_N(...)
# define _REC_INT(...)
# define _REC_INT_N(...)
# define _REC_DOUBLE(...)
# define _REC_DOUBLE_N(...)
# define _REC_STRING(...)
# define _REC_STRING_N(...)
# define _REC_OBJECT(recursive_object_name) GLUE(recursive_object_name, _def)
# define _REC_OBJECT_N(recursive_object_name) GLUE(recursive_object_name, _def)
# define _REC_ARRAY(recursive_object_name) GLUE(recursive_object_name, _def), sizeof(recursive_object_name)
# define _REC_ARRAY_N(recursive_object_name) GLUE(recursive_object_name, _def), sizeof(recursive_object_name)

# define PARENS ()
# define EVALUATE(...) EVALUATE1(EVALUATE1(__VA_ARGS__))
# define EVALUATE1(...) EVALUATE2(EVALUATE2(__VA_ARGS__))
# define EVALUATE2(...) EVALUATE3(EVALUATE3(__VA_ARGS__))
# define EVALUATE3(...) EVALUATE4(EVALUATE4(__VA_ARGS__))
# define EVALUATE4(...) __VA_ARGS__

# define _EVALUATE(...) _EVALUATE1(_EVALUATE1(__VA_ARGS__))
# define _EVALUATE1(...) _EVALUATE2(_EVALUATE2(__VA_ARGS__))
# define _EVALUATE2(...) _EVALUATE3(_EVALUATE3(__VA_ARGS__))
# define _EVALUATE3(...) _EVALUATE4(_EVALUATE4(__VA_ARGS__))
# define _EVALUATE4(...) __VA_ARGS__


# define PREPEND_PARAM(param, expr) \
	(param, _EVALUATE(PREPEND_PARAM_ITER expr))

# define PREPEND_PARAM_ITER(a, ...) \
	a __VA_OPT__(, PREPEND_PARAM_REPEAT PARENS (__VA_ARGS__))

# define PREPEND_PARAM_REPEAT() PREPEND_PARAM_ITER

# define FOR_EACH(m, additionnal_param, ...) \
	__VA_OPT__(EVALUATE(FOR_EACH_ITER(m, additionnal_param, __VA_ARGS__)))

# define FOR_EACH_ITER(m, additionnal_param, a, ...) \
	m PREPEND_PARAM(additionnal_param, a) \
	__VA_OPT__(FOR_EACH_REPEAT PARENS (m, additionnal_param, __VA_ARGS__))

# define FOR_EACH_REPEAT() FOR_EACH_ITER

# define STRUCT_CONSTRUCTOR(struct_name, field_type, field_name, ...) \
	GLUE(_DEF_, field_type)(__VA_ARGS__) field_name;

# define DEF_CONSTRUCTOR(struct_name, field_type, field_name, ...)	\
	{																\
		#field_name,												\
		(size_t)&((struct_name *)0)->field_name,					\
		GLUE(JSON_, field_type),									\
		GLUE(_REC_, field_type)(__VA_ARGS__)						\
	},

# define DEFINE_JSON(name, ...)							\
	typedef struct {									\
		cJSON *_json_;									\
		FOR_EACH(STRUCT_CONSTRUCTOR, name, __VA_ARGS__)	\
	}	name;											\
	static json_def GLUE(name, _def)[] = {						\
		FOR_EACH(DEF_CONSTRUCTOR, name, __VA_ARGS__)	\
		DEF_END											\
	}

typedef enum
{
	json_error_kind_INVALID_JSON = 1,
	json_error_kind_INCORRECT_TYPE,
	json_error_kind_PARTIALLY_PARSED,
}	json_error_kind;

typedef struct
{
	json_error_kind	kind;
	cJSON			*node;
}	json_content_error;

# define json_content_error_make(_kind, ...) (json_content_error){.kind = _kind __VA_OPT__(, .node = __VA_ARGS__)}
# define json_content_error_none (json_content_error){0}

void json_content_error_print(FILE *stream, json_content_error err);

/*
 parses the cJSON object, following directions from `defs`, outputting values to `out`
*/
json_content_error json_parse_from_def(cJSON *obj, const json_def *defs, void *out);
void json_clean_obj(void *in, const json_def *defs);
/*
 parses the cJSON object, following directions from `defs`, outputting values to `out`,
 and quits on error
*/
void json_parse_from_def_force(cJSON *obj, const json_def *defs, void *out);

// mostly used for debugging, to use after a `json_parse_from_def`
void json_def_prettyprint(const json_def *defs, const void *in, FILE *stream, int level);

#endif
