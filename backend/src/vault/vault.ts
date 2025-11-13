import vault from 'node-vault';
import * as fs from 'fs/promises';

// Chemins des fichiers générés par Vault Agent
const VAULT_TOKEN_PATH = '/app/ssl/vault_token'; 
const VAULT_CA_PATH = '/app/ssl/ca.pem';

export class VaultService {
    private static instance: VaultService;
    private client: vault.client;
    private initialized: boolean = false;

    private constructor() {
        this.client = vault({
            apiVersion: 'v1',
            endpoint: process.env.VAULT_ADDR || 'https://vault:8200',
            token: 'temporary_token',
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

        try {
            console.log('⏳ Initialisation Vault...');

            // Attendre que les fichiers soient disponibles
            await this.waitForFiles();

            // Lire le token et le CA
            const token = (await fs.readFile(VAULT_TOKEN_PATH, 'utf8')).trim();
            const ca = await fs.readFile(VAULT_CA_PATH, 'utf8');
            console.log(token);
            // Créer le client Vault authentifié
            this.client = vault({
                apiVersion: 'v1',
                endpoint: process.env.VAULT_ADDR || 'https://vault:8200',
                token: token,
                requestOptions: { ca, rejectUnauthorized: true }
            });

            // Charger tous les secrets dans process.env
            await this.loadSecretsToEnv();

            this.initialized = true;
            console.log('✅ Vault initialisé - secrets chargés dans process.env');

        } catch (err) {
            console.error('❌ Échec initialisation Vault:', err instanceof Error ? err.message : String(err));
            console.log('⚠️  Utilisation des variables d\'environnement par défaut');
            this.initialized = true;
        }
    }

    private async waitForFiles(): Promise<void> {
        const maxAttempts = 30;
        for (let i = 1; i <= maxAttempts; i++) {
            try {
                await fs.access(VAULT_TOKEN_PATH);
                await fs.access(VAULT_CA_PATH);
                return;
            } catch {
                if (i === maxAttempts) throw new Error('Fichiers Vault non disponibles');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    private async loadSecretsToEnv(): Promise<void> {
        const paths = [
            'secret/data/api',
            'secret/data/oauth',
            'secret/data/database',
            'secret/data/app',
            'secret/data/smtp',
        ];

        for (const path of paths) {
            try {
                const response = await this.client.read(path);
                const secrets = response.data.data;

                for (const [key, value] of Object.entries(secrets)) {
                    const envKey = key.toUpperCase();
                    if (!process.env[envKey]) {
                        process.env[envKey] = String(value);
                    }
                }
            } catch (err) {
                console.warn(`⚠️  Impossible de lire ${path}`);
            }
        }
    }

    public getClient(): vault.client {
        return this.client;
    }
}

export default VaultService.getInstance();