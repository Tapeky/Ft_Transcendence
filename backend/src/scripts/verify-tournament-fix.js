/**
 * Verification script for tournament system fix
 * Tests that the foreign key constraint issue is resolved
 */

const { Database } = require('sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../../db/ft_transcendence.db');

console.log('Database path:', DB_PATH);

const db = new Database(DB_PATH, err => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Test sequence
async function runTests() {
  try {
    // Check tournaments table
    const tournamentsSchema = await new Promise((resolve, reject) => {
      db.get('PRAGMA table_info(tournaments)', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get column info for tournaments
    const tournamentsColumns = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(tournaments)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('🏆 tournaments table columns:');
    tournamentsColumns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type} (PK: ${col.pk ? 'yes' : 'no'})`);
    });

    // Check tournament_players table
    const playersColumns = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(tournament_players)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('\n👥 tournament_players table columns:');
    playersColumns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });

    // Check tournament_matches table
    const matchesColumns = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(tournament_matches)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('\n🥊 tournament_matches table columns:');
    matchesColumns.forEach(col => {
      console.log(`  - ${col.name}: ${col.type}`);
    });

    // Check foreign key constraints
    const tournamentsFK = await new Promise((resolve, reject) => {
      db.all('PRAGMA foreign_key_list(tournaments)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const playersFK = await new Promise((resolve, reject) => {
      db.all('PRAGMA foreign_key_list(tournament_players)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const matchesFK = await new Promise((resolve, reject) => {
      db.all('PRAGMA foreign_key_list(tournament_matches)', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('\n🔗 Foreign Key Constraints:');
    console.log('tournament_players FK constraints:', playersFK.length);
    playersFK.forEach(fk => {
      console.log(`  ${fk.from} -> ${fk.table}.${fk.to} (${fk.on_delete})`);
    });

    console.log('tournament_matches FK constraints:', matchesFK.length);
    matchesFK.forEach(fk => {
      console.log(`  ${fk.from} -> ${fk.table}.${fk.to} (${fk.on_delete})`);
    });

    // Test data type compatibility

    // Find tournaments table ID column type
    const tournamentsIdCol = tournamentsColumns.find(col => col.name === 'id');
    const playersIdCol = playersColumns.find(col => col.name === 'tournament_id');
    const matchesIdCol = matchesColumns.find(col => col.name === 'tournament_id');

    console.log(`tournaments.id type: ${tournamentsIdCol.type}`);
    console.log(`tournament_players.tournament_id type: ${playersIdCol.type}`);
    console.log(`tournament_matches.tournament_id type: ${matchesIdCol.type}`);

    // Check compatibility
    const isCompatible =
      (tournamentsIdCol.type.includes('INTEGER') && playersIdCol.type.includes('VARCHAR')) ||
      (tournamentsIdCol.type.includes('INTEGER') && matchesIdCol.type.includes('VARCHAR'));

    if (isCompatible) {
      console.log('⚠️  DATA TYPE MISMATCH DETECTED:');
      console.log('   tournaments.id is INTEGER but foreign keys are VARCHAR(36)');
      console.log('   This will cause foreign key constraint violations!');

      // Suggest the database schema needs updating
      console.log('\n🔧 SOLUTION REQUIRED:');
      console.log('   The database schema needs to be updated to use consistent data types.');
      console.log(
        '   Either change tournament_players.tournament_id and tournament_matches.tournament_id to INTEGER,'
      );
      console.log(
        '   or change tournaments.id to VARCHAR(36) and update the backend code accordingly.'
      );
    } else {
      console.log('✅ Data types are compatible');
    }

    console.log('\n🏁 Test completed');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

runTests();
