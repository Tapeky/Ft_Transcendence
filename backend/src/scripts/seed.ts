import { DatabaseManager } from '../database/DatabaseManager';
import { UserRepository } from '../repositories/UserRepository';
import path from 'path';

async function seedDatabase() {
  console.log('🌱 Seeding de la base de données...');
  
  try {
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join(process.env.DB_PATH || './db', process.env.DB_NAME || 'ft_transcendence.db');
    
    await dbManager.connect(dbPath);
    const db = dbManager.getDb();
    const userRepo = new UserRepository(db);
    
    // Vérifier si des données existent déjà
    const existingUsers = await userRepo.getLeaderboard(1);
    if (existingUsers.length > 0) {
      console.log('⚠️ La base de données contient déjà des données. Utilise npm run db:reset pour tout effacer.');
      await dbManager.close();
      process.exit(0);
    }
    
    // Créer des utilisateurs de test
    const testUsers = [
      {
        username: 'admin',
        email: 'admin@transcendence.com',
        password: 'admin123',
        display_name: 'Administrateur',
        data_consent: true
      },
      {
        username: 'alice',
        email: 'alice@test.com',
        password: 'alice123',
        display_name: 'Alice Champion',
        data_consent: true
      },
      {
        username: 'bob',
        email: 'bob@test.com',
        password: 'bob123',
        display_name: 'Bob le Builder',
        data_consent: true
      },
      {
        username: 'charlie',
        email: 'charlie@test.com',
        password: 'charlie123',
        display_name: 'Charlie Pro',
        data_consent: true
      },
      {
        username: 'diana',
        email: 'diana@test.com',
        password: 'diana123',
        display_name: 'Diana Winner',
        data_consent: true
      }
    ];
    
    console.log('👥 Création des utilisateurs de test...');
    for (const userData of testUsers) {
      const user = await userRepo.create(userData);
      console.log(`✅ Utilisateur créé: ${user.username} (${user.email})`);
    }
    
    // Simuler quelques stats
    console.log('📊 Ajout de statistiques simulées...');
    await db.run('UPDATE users SET total_wins = 15, total_losses = 5, total_games = 20 WHERE username = ?', ['alice']);
    await db.run('UPDATE users SET total_wins = 12, total_losses = 8, total_games = 20 WHERE username = ?', ['bob']);
    await db.run('UPDATE users SET total_wins = 8, total_losses = 7, total_games = 15 WHERE username = ?', ['charlie']);
    await db.run('UPDATE users SET total_wins = 5, total_losses = 10, total_games = 15 WHERE username = ?', ['diana']);
    
    console.log('✅ Seeding terminé avec succès');
    
    const stats = await dbManager.getStats();
    console.log('📊 Statistiques finales:', stats);
    
    await dbManager.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
}

seedDatabase();