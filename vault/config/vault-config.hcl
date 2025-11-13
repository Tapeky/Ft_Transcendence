storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 0 # Activer TLS (HTTPS)
  
  tls_cert_file = "/vault/config/certs/vault.crt"
  tls_key_file  = "/vault/config/certs/vault.key"
}

api_addr = "https://vault:8200"
ui = true

disable_mlock = true
log_level = "INFO"