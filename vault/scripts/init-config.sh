#!/bin/bash
set -e

# Définitions des chemins et variables
UNSEAL_KEY_PATH="/vault_credentials/unseal_key"
ROOT_TOKEN_PATH="/vault_credentials/root_token"
VAULT_ADDR="https://vault:8200"
export VAULT_SKIP_VERIFY=true
export VAULT_CLIENT_TIMEOUT="15s" 

echo "INFO: Vault est marqué comme 'healthy'. Début de l'initialisation."

# ============================================================================
# VERIFICATION D'ATTENTE FINALE
# ============================================================================
max_attempts=5
attempt_num=1

until vault status -tls-skip-verify -address=https://vault:8200 > /dev/null 2>&1 || 
    [ $? -eq 2 ] || [ $attempt_num -ge $max_attempts ]; do
  echo "DEBUG: Verification rapide: Vault repond-il? (tentative $attempt_num/$max_attempts)..."
  sleep 1
  attempt_num=$((attempt_num + 1))
done

if [ $attempt_num -ge $max_attempts ]; then
    echo "ERREUR: Le serveur Vault n'a pas repondu à la CLI apres $max_attempts tentatives."
    exit 1
fi
echo "INFO: Serveur Vault est en ligne et joignable."

# ============================================================================
# 1. INITIALISATION
# ============================================================================

if ! vault status | grep 'Initialized' | grep -q 'true'; then
    echo "INFO: Vault non initialisé. Initialisation en cours..."
    
    init_output=$(vault operator init -format=json -key-shares=1 -key-threshold=1)
    
    UNSEAL_KEY=$(echo "$init_output" | jq -r '.unseal_keys_b64[0]')
    ROOT_TOKEN=$(echo "$init_output" | jq -r '.root_token')
    
    echo "$UNSEAL_KEY" > $UNSEAL_KEY_PATH
    echo "$ROOT_TOKEN" > $ROOT_TOKEN_PATH
    
    echo "INFO: Initialisation terminée. Clé de déscellement et token root sauvegardés."
else
    echo "INFO: Vault est déjà initialisé."
fi

# Lecture des secrets
if [ -f $UNSEAL_KEY_PATH ]; then
    UNSEAL_KEY=$(cat $UNSEAL_KEY_PATH)
else
    echo "ERREUR: Clé de déscellement non trouvée à $UNSEAL_KEY_PATH."
    exit 1
fi

if [ -f $ROOT_TOKEN_PATH ]; then
    ROOT_TOKEN=$(cat $ROOT_TOKEN_PATH)
    export VAULT_TOKEN=$ROOT_TOKEN
else
    echo "ERREUR: Token root non trouvé à $ROOT_TOKEN_PATH."
    exit 1
fi

# ============================================================================
# 2. DÉSCELLEMENT (UNSEAL)
# ============================================================================

if vault status | grep 'Sealed' | grep -q 'true'; then
    echo "INFO: Vault est scellé. Déscellement en cours..."
    vault operator unseal "$UNSEAL_KEY"
    echo "INFO: Déscellement terminé."
else
    echo "INFO: Vault est déjà déscellé."
fi

# ============================================================================
# 3. CONFIGURATION POST-INITIALISATION
# ============================================================================

echo "INFO: Lancement de la configuration..."

# Enable KV secrets engine v2
if ! vault secrets list | grep -q "^secret/"; then
    echo "INFO: Enabling KV secrets engine..."
    vault secrets enable -path=secret -version=2 kv
else
    echo "INFO: KV engine already enabled"
fi

# ============================================================================
# DATABASE CREDENTIALS
# ============================================================================
if ! vault kv get secret/database > /dev/null 2>&1; then
    echo "INFO: Storing database credentials..."
    vault kv put secret/database \
      username="db_user" \
      password="secure_db_password_$(date +%s)" \
      host="database" \
      port="5432" \
      database="ft_transcendence"
else
    echo "INFO: Database credentials already exist"
fi

# ============================================================================
# API KEYS
# ============================================================================
if ! vault kv get secret/api > /dev/null 2>&1; then
    echo "INFO: Storing API keys..."
    vault kv put secret/api \
      jwt_secret="$(openssl rand -base64 32)" \
      refresh_token_secret="$(openssl rand -base64 32)" \
      encryption_key="$(openssl rand -base64 32)"
else
    echo "INFO: API keys already exist"
fi

# ============================================================================
# OAUTH CREDENTIALS
# ============================================================================
if ! vault kv get secret/oauth > /dev/null 2>&1; then
    echo "INFO: Storing OAuth credentials..."
    vault kv put secret/oauth \
      github_client_id="${GITHUB_CLIENT_ID:-Iv1.8b88ce2b5c4f58e3}" \
      github_client_secret="${GITHUB_CLIENT_SECRET:-a4946c8be33842c3170a7d52f6f140a349c2d76a}" \
      google_client_id="${GOOGLE_CLIENT_ID:-123456789012-abcde.apps.googleusercontent.com}" \
      google_client_secret="${GOOGLE_CLIENT_SECRET:-GOCSPX-abcde}" \
      redirect_uri="https://localhost:8443/api/auth/oauth/callback"
else
    echo "INFO: OAuth credentials already exist"
fi

# ============================================================================
# SSL/TLS CONFIG
# ============================================================================
if ! vault kv get secret/ssl > /dev/null 2>&1; then
    echo "INFO: Storing SSL/TLS config..."
    vault kv put secret/ssl \
      backend_internal_ca_path="/app/ssl/ca.pem" \
      nginx_public_ca_path="/etc/nginx/conf/ca.pem"
else
    echo "INFO: SSL/TLS config already exists"
fi

# ============================================================================
# APP SECRETS
# ============================================================================
if ! vault kv get secret/app > /dev/null 2>&1; then
    echo "INFO: Storing application secrets..."
    vault kv put secret/app \
      session_secret="$(openssl rand -base64 32)" \
      api_rate_limit="100/minute"
else
    echo "INFO: Application secrets already exist"
fi

# ============================================================================
# SMTP/EMAIL CONFIG
# ============================================================================
if ! vault kv get secret/smtp > /dev/null 2>&1; then
    echo "INFO: Storing SMTP/Email config..."
    vault kv put secret/smtp \
      smtp_host="mail.example.com" \
      smtp_port="587" \
      smtp_user="user@example.com" \
      smtp_password="$(openssl rand -base64 32)" \
      email_from="no-reply@ft-transcendence.com"
else
    echo "INFO: SMTP/Email config already exists"
fi

# ============================================================================
# ACTIVER PKI (Certificats internes pour Backend)
# ============================================================================
echo "INFO: Configuration du moteur PKI (Internal Backend)..."

if ! vault secrets list | grep -q "^pki/"; then
    echo "INFO: Activation du moteur PKI..."
    vault secrets enable -path=pki pki
    vault secrets tune -max-lease-ttl=87600h pki
else
    echo "INFO: PKI internal already enabled"
fi

# Vérifier si le CA existe déjà
if ! vault read pki/cert/ca > /dev/null 2>&1; then
    echo "INFO: Génération du CA racine dans PKI interne..."
    vault write -format=json pki/root/generate/internal \
        common_name="FT-Transcendence Internal CA" \
        issuer_name="root-2025" \
        ttl=87600h > /tmp/pki_ca_response.json
    
    jq -r '.data.certificate' /tmp/pki_ca_response.json > /vault_credentials/pki_ca.pem
    echo "✓ CA racine PKI interne créé avec succès"
    cat /vault_credentials/pki_ca.pem | head -3
    
    # Configurer les URLs du CA
    vault write pki/config/urls \
        issuing_certificates="https://vault:8200/v1/pki/ca" \
        crl_distribution_points="https://vault:8200/v1/pki/crl"
else
    echo "INFO: CA racine PKI interne existe déjà"
    vault read -field=certificate pki/cert/ca > /vault_credentials/pki_ca.pem
fi

# Configurer le rôle pour le backend
if ! vault read pki/roles/backend-internal-role > /dev/null 2>&1; then
    echo "INFO: Configuration du rôle PKI 'backend-internal-role'..."
    vault write pki/roles/backend-internal-role \
        allowed_domains="backend,localhost" \
        allow_bare_domains=true \
        allow_subdomains=true \
        max_ttl="720h" \
        key_usage="DigitalSignature,KeyEncipherment" \
        ext_key_usage="ServerAuth,ClientAuth"
else
    echo "INFO: Rôle backend-internal-role existe déjà"
fi

# ============================================================================
# ACTIVER PKI (Certificats publics Nginx)
# ============================================================================
echo "INFO: Configuration du moteur PKI (Public Nginx)..."

if ! vault secrets list | grep -q "^pki_nginx/"; then
    echo "INFO: Activation du moteur PKI Nginx..."
    vault secrets enable -path=pki_nginx pki
    vault secrets tune -max-lease-ttl=87600h pki_nginx
else
    echo "INFO: PKI nginx already enabled"
fi

# Vérifier si le CA existe déjà
if ! vault read pki_nginx/cert/ca > /dev/null 2>&1; then
    echo "INFO: Génération du CA racine dans PKI Nginx..."
    vault write -format=json pki_nginx/root/generate/internal \
        common_name="FT-Transcendence Public CA" \
        issuer_name="nginx-root-2025" \
        ttl=87600h > /tmp/pki_nginx_ca_response.json
    
    jq -r '.data.certificate' /tmp/pki_nginx_ca_response.json > /vault_credentials/pki_nginx_ca.pem
    echo "✓ CA racine PKI Nginx créé avec succès"
    cat /vault_credentials/pki_nginx_ca.pem | head -3
    
    # Configurer les URLs du CA
    vault write pki_nginx/config/urls \
        issuing_certificates="https://vault:8200/v1/pki_nginx/ca" \
        crl_distribution_points="https://vault:8200/v1/pki_nginx/crl"
else
    echo "INFO: CA racine PKI Nginx existe déjà"
    vault read -field=certificate pki_nginx/cert/ca > /vault_credentials/pki_nginx_ca.pem
fi

# Configurer le rôle pour ModSecurity
if ! vault read pki_nginx/roles/modsecurity-public-role > /dev/null 2>&1; then
    echo "INFO: Configuration du rôle PKI 'modsecurity-public-role'..."
    vault write pki_nginx/roles/modsecurity-public-role \
        allowed_domains="localhost,nginx,backend,frontend" \
        allow_bare_domains=true \
        allow_subdomains=false \
        max_ttl="720h" \
        key_usage="DigitalSignature,KeyEncipherment" \
        ext_key_usage="ServerAuth"
else
    echo "INFO: Rôle modsecurity-public-role existe déjà"
fi

# ============================================================================
# ACTIVER PKI (Certificats publics Frontend)
# ============================================================================
echo "INFO: Configuration du moteur PKI (Public Frontend)..."

if ! vault secrets list | grep -q "^pki_frontend/"; then
    echo "INFO: Activation du moteur PKI Frontend..."
    vault secrets enable -path=pki_frontend pki
    vault secrets tune -max-lease-ttl=87600h pki_frontend
else
    echo "INFO: PKI frontend already enabled"
fi

# Vérifier si le CA existe déjà
if ! vault read pki_frontend/cert/ca > /dev/null 2>&1; then
    echo "INFO: Génération du CA racine dans PKI frontend..."
    vault write -format=json pki_frontend/root/generate/internal \
        common_name="FT-Transcendence Public CA" \
        issuer_name="frontend-root-2025" \
        ttl=87600h > /tmp/pki_frontend_ca_response.json
    
    jq -r '.data.certificate' /tmp/pki_frontend_ca_response.json > /vault_credentials/pki_frontend_ca.pem
    echo "✓ CA racine PKI Frontend créé avec succès"
    cat /vault_credentials/pki_frontend_ca.pem | head -3
    
    # Configurer les URLs du CA
    vault write pki_frontend/config/urls \
        issuing_certificates="https://vault:8200/v1/pki_frontend/ca" \
        crl_distribution_points="https://vault:8200/v1/pki_frontend/crl"
else
    echo "INFO: CA racine PKI Frontend existe déjà"
    vault read -field=certificate pki_frontend/cert/ca > /vault_credentials/pki_frontend_ca.pem
fi

# Configurer le rôle pour Frontend
if ! vault read pki_frontend/roles/frontend-public-role > /dev/null 2>&1; then
    echo "INFO: Configuration du rôle PKI 'frontend-public-role'..."
    vault write pki_frontend/roles/frontend-public-role \
        allowed_domains="localhost,frontend" \
        allow_bare_domains=true \
        allow_subdomains=false \
        max_ttl="720h" \
        key_usage="DigitalSignature,KeyEncipherment" \
        ext_key_usage="ServerAuth"
else
    echo "INFO: Rôle frontend-public-role existe déjà"
fi

# ============================================================================
# CRÉATION DES POLITIQUES
# ============================================================================
echo "INFO: Création des politiques Vault..."

# Backend service policy
vault policy write backend-policy - <<'EOF'
# Permet de lire les secrets KV
path "secret/data/*" {
  capabilities = ["read"]
}
# Permet de demander un certificat interne
path "pki/issue/backend-internal-role" {
  capabilities = ["read", "update"]
}
# Permet de lire le CA
path "pki/cert/ca" {
  capabilities = ["read"]
}
# Permet de lire le token KV généré
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
EOF

# Nginx/ModSecurity policy
vault policy write nginx-policy - <<'EOF'
# Permet de demander un certificat public
path "pki_nginx/issue/modsecurity-public-role" {
  capabilities = ["read", "update"]
}
# Permet de lire le CA bundle pour le mTLS
path "pki/cert/ca" {
  capabilities = ["read"]
}
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
EOF

# Frontend policy
vault policy write frontend-policy - <<'EOF'
# Permet de demander un certificat public
path "pki_frontend/issue/frontend-public-role" {
  capabilities = ["read", "update"]
}
# Permet de lire le CA bundle pour le mTLS
path "pki/cert/ca" {
  capabilities = ["read"]
}
path "auth/token/lookup-self" {
  capabilities = ["read"]
}
EOF

# ============================================================================
# CRÉATION DES APPROLES
# ============================================================================

# Enable AppRole if not already enabled
if ! vault auth list | grep -q "^approle/"; then
    echo "INFO: Activation du moteur AppRole..."
    vault auth enable approle
else
    echo "INFO: AppRole already enabled"
fi

# AppRole pour le Backend
if ! vault read auth/approle/role/backend-role > /dev/null 2>&1; then
    echo "INFO: Création de l'AppRole 'backend-role'..."
    vault write auth/approle/role/backend-role \
        token_policies="backend-policy" \
        token_ttl="1h" \
        token_max_ttl="24h" \
        secret_id_num_uses=0 \
        secret_id_ttl="0"
else
    echo "INFO: AppRole backend-role existe déjà"
fi

# Récupération et sauvegarde du RoleID et du SecretID pour le Backend
if [ ! -f /vault_credentials/backend_role_id ] || [ ! -f /vault_credentials/backend_secret_id ]; then
    vault read -format=json auth/approle/role/backend-role/role-id | jq -r '.data.role_id' > /vault_credentials/backend_role_id
    vault write -f -format=json auth/approle/role/backend-role/secret-id | jq -r '.data.secret_id' > /vault_credentials/backend_secret_id
    echo "INFO: RoleID/SecretID du backend sauvegardés."
else
    echo "INFO: RoleID/SecretID du backend existent déjà"
fi

# AppRole pour Nginx/ModSecurity
if ! vault read auth/approle/role/nginx-role > /dev/null 2>&1; then
    echo "INFO: Création de l'AppRole 'nginx-role'..."
    vault write auth/approle/role/nginx-role \
        token_policies="nginx-policy" \
        token_ttl="1h" \
        token_max_ttl="24h" \
        secret_id_num_uses=0 \
        secret_id_ttl="0"
else
    echo "INFO: AppRole nginx-role existe déjà"
fi

# Récupération et sauvegarde du RoleID et du SecretID pour Nginx
if [ ! -f /vault_credentials/nginx_role_id ] || [ ! -f /vault_credentials/nginx_secret_id ]; then
    vault read -format=json auth/approle/role/nginx-role/role-id | jq -r '.data.role_id' > /vault_credentials/nginx_role_id
    vault write -f -format=json auth/approle/role/nginx-role/secret-id | jq -r '.data.secret_id' > /vault_credentials/nginx_secret_id
    echo "INFO: RoleID/SecretID de nginx sauvegardés."
else
    echo "INFO: RoleID/SecretID de nginx existent déjà"
fi

# AppRole pour Frontend
if ! vault read auth/approle/role/frontend-role > /dev/null 2>&1; then
    echo "INFO: Création de l'AppRole 'frontend-role'..."
    vault write auth/approle/role/frontend-role \
        token_policies="frontend-policy" \
        token_ttl="1h" \
        token_max_ttl="24h" \
        secret_id_num_uses=0 \
        secret_id_ttl="0"
else
    echo "INFO: AppRole frontend-role existe déjà"
fi

# Récupération et sauvegarde du RoleID et du SecretID pour le Frontend
if [ ! -f /vault_credentials/frontend_role_id ] || [ ! -f /vault_credentials/frontend_secret_id ]; then
    vault read -format=json auth/approle/role/frontend-role/role-id | jq -r '.data.role_id' > /vault_credentials/frontend_role_id
    vault write -f -format=json auth/approle/role/frontend-role/secret-id | jq -r '.data.secret_id' > /vault_credentials/frontend_secret_id
    echo "INFO: RoleID/SecretID du frontend sauvegardés."
else
    echo "INFO: RoleID/SecretID du frontend existent déjà"
fi
  
# ============================================================================
# ACTIVER LE JOURNAL D'AUDIT
# ============================================================================
if ! vault audit list | grep -q "^file/"; then
    echo "INFO: Activation du journal d'audit..."
    vault audit enable file file_path=/vault/logs/audit.log
else
    echo "INFO: Journal d'audit déjà activé"
fi

# ============================================================================
# VERIFICATION
# ============================================================================
echo "Verifying secrets..."
vault kv get secret/database > /dev/null 2>&1 && echo "✓ Database secrets OK"
vault kv get secret/api > /dev/null 2>&1 && echo "✓ API secrets OK"

echo "============================================="
echo "Vault initialization complete!"
echo "============================================="
echo "Available secrets:"
echo "  - secret/database (DB credentials)"
echo "  - secret/api (API keys & tokens)"
echo "  - secret/oauth (OAuth credentials)"
echo "  - secret/ssl (SSL/TLS config)"
echo "  - secret/app (Application secrets)"
echo "  - secret/smtp (Email config)"
echo "  - AppRoles and PKI configured."
echo "============================================="