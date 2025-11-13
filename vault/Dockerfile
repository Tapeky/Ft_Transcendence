FROM hashicorp/vault:latest

RUN apk add --no-cache jq curl openssl bash

# ====================================================================
# Étape 1: Création des répertoires
# ====================================================================
RUN mkdir -p /vault/config/certs && \
    mkdir -p /vault/data && \
    mkdir -p /vault/logs

# ====================================================================
# Étape 2: Génération du CA et des certificats lors du build
# ====================================================================

# Générer la clé privée du CA
RUN openssl genrsa -out /vault/config/certs/ca.key 2048

# Générer le certificat du CA (auto-signé)
RUN openssl req -x509 -new -nodes \
    -key /vault/config/certs/ca.key \
    -sha256 -days 365 \
    -out /vault/config/certs/ca.pem \
    -subj "/C=FR/ST=Paris/L=Paris/O=FT-Transcendence/CN=Vault-CA"

# Générer la clé privée pour Vault
RUN openssl genrsa -out /vault/config/certs/vault.key 2048

# Créer un fichier de configuration pour les extensions (SAN)
RUN echo "[req]" > /tmp/openssl.cnf && \
    echo "distinguished_name = req_distinguished_name" >> /tmp/openssl.cnf && \
    echo "req_extensions = v3_req" >> /tmp/openssl.cnf && \
    echo "prompt = no" >> /tmp/openssl.cnf && \
    echo "[req_distinguished_name]" >> /tmp/openssl.cnf && \
    echo "CN = vault" >> /tmp/openssl.cnf && \
    echo "[v3_req]" >> /tmp/openssl.cnf && \
    echo "keyUsage = keyEncipherment, dataEncipherment" >> /tmp/openssl.cnf && \
    echo "extendedKeyUsage = serverAuth" >> /tmp/openssl.cnf && \
    echo "subjectAltName = @alt_names" >> /tmp/openssl.cnf && \
    echo "[alt_names]" >> /tmp/openssl.cnf && \
    echo "DNS.1 = vault" >> /tmp/openssl.cnf && \
    echo "DNS.2 = localhost" >> /tmp/openssl.cnf && \
    echo "IP.1 = 127.0.0.1" >> /tmp/openssl.cnf

# Générer le CSR pour Vault
RUN openssl req -new \
    -key /vault/config/certs/vault.key \
    -out /vault/config/certs/vault.csr \
    -config /tmp/openssl.cnf

# Signer le certificat Vault avec le CA
RUN openssl x509 -req \
    -in /vault/config/certs/vault.csr \
    -CA /vault/config/certs/ca.pem \
    -CAkey /vault/config/certs/ca.key \
    -CAcreateserial \
    -out /vault/config/certs/vault.crt \
    -days 365 \
    -sha256 \
    -extfile /tmp/openssl.cnf \
    -extensions v3_req

# Vérifier les certificats
RUN echo "=== Vérification du certificat Vault ===" && \
    openssl x509 -in /vault/config/certs/vault.crt -text -noout | grep -A2 "Subject:" && \
    openssl x509 -in /vault/config/certs/vault.crt -text -noout | grep -A3 "Subject Alternative Name"

# Définir les permissions
RUN chmod 644 /vault/config/certs/vault.crt && \
    chmod 644 /vault/config/certs/ca.pem && \
    chmod 600 /vault/config/certs/vault.key && \
    chmod 600 /vault/config/certs/ca.key

# ====================================================================
# Étape 3: Copie des fichiers de configuration
# ====================================================================
COPY ./config/vault-config.hcl /vault/config/vault-config.hcl
COPY ./scripts /vault/scripts

# ====================================================================
# Étape 4: Permissions et volumes
# ====================================================================
RUN chmod +x /vault/scripts/*.sh

ENV VAULT_CONFIG_DIR=/vault/config

VOLUME /vault/logs
VOLUME /vault/data

# Point d'entrée
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["bash", "/vault/scripts/vault-entrypoint.sh"]