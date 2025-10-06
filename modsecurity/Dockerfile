FROM Ubuntu:22.04

RUN apt-get update && apt-get upgrade -y

COPY ./script/setup.sh /script/setup.sh

RUN chmod +X ./script/setup.sh

CMD ["sh", "./script/setup.sh" ]
