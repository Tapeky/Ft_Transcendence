import { DatabaseManager } from '../database/DatabaseManager';
import path from 'path';

async function initDatabase() {
  console.log('🚀 Initialisation de la base de données...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    
    await dbManager.connect(dbPath);
    await dbManager.initialize();
    
    console.log('✅ Base de données initialisée avec succès');
    
    const stats = await dbManager.getStats();
    console.log('📊 Statistiques:', stats);
    
    await dbManager.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

initDatabase();