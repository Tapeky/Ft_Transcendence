# Configuration du Sidecar Vault Agent pour le frontend
exit_after_auth = false
pid_file = "/var/run/agent-frontend.pid"

vault {
    address = "https://vault:8200"
    ca_path = "/secrets/ca.pem"
}

# --- 1. Auto-Authentification AppRole ---
auto_auth {
    method "approle" {
        mount_path = "auth/approle"
        config = {
            role_id_file_path = "/secrets/frontend_role_id"
            secret_id_file_path = "/secrets/frontend_secret_id"
            remove_secret_id_file_after_reading = false
        }
    }
    sink "file" {
        config = {
            path = "/var/run/vault-agent-token"
            mode = 0600
        }
    }
}

# --- 2. Génère cert.pem (certificat seul) ---
template {
    contents = <<EOT
{{ with secret "pki_frontend/issue/frontend-public-role" "common_name=frontend" "ttl=720h" }}{{ .Data.certificate }}{{ end }}
EOT
    destination = "/app/ssl/cert.pem"
    perms = "0644"
}

# --- 3. Génère key.pem (même appel, extraction de la clé) ---
template {
    contents = <<EOT
{{ with secret "pki_frontend/issue/frontend-public-role" "common_name=frontend" "ttl=720h" }}{{ .Data.private_key }}{{ end }}
EOT
    destination = "/app/ssl/key.pem"
    perms = "0600"
}

# --- 4. Génère fullchain.pem (certificat + CA) ---
template {
    contents = <<EOT
{{ with secret "pki_frontend/issue/frontend-public-role" "common_name=frontend" "ttl=720h" }}{{ .Data.certificate }}
{{ .Data.issuing_ca }}{{ end }}
EOT
    destination = "/app/ssl/fullchain.pem"
    perms = "0644"
}