#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'db', 'ft_transcendence.db');
const db = new Database(dbPath);

try {
  // Start transaction
  db.exec('BEGIN TRANSACTION');

  // Delete in order due to foreign key constraints
  // 1. First delete matches
  const matchesResult = db.exec('DELETE FROM tournament_matches');
  console.log('✅ Cleared tournament matches');

  // 2. Then delete players
  const playersResult = db.exec('DELETE FROM tournament_players');
  console.log('✅ Cleared tournament players');

  // 3. Finally delete tournaments
  const tournamentsResult = db.exec('DELETE FROM tournaments');
  console.log('✅ Cleared tournaments');

  // Reset auto-increment counters if using INTEGER PRIMARY KEY
  db.exec(
    'DELETE FROM sqlite_sequence WHERE name IN ("tournaments", "tournament_players", "tournament_matches")'
  );
  console.log('✅ Reset ID counters');

  // Commit transaction
  db.exec('COMMIT');

  console.log('🎉 All tournament data cleared successfully!');
} catch (error) {
  // Rollback on error
  console.error('❌ Error clearing tournament data:', error.message);
  try {
    db.exec('ROLLBACK');
    console.log('🔄 Transaction rolled back');
  } catch (rollbackError) {
    console.error('❌ Rollback failed:', rollbackError.message);
  }
  process.exit(1);
} finally {
  // Close database connection
  db.close();
}
