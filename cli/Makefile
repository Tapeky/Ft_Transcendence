DEBUG ?= 1
NAME := trans_cli
SOURCE_DIR := ./src/
OBJ_DIR := ./obj/
INCLUDE_DIRS := ./include/ ./cJSON
CFLAGS := -Wall -Wextra -Werror -MMD
CC := clang
CJSON := cJSON/libcjson.a
EXT_LIBS := $(addprefix -l,	\
	X11 m curl				\
)

C_FILES := main input ctx term term_components aabb best_component json_def api api_init ws ws_init

include Functions.mk

all: $(NAME)

$(OBJECTS): $(OBJ_DIR)%.o : $(SOURCE_DIR)%.c
	$(call echo_progress, $<)
	@$(CC) $(CFLAGS) $(INCLUDE_DIRS) -c $< -o $@

$(NAME): $(OBJ_DIR) $(LIBS) $(OBJECTS) $(CJSON)
	@$(CC) $(CFLAGS) $(OBJECTS) $(LIB_FILES) $(CJSON) $(EXT_LIBS) -o $(NAME)

$(CJSON):
	@$(MAKE) -C cJSON static

clean:
	$(call make_libs, clean)
	@rm -rf $(OBJ_DIR)
	@$(MAKE) -C cJSON clean
	@if [ $(_REC_) -ne 1 ] ;\
	then \
		echo "----- Clean done" ;\
	fi

fclean:
	$(call make_libs, fclean)
	@$(MAKE) clean
	@rm -f $(NAME)
	@if [ $(_REC_) -ne 1 ] ;\
	then \
		echo "----- Fclean done" ;\
	fi

re: fclean all

-include $(DEPS)

.PHONY: all clean fclean re bonus