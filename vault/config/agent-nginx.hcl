# Configuration du Sidecar Vault Agent pour Nginx
exit_after_auth = false
pid_file = "/var/run/agent-nginx.pid"

vault {
    address = "https://vault:8200"
    ca_path = "/secrets/ca.pem"
}

# --- 1. Auto-Authentification AppRole ---
auto_auth {
    method "approle" {
        mount_path = "auth/approle"
        config = {
            role_id_file_path = "/secrets/nginx_role_id"
            secret_id_file_path = "/secrets/nginx_secret_id"
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

# --- 2. Templating PKI (Certificat Public pour ModSecurity) ---
template {
    contents = <<EOT
{{ with secret "pki_nginx/issue/modsecurity-public-role" "common_name=localhost" "alt_names=nginx,backend,frontend" "ttl=720h" }}
{{ .Data.certificate }}
{{ .Data.issuing_ca }}
{{ .Data.private_key }}
{{ end }}
EOT
    destination = "/etc/nginx/ssl/server.pem"
    perms = "0644"
}

# --- 3. Templating du CA Bundle ---
template {
    contents = <<EOT
{{ with secret "pki/cert/ca" }}
{{ .Data.certificate }}
{{ end }}
EOT
    destination = "/etc/nginx/ssl/ca.crt"
    perms = "0644"
}