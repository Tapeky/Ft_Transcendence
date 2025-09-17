#!/bin/bash

set -e

sleep 10
# Use the Docker service name
VAULT_ADDR="http://vault:8200"
export VAULT_ADDR
export VAULT_TOKEN="root"

# Install jq and curl if not present
if ! command -v jq &> /dev/null; then
    echo "📦 Installing jq and curl..."
    apk add --no-cache jq curl
fi

echo "⏳ Waiting for Vault dev server to start..."

# Wait for Vault to be ready (dev mode starts much faster)
until vault status >/dev/null 2>&1; do
    echo "⏳ Vault not ready yet, waiting..."
    sleep 2
done

echo "✅ Connected to Vault successfully"

# Enable secret engines (check if already enabled)
echo "🏪 Setting up secret engines..."

if ! vault secrets list | grep -q "^secret/"; then
    echo "📦 Enabling KV secret engine..."
    vault secrets enable -path=secret kv-v2
else
    echo "✅ KV secret engine already enabled"
fi

if ! vault secrets list | grep -q "^transit/"; then
    echo "🔐 Enabling transit secret engine..."
    vault secrets enable -path=transit transit
else
    echo "✅ Transit secret engine already enabled"
fi

# Create encryption key for sensitive data (check if exists)
echo "🗝️  Setting up encryption key..."
if ! vault list transit/keys 2>/dev/null | grep -q "ft_transcendence"; then
    echo "🔑 Creating encryption key..."
    vault write -f transit/keys/ft_transcendence
else
    echo "✅ Encryption key already exists"
fi

# Create policies (always update)
echo "📜 Creating/updating policies..."
vault policy write backend-policy - <<EOF
path "secret/data/ft_transcendence/*" {
    capabilities = ["read"]
}
path "transit/encrypt/ft_transcendence" {
    capabilities = ["create", "update"]
}
path "transit/decrypt/ft_transcendence" {
    capabilities = ["create", "update"]
}
EOF

echo "✅ Policy created/updated"

# Store application secrets (check if they exist first)
echo "🔒 Setting up application secrets..."

# Check if config secrets already exist
if vault kv get secret/ft_transcendence/config >/dev/null 2>&1; then
    echo "✅ Application config secrets already exist"
else
    echo "🔍 Creating application config secrets..."
    vault kv put secret/ft_transcendence/config \
        NODE_ENV="development" \
        DB_NAME="ft_transcendence.db" \
        DB_PATH="/app/db" \
        BACKEND_PORT="8000" \
        JWT_SECRET="$(openssl rand -base64 32)" \
        JWT_EXPIRES_IN="24h" \
        BCRYPT_ROUNDS="12" \
        FRONTEND_PORT="3000" \
        VITE_API_URL="http://localhost:8000" \
        ENABLE_HTTPS="true"
    echo "✅ Application config secrets created"
fi

# Store OAuth secrets
if vault kv get secret/ft_transcendence/oauth >/dev/null 2>&1; then
    echo "✅ OAuth secrets already exist"
else
    echo "🔍 Creating OAuth secrets..."
    vault kv put secret/ft_transcendence/oauth \
        GOOGLE_CLIENT_ID="your_google_client_id_here" \
        GOOGLE_CLIENT_SECRET="your_google_client_secret_here" \
        GOOGLE_REDIRECT_URI="http://localhost:8000/api/auth/google/callback" \
        GITHUB_CLIENT_ID="your_github_client_id_here" \
        GITHUB_CLIENT_SECRET="your_github_client_secret_here" \
        GITHUB_REDIRECT_URI="http://localhost:8000/api/auth/github/callback"
    echo "✅ OAuth secrets created"
fi

echo "🎉 Vault initialization complete!"
echo "🔍 Available secrets:"
vault kv list secret/ft_transcendence/ 2>/dev/null || echo "   (Use 'vault kv list secret/ft_transcendence/' to see secrets)"