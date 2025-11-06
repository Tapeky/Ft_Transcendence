import { DatabaseManager } from './DatabaseManager';

interface ColumnInfo {
  name: string;
  type: string;
}

export async function ensureSchema() {
  const db = DatabaseManager.getInstance();

  try {
    // Check tournaments table for created_by column
    const tournamentsTableInfo = await db.query(`PRAGMA table_info(tournaments)`);
    const hasCreatedBy = (tournamentsTableInfo as ColumnInfo[]).some(col => col.name === 'created_by');

    if (!hasCreatedBy) {
      console.log('Adding missing created_by column to tournaments...');
      await db.execute(`
        ALTER TABLE tournaments
        ADD COLUMN created_by INTEGER NOT NULL DEFAULT 1
      `);
      console.log('Database schema updated: added created_by');
    }

    // Check matches table for tournament_id column
    const matchesTableInfo = await db.query(`PRAGMA table_info(matches)`);
    const hasTournamentId = (matchesTableInfo as ColumnInfo[]).some(col => col.name === 'tournament_id');

    if (!hasTournamentId) {
      console.log('Adding missing tournament_id column to matches...');
      await db.execute(`
        ALTER TABLE matches ADD COLUMN tournament_id VARCHAR(36) REFERENCES tournaments(id) ON DELETE CASCADE
      `);
      console.log('Database schema updated: added tournament_id');
    }

    // Check if tournament related tables exist
    const tables = await db.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('tournament_participants', 'tournament_players', 'tournament_matches', 'tournament_state_log', 'tournament_events')
    `);

    const existingTables = (tables as { name: string }[]).map(t => t.name);

    // Create tournament tables if they don't exist
    if (!existingTables.includes('tournament_participants')) {
      await db.execute(`
        CREATE TABLE tournament_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id VARCHAR(36) NOT NULL,
          alias VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
          UNIQUE(tournament_id, alias)
        )
      `);
      console.log('Database schema updated: created tournament_participants');
    }

    if (!existingTables.includes('tournament_players')) {
      await db.execute(`
        CREATE TABLE tournament_players (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id VARCHAR(36) NOT NULL,
          alias VARCHAR(255) NOT NULL,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
        )
      `);
      console.log('Database schema updated: created tournament_players');
    }

    if (!existingTables.includes('tournament_matches')) {
      await db.execute(`
        CREATE TABLE tournament_matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id VARCHAR(36) NOT NULL,
          round INTEGER NOT NULL,
          match_number INTEGER NOT NULL,
          player1_alias VARCHAR(255),
          player2_alias VARCHAR(255),
          player1_score INTEGER DEFAULT 0,
          player2_score INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
        )
      `);
      console.log('Database schema updated: created tournament_matches');
    }

    if (!existingTables.includes('tournament_state_log')) {
      await db.execute(`
        CREATE TABLE tournament_state_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id VARCHAR(36) NOT NULL,
          state VARCHAR(1000) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
        )
      `);
      console.log('Database schema updated: created tournament_state_log');
    }

    if (!existingTables.includes('tournament_events')) {
      await db.execute(`
        CREATE TABLE tournament_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id VARCHAR(36) NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          event_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
        )
      `);
      console.log('Database schema updated: created tournament_events');
    }

  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate column name')) {
      // Column already exists, ignore
    } else {
      console.error('Schema check failed:', error);
    }
  }
}