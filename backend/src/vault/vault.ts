import vault from 'node-vault';

export class VaultService {
    private static instance: VaultService;
    private client: vault.client;
    private initialized: boolean = false;
    private secrets: Map<string, any> = new Map();
    private vaultEnabled: boolean;

    private constructor() {
        // Configuration flexible avec fallback
        const vaultEndpoint = process.env.VAULT_URL || process.env.VAULT_ENDPOINT || 'http://vault:8200';
        const vaultToken = process.env.VAULT_TOKEN || 'root';
        this.vaultEnabled = process.env.VAULT_ENABLED !== 'false';

        console.log(`🔧 Configuration Vault: endpoint=${vaultEndpoint}, enabled=${this.vaultEnabled}`);

        this.client = vault({
            apiVersion: 'v1',
            endpoint: vaultEndpoint,
            token: vaultToken,
        });
    }

    public static getInstance(): VaultService {
        if (!VaultService.instance) {
            VaultService.instance = new VaultService();
        }
        return VaultService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;

        if (!this.vaultEnabled) {
            console.log('⚠️  Vault désactivé - utilisation des variables d\'environnement');
            this.initializeFromEnv();
            return;
        }

        try {
            // Test de connexion avant de charger les secrets
            await this.client.health();
            console.log('✅ Connexion Vault établie');

            // Load all necessary secrets
            const [config, oauth, ssl] = await Promise.all([
                this.client.read('secret/data/ft_transcendence/config').catch(() => null),
                this.client.read('secret/data/ft_transcendence/oauth').catch(() => null),
                this.client.read('secret/data/ft_transcendence/ssl').catch(() => null)
            ]);

            if (config?.data?.data) {
                // Encrypt sensitive values in memory
                await this.encryptAndStore('jwt_secret', config.data.data.JWT_SECRET);
                
                // Set environment variables
                Object.entries(config.data.data).forEach(([key, value]) => {
                    if (key !== 'JWT_SECRET') {
                        process.env[key] = String(value);
                    }
                });
            }

            if (oauth?.data?.data) {
                await this.encryptAndStore('oauth_secrets', JSON.stringify(oauth.data.data));
            }

            // Handle SSL certificates if HTTPS is enabled
            if (config?.data?.data?.ENABLE_HTTPS === 'true' && ssl?.data?.data) {
                await this.setupSSLCertificates(ssl.data.data);
            }

            this.initialized = true;
            console.log('✅ Secrets chargés depuis Vault');
        } catch (error) {
            console.error('❌ Impossible de charger les secrets depuis Vault:', error);
            console.log('🔄 Fallback vers les variables d\'environnement');
            this.initializeFromEnv();
        }
    }

    private initializeFromEnv(): void {
        // Fallback sur les variables d'environnement
        const requiredEnvVars = [
            'JWT_SECRET',
            'OAUTH_CLIENT_ID',
            'OAUTH_CLIENT_SECRET',
            'DATABASE_URL'
        ];

        const missing = requiredEnvVars.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            console.warn(`⚠️  Variables d'environnement manquantes: ${missing.join(', ')}`);
            // Utiliser des valeurs par défaut pour le développement
            this.setDefaultValues();
        }

        this.initialized = true;
        console.log('✅ Configuration chargée depuis les variables d\'environnement');
    }

    private setDefaultValues(): void {
        const defaults = {
            JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
            OAUTH_CLIENT_ID: process.env.OAUTH_CLIENT_ID || 'dev-client-id',
            OAUTH_CLIENT_SECRET: process.env.OAUTH_CLIENT_SECRET || 'dev-client-secret',
            DATABASE_URL: process.env.DATABASE_URL || 'sqlite://db/ft_transcendence.db'
        };

        Object.entries(defaults).forEach(([key, value]) => {
            if (!process.env[key]) {
                process.env[key] = value;
                console.log(`🔧 Utilisation de la valeur par défaut pour ${key}`);
            }
        });
    }

    private async setupSSLCertificates(sslData: any): Promise<void> {
        try {
            const fs = require('fs').promises;
            const path = require('path');
            
            const sslDir = '/app/ssl';
            await fs.mkdir(sslDir, { recursive: true });
            
            await fs.writeFile(path.join(sslDir, 'cert.pem'), sslData.cert);
            await fs.writeFile(path.join(sslDir, 'key.pem'), sslData.key);
            await fs.chmod(path.join(sslDir, 'key.pem'), 0o600);
            
            console.log('✅ Certificats SSL configurés');
        } catch (error) {
            console.error('❌ Erreur lors de la configuration SSL:', error);
        }
    }

    private async encryptAndStore(key: string, value: string): Promise<void> {
        try {
            const encrypted = await this.client.write('transit/encrypt/ft_transcendence', {
                plaintext: Buffer.from(value).toString('base64')
            });
            this.secrets.set(key, encrypted.data.ciphertext);
        } catch (error) {
            console.warn(`⚠️  Impossible de chiffrer ${key}, stockage en clair`);
            this.secrets.set(key, value);
        }
    }

    private async decrypt(ciphertext: string): Promise<string> {
        try {
            const decrypted = await this.client.write('transit/decrypt/ft_transcendence', {
                ciphertext
            });
            return Buffer.from(decrypted.data.plaintext, 'base64').toString();
        } catch (error) {
            // Si le déchiffrement échoue, retourner la valeur en clair (fallback)
            return ciphertext;
        }
    }

    public async getJwtSecret(): Promise<string> {
        const stored = this.secrets.get('jwt_secret');
        if (stored) {
            return this.decrypt(stored);
        }
        
        // Fallback sur la variable d'environnement
        return process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    }

    public async getOAuthSecrets(): Promise<any> {
        const stored = this.secrets.get('oauth_secrets');
        if (stored) {
            const decrypted = await this.decrypt(stored);
            try {
                return JSON.parse(decrypted);
            } catch {
                // Si ce n'est pas du JSON, traiter comme une chaîne
                return decrypted;
            }
        }
        
        // Fallback sur les variables d'environnement
        return {
            client_id: process.env.OAUTH_CLIENT_ID || 'dev-client-id',
            client_secret: process.env.OAUTH_CLIENT_SECRET || 'dev-client-secret',
            redirect_uri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback'
        };
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    public isVaultEnabled(): boolean {
        return this.vaultEnabled;
    }
}