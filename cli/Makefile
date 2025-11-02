DEBUG ?= 1
NAME := trans_cli
SOURCE_DIR := ./src/
OBJ_DIR := ./obj/
INCLUDE_DIRS := ./include/ ./deps/cJSON ./deps/curl/include
CFLAGS := -Wall -Wextra -Werror -Wno-missing-field-initializers -MMD -Wno-unused-label
CC := clang
EXT_LIBS := $(addprefix -l,								\
	X11 m												\
	ssl crypto z zstd brotlidec ldap lber idn2 nghttp2	\
)
LIBCURL := deps/curl/lib/.libs/libcurl.a
CJSON := deps/cJSON/libcjson.a

C_FILES := main input ctx term term_components aabb best_component json_def api api_init ws ws_init soft_fail

include Functions.mk

all: $(NAME)

$(OBJECTS): $(OBJ_DIR)%.o : $(SOURCE_DIR)%.c deps
	$(call echo_progress, $<)
	@$(CC) $(CFLAGS) $(INCLUDE_DIRS) -c $< -o $@

$(NAME): $(OBJ_DIR) $(LIBS) $(OBJECTS) $(CJSON) $(LIBCURL)
	@$(CC) $(CFLAGS) $(OBJECTS) $(LIB_FILES) $(CJSON) $(LIBCURL) $(EXT_LIBS) -o $(NAME)

clean:
	@rm -rf $(OBJ_DIR)
	@if [ $(_REC_) -ne 1 ] ;\
	then \
		echo "----- Clean done" ;\
	fi

fclean:
	@$(MAKE) clean
	@rm -f $(NAME)
	@if [ $(_REC_) -ne 1 ] ;\
	then \
		echo "----- Fclean done" ;\
	fi

re: fclean all

deps:
	@echo Extracting dependencies...
	@mkdir deps
	@tar -xf deps.tar.gz

clean-deps:
	@echo Cleaning dependencies...
	@rm -rf deps

$(CJSON): deps
	@$(MAKE) -C deps/cJSON static

$(LIBCURL): deps
	@cd deps/curl && \
		if ! [ -f Makefile ]; then \
			./configure --with-openssl --without-libpsl --enable-websockets --disable-shared; \
		fi ; \
		printf '\e[32mBuilding libcurl...\e[39m\n' ; \
		$(MAKE)

-include $(DEPS)

.PHONY: all clean fclean re clean-deps
