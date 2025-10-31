#!/bin/sh
set -e

echo "Waiting for Vault to be ready..."
sleep 5

# Wait for Vault to be available
until vault status > /dev/null 2>&1; do
  echo "Waiting for Vault..."
  sleep 2
done

echo "Vault is ready!"

# Enable KV secrets engine v2
echo "Enabling KV secrets engine..."
vault secrets enable -path=secret -version=2 kv || echo "KV engine already enabled"

# ============================================================================
# DATABASE CREDENTIALS
# ============================================================================
echo "Storing database credentials..."
vault kv put secret/database \
  username="db_user" \
  password="secure_db_password_$(date +%s)" \
  host="database" \
  port="5432" \
  database="ft_transcendence"

# ============================================================================
# API KEYS
# ============================================================================
echo "Storing API keys..."
vault kv put secret/api \
  jwt_secret="$(openssl rand -base64 32)" \
  refresh_token_secret="$(openssl rand -base64 32)" \
  encryption_key="$(openssl rand -base64 32)"

# ============================================================================
# OAUTH CREDENTIALS (Example)
# ============================================================================
echo "Storing OAuth credentials..."
vault kv put secret/oauth \
  client_id="your_oauth_client_id" \
  client_secret="your_oauth_client_secret" \
  redirect_uri="http://localhost:3000/callback"

# ============================================================================
# SSL/TLS CERTIFICATES (Example - store cert paths or actual certs)
# ============================================================================
echo "Storing SSL configuration..."
vault kv put secret/ssl \
  cert_path="/etc/nginx/conf/server.crt" \
  key_path="/etc/nginx/conf/server.key" \
  ca_bundle_path="/etc/ssl/certs/ca-bundle.crt"

# ============================================================================
# APPLICATION SECRETS
# ============================================================================
echo "Storing application secrets..."
vault kv put secret/app \
  session_secret="$(openssl rand -base64 32)" \
  csrf_token="$(openssl rand -base64 32)" \
  cookie_secret="$(openssl rand -base64 32)"

# ============================================================================
# CREATE POLICIES
# ============================================================================
echo "Creating Vault policies..."

# Backend service policy
vault policy write backend-policy - <<EOF
path "secret/data/database" {
  capabilities = ["read"]
}
path "secret/data/api" {
  capabilities = ["read"]
}
path "secret/data/app" {
  capabilities = ["read"]
}
path "secret/data/oauth" {
  capabilities = ["read"]
}
path "secret/data/smtp" {
  capabilities = ["read"]
}
EOF

# Frontend service policy (if needed)
vault policy write frontend-policy - <<EOF
path "secret/data/api" {
  capabilities = ["read"]
}
EOF

# ============================================================================
# ENABLE AUDIT LOGGING
# ============================================================================
echo "Enabling audit logging..."
vault audit enable file file_path=/vault/logs/audit.log || echo "Audit already enabled"

# ============================================================================
# VERIFICATION
# ============================================================================
echo "Verifying secrets..."
vault kv get secret/database
vault kv get secret/api

echo "============================================"
echo "Vault initialization complete!"
echo "============================================"
echo "Available secrets:"
echo "  - secret/database (DB credentials)"
echo "  - secret/api (API keys & tokens)"
echo "  - secret/oauth (OAuth credentials)"
echo "  - secret/ssl (SSL/TLS config)"
echo "  - secret/app (Application secrets)"
echo "  - secret/smtp (Email config)"
echo "============================================"