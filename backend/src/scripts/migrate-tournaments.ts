import { Database } from 'sqlite3';
import * as path from 'path';

// Get database path
const DB_PATH = path.join(process.cwd(), '../db/ft_transcendence.db');

console.log('🔄 Starting tournament schema migration...');
console.log('Database path:', DB_PATH);

const db = new Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Migration script
const migrationSql = `
-- Create new tournaments table with correct schema
CREATE TABLE IF NOT EXISTS tournaments_local_new (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_players INTEGER NOT NULL CHECK (max_players IN (4, 8, 16)),
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'registration' CHECK (status IN ('registration', 'ready', 'in_progress', 'completed', 'cancelled')),
    winner_alias VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME
);

-- Create tournament_players table
CREATE TABLE IF NOT EXISTS tournament_players_local_new (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id VARCHAR(36) NOT NULL,
    alias VARCHAR(50) NOT NULL,
    position INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments_local_new(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, alias)
);

-- Create tournament_matches table
CREATE TABLE IF NOT EXISTS tournament_matches_local_new (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id VARCHAR(36) NOT NULL,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    player1_alias VARCHAR(50) NOT NULL,
    player2_alias VARCHAR(50) NOT NULL,
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_alias VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments_local_new(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_local_new_status ON tournaments_local_new(status);
CREATE INDEX IF NOT EXISTS idx_tournament_players_local_new_tournament ON tournament_players_local_new(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_local_new_tournament ON tournament_matches_local_new(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_local_new_status ON tournament_matches_local_new(status);
`;

// Execute migration
db.exec(migrationSql, (err) => {
  if (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
  
  console.log('✅ Tournament schema migration completed successfully');
  console.log('✅ Created tables: tournaments_local_new, tournament_players_local_new, tournament_matches_local_new');
  
  db.close((closeErr) => {
    if (closeErr) {
      console.error('❌ Error closing database:', closeErr);
    }
    console.log('✅ Database connection closed');
    process.exit(0);
  });
});