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
      
      // Étape 1: Ajouter la colonne sans contrainte UNIQUE (SQLite limitation)
      await db.exec('ALTER TABLE users ADD COLUMN github_id VARCHAR(255);');
      console.log('✅ Colonne github_id ajoutée');
      
      // Étape 2: Créer un index unique (équivalent à UNIQUE constraint)
      await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id_unique ON users(github_id) WHERE github_id IS NOT NULL;');
      console.log('✅ Index unique créé pour github_id');
      
      // Étape 3: Créer un index normal pour les performances
      await db.exec('CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);');
      console.log('✅ Index de performance créé pour github_id');
      
    } else {
      console.log('ℹ️ La colonne github_id existe déjà');
      
      // Vérifier si l'index unique existe
      const indexes = await db.all("PRAGMA index_list(users)");
      const hasUniqueIndex = indexes.some((index: any) => index.name === 'idx_users_github_id_unique');
      
      if (!hasUniqueIndex) {
        console.log('➕ Ajout de l\'index unique manquant...');
        await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id_unique ON users(github_id) WHERE github_id IS NOT NULL;');
        console.log('✅ Index unique ajouté');
      }
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