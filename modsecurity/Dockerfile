FROM Ubuntu:22.04

RUN apt update && apt upgrade -y

RUN sudo apt install gcc make build-essential autoconf automake libtool libcurl4-openssl-dev liblua5.3-dev libfuzzy-dev ssdeep gettext pkg-config \
libgeoip-dev libyajl-dev doxygen libpcre++-dev libpcre2-16-0 libpcre2-dev libpcre2-posix3 zlib1g zlib1g-dev -y

COPY ./script/setup.sh /script/setup.sh

RUN chmod +X ./script/setup.sh

CMD ["sh", "./script/setup.sh" ]
