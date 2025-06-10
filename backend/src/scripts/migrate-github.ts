import { DatabaseManager } from '../database/DatabaseManager';
import path from 'path';

async function migrateGitHub() {
  console.log('🔄 Migration GitHub: Ajout de la colonne github_id...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    
    await dbManager.connect(dbPath);
    const db = dbManager.getDb();
    
    // Vérifier si la colonne existe déjà
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const hasGitHubId = tableInfo.some((column: any) => column.name === 'github_id');
    
    if (!hasGitHubId) {
      console.log('➕ Ajout de la colonne github_id...');
      await db.exec('ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE;');
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);');
      console.log('✅ Colonne github_id ajoutée avec succès');
    } else {
      console.log('ℹ️ La colonne github_id existe déjà');
    }
    
    // Afficher les stats
    const stats = await dbManager.getStats();
    console.log('📊 Statistiques de la base de données:', stats);
    
    await dbManager.close();
    console.log('✅ Migration terminée avec succès');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrateGitHub();
