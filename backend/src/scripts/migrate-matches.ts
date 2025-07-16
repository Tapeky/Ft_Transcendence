import { DatabaseManager } from '../database/DatabaseManager';
import path from 'path';

async function migrateMatches() {
  try {
    const dbManager = DatabaseManager.getInstance();
    const dbPath = path.join('/app/db', 'ft_transcendence.db');
    
    await dbManager.connect(dbPath);
    const db = dbManager.getDb();
    
    console.log('🔄 Migration des matches...');
    
    // Ajouter les colonnes manquantes
    try {
      await db.exec('ALTER TABLE matches ADD COLUMN player1_guest_name VARCHAR(100);');
      console.log('✅ Colonne player1_guest_name ajoutée');
    } catch (error) {
      console.log('ℹ️  Colonne player1_guest_name existe déjà');
    }
    
    try {
      await db.exec('ALTER TABLE matches ADD COLUMN player2_guest_name VARCHAR(100);');
      console.log('✅ Colonne player2_guest_name ajoutée');
    } catch (error) {
      console.log('ℹ️  Colonne player2_guest_name existe déjà');
    }
    
    // Ajouter les colonnes de statistiques manquantes
    const statsColumns = [
      'player1_touched_ball INTEGER DEFAULT 0',
      'player1_missed_ball INTEGER DEFAULT 0',
      'player1_touched_ball_in_row INTEGER DEFAULT 0',
      'player1_missed_ball_in_row INTEGER DEFAULT 0',
      'player2_touched_ball INTEGER DEFAULT 0',
      'player2_missed_ball INTEGER DEFAULT 0',
      'player2_touched_ball_in_row INTEGER DEFAULT 0',
      'player2_missed_ball_in_row INTEGER DEFAULT 0'
    ];
    
    for (const column of statsColumns) {
      try {
        await db.exec(`ALTER TABLE matches ADD COLUMN ${column};`);
        console.log(`✅ Colonne ${column.split(' ')[0]} ajoutée`);
      } catch (error) {
        console.log(`ℹ️  Colonne ${column.split(' ')[0]} existe déjà`);
      }
    }
    
    // Modifier les contraintes pour permettre les joueurs invités
    try {
      await db.exec(`
        CREATE TABLE matches_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER,
          player1_id INTEGER,
          player2_id INTEGER,
          player1_guest_name VARCHAR(100),
          player2_guest_name VARCHAR(100),
          player1_score INTEGER DEFAULT 0,
          player2_score INTEGER DEFAULT 0,
          winner_id INTEGER,
          status VARCHAR(20) DEFAULT 'scheduled',
          game_type VARCHAR(50) DEFAULT 'pong',
          match_data TEXT,
          started_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          duration_seconds INTEGER,
          max_score INTEGER DEFAULT 3,
          player1_touched_ball INTEGER DEFAULT 0,
          player1_missed_ball INTEGER DEFAULT 0,
          player1_touched_ball_in_row INTEGER DEFAULT 0,
          player1_missed_ball_in_row INTEGER DEFAULT 0,
          player2_touched_ball INTEGER DEFAULT 0,
          player2_missed_ball INTEGER DEFAULT 0,
          player2_touched_ball_in_row INTEGER DEFAULT 0,
          player2_missed_ball_in_row INTEGER DEFAULT 0,
          
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
          FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL,
          
          CHECK (
            (player1_id IS NOT NULL OR player1_guest_name IS NOT NULL) AND
            (player2_id IS NOT NULL OR player2_guest_name IS NOT NULL)
          )
        );
      `);
      
      // Copier les données existantes
      await db.exec(`
        INSERT INTO matches_new (
          id, tournament_id, player1_id, player2_id, player1_score, player2_score, 
          winner_id, status, game_type, match_data, started_at, completed_at, 
          created_at, duration_seconds, max_score
        )
        SELECT 
          id, tournament_id, player1_id, player2_id, player1_score, player2_score,
          winner_id, status, game_type, match_data, started_at, completed_at,
          created_at, duration_seconds, max_score
        FROM matches;
      `);
      
      // Supprimer l'ancienne table et renommer la nouvelle
      await db.exec('DROP TABLE matches;');
      await db.exec('ALTER TABLE matches_new RENAME TO matches;');
      
      // Recréer les index
      await db.exec('CREATE INDEX idx_matches_tournament ON matches(tournament_id);');
      await db.exec('CREATE INDEX idx_matches_players ON matches(player1_id, player2_id);');
      await db.exec('CREATE INDEX idx_matches_status ON matches(status);');
      
      console.log('✅ Structure de la table matches mise à jour');
    } catch (error) {
      console.log('ℹ️  Structure de la table matches déjà à jour');
    }
    
    console.log('✅ Migration terminée');
    
    await dbManager.close();
  } catch (error) {
    console.error('❌ Erreur de migration:', error);
    process.exit(1);
  }
}

migrateMatches();