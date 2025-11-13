#!/bin/bash
#!/bin/bash
set -e

echo "=========================================="
echo "DÉMARRAGE DU SERVEUR VAULT"
echo "=========================================="

CA_SOURCE="/vault/config/certs/ca.pem"
CA_DEST="/vault_credentials/ca.pem"
VAULT_CERTS_DIR="/vault/config/certs"

# ============================================================================
# 1. VÉRIFICATION DES CERTIFICATS DANS L'IMAGE
# ============================================================================

echo "[1/4] Vérification des certificats..."

# Lister le contenu pour debug
echo "Contenu de /vault/config/certs:"
ls -lah "$VAULT_CERTS_DIR/" || {
    echo "ERREUR: Le répertoire $VAULT_CERTS_DIR n'existe pas!"
    exit 1
}

# Vérifier vault.crt
if [ ! -f "$VAULT_CERTS_DIR/vault.crt" ]; then
    echo "ERREUR: Certificat manquant: $VAULT_CERTS_DIR/vault.crt"
    exit 1
fi

if [ ! -s "$VAULT_CERTS_DIR/vault.crt" ]; then
    echo "ERREUR: Certificat vide: $VAULT_CERTS_DIR/vault.crt"
    exit 1
fi

# Vérifier vault.key
if [ ! -f "$VAULT_CERTS_DIR/vault.key" ]; then
    echo "ERREUR: Clé privée manquante: $VAULT_CERTS_DIR/vault.key"
    exit 1
fi

if [ ! -s "$VAULT_CERTS_DIR/vault.key" ]; then
    echo "ERREUR: Clé privée vide: $VAULT_CERTS_DIR/vault.key"
    exit 1
fi

# Vérifier ca.pem
if [ ! -f "$CA_SOURCE" ]; then
    echo "ERREUR: CA manquant: $CA_SOURCE"
    exit 1
fi

if [ ! -s "$CA_SOURCE" ]; then
    echo "ERREUR: CA vide: $CA_SOURCE"
    exit 1
fi

echo "✓ Tous les certificats sont présents et valides"

# ============================================================================
# 2. AFFICHAGE DES INFORMATIONS DU CERTIFICAT
# ============================================================================

echo "[2/4] Informations du certificat Vault:"
openssl x509 -in "$VAULT_CERTS_DIR/vault.crt" -noout -subject -issuer -dates -ext subjectAltName 2>/dev/null || {
    echo "Avertissement: Impossible d'afficher les détails du certificat"
}

# ============================================================================
# 3. COPIE DU CA DANS LE VOLUME PARTAGÉ POUR LES AGENTS
# ============================================================================

echo "[3/4] Préparation du CA pour les agents..."

# Créer le répertoire si nécessaire
mkdir -p /vault_credentials

# Copier le CA
if [ ! -f "$CA_DEST" ]; then
    echo "Copie du CA: $CA_SOURCE → $CA_DEST"
    cp "$CA_SOURCE" "$CA_DEST"
    chmod 644 "$CA_DEST"
    echo "✓ CA copié avec succès"
else
    echo "✓ CA déjà présent dans le volume partagé"
    # Vérifier qu'il n'est pas vide
    if [ ! -s "$CA_DEST" ]; then
        echo "Avertissement: CA vide détecté, re-copie..."
        cp "$CA_SOURCE" "$CA_DEST"
        chmod 644 "$CA_DEST"
    fi
fi

# ============================================================================
# 4. VÉRIFICATION DE LA CONFIGURATION HCL
# ============================================================================

echo "[4/4] Vérification de la configuration..."

if [ ! -f /vault/config/vault-config.hcl ]; then
    echo "ERREUR: Fichier de configuration manquant: /vault/config/vault-config.hcl"
    exit 1
fi

echo "✓ Configuration HCL présente"

# ============================================================================
# 5. DÉMARRAGE DU SERVEUR VAULT
# ============================================================================

echo "=========================================="
echo "DÉMARRAGE DU SERVEUR"
echo "=========================================="
echo "VAULT_ADDR: $VAULT_ADDR"
echo "Configuration: /vault/config/vault-config.hcl"
echo "Certificat: $VAULT_CERTS_DIR/vault.crt"
echo "Clé privée: $VAULT_CERTS_DIR/vault.key"
echo "=========================================="

# Lancer Vault avec exec pour qu'il devienne PID 1
exec vault server -config=/vault/config/vault-config.hcl