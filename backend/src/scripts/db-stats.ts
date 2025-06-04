import { DatabaseManager } from '../database/DatabaseManager';
import path from 'path';

async function showStats() {
  try {
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    
    await dbManager.connect(dbPath);
    
    const stats = await dbManager.getStats();
    
    console.log('\n📊 Statistiques de la base de données:');
    console.log('=====================================');
    console.log(`👥 Utilisateurs: ${stats.users}`);
    console.log(`🏆 Tournois: ${stats.tournaments}`);
    console.log(`⚔️ Matches: ${stats.matches}`);
    console.log(`🔑 Tokens actifs: ${stats.active_tokens}`);
    console.log(`⏰ Dernière mise à jour: ${stats.timestamp}`);
    console.log('=====================================\n');
    
    await dbManager.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

showStats();