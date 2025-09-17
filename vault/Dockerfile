FROM hashicorp/vault:latest

RUN apk add --no-cache jq curl

COPY /scripts/init-vault.sh /vault/scripts/init-vault.sh
RUN chmod +x /vault/scripts/init-vault.sh