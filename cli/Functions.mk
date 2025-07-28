ifndef _REC_
_REC_=0
endif

ifneq ($(DEBUG), 0)
ifeq ($(_REC_), 0)
$(info Building in debug)
endif
CFLAGS := $(CFLAGS) -DDEBUG -g
DEBUG := 1
else
CFLAGS := $(CFLAGS) -O3
DEBUG := 0
endif

# Suppresses "nothing to be done for all" message
.DEFAULT_GOAL := dfl
dfl: all
	@:
.PHONY: dfl

MAKE := DEBUG=$(DEBUG) _REC_=1 $(MAKE) --no-print-directory
INCLUDE_DIRS := $(addprefix -I, $(INCLUDE_DIRS))
C_FILES := $(addsuffix .c, $(C_FILES))
SOURCES := $(addprefix $(SOURCE_DIR), $(C_FILES))
OBJECTS := $(addprefix $(OBJ_DIR), $(C_FILES:.c=.o))
DEPS = $(OBJECTS:.o=.d)
N_FILES := $(words $(OBJECTS))

ifdef LIBS
LIB_FILES := $(foreach lib,$(LIBS),$(lib)/$(lib).a)
$(LIBS):
	@$(MAKE) -C $@
.PHONY: $(LIBS)
define make_libs
	$(foreach lib,$(LIBS),
	@$(MAKE) -C $(lib) $(1))
endef
else
define make_libs
endef
endif

$(OBJ_DIR):
	@(cd $(SOURCE_DIR) && find . -type d -exec mkdir -p -- $(shell pwd)/$(OBJ_DIR){} \;)

N := 1
BAR_WIDTH ?= 30

define echo_progress
	@perc=$$((100 * $(N) / $(N_FILES))) ; \
	n_full=$$(($$perc * $(BAR_WIDTH) / 100)) ; \
	n_space=$$(($(BAR_WIDTH) - $$n_full)) ;\
	if [ $(N) -eq 1 ] ; \
	then \
		printf "Compiling $(NAME)...\n" ; \
	else \
		printf "\e[A" ; \
	fi ; \
	printf "\e[K  \e[0;31m[" ; \
	for i in `seq $$n_full` ; \
	do \
		printf '=' ; \
	done ; \
	printf '>' ; \
	for i in `seq $$n_space` ; \
	do \
		printf ' ' ; \
	done ; \
	printf "]    \e[0;32m$(1)\e[m\n" ; \
	if [ $(N) -eq $(N_FILES) ] ; \
	then \
		printf "\e[5;92mDone\e[m\n\n" ; \
	fi
	
	$(eval N := $(shell expr $(N) + 1))
endef
