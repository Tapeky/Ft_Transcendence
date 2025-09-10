-- Final Tournament Schema Fix
-- This fixes the data type mismatch causing 500 errors by converting foreign key columns to INTEGER

PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

-- Step 1: Create new tournament_players table with INTEGER tournament_id
CREATE TABLE tournament_players_new (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id INTEGER NOT NULL,  -- ✅ Changed from VARCHAR(36) to INTEGER
    alias VARCHAR(50) NOT NULL,
    position INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, alias)
);

-- Step 2: Create new tournament_matches table with INTEGER tournament_id  
CREATE TABLE tournament_matches_new (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id INTEGER NOT NULL,  -- ✅ Changed from VARCHAR(36) to INTEGER
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
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Step 3: Copy compatible data (convert VARCHAR tournament_id to INTEGER where possible)
-- Only copy data where tournament_id can be converted to integer
INSERT INTO tournament_players_new (id, tournament_id, alias, position, joined_at)
SELECT id, CAST(tournament_id AS INTEGER), alias, position, joined_at 
FROM tournament_players 
WHERE tournament_id GLOB '[0-9]*' AND LENGTH(tournament_id) <= 10;

INSERT INTO tournament_matches_new (id, tournament_id, round, match_number, player1_alias, player2_alias, player1_score, player2_score, winner_alias, status, started_at, completed_at, created_at)
SELECT id, CAST(tournament_id AS INTEGER), round, match_number, player1_alias, player2_alias, player1_score, player2_score, winner_alias, status, started_at, completed_at, created_at
FROM tournament_matches 
WHERE tournament_id GLOB '[0-9]*' AND LENGTH(tournament_id) <= 10;

-- Step 4: Drop old tables
DROP TABLE tournament_players;
DROP TABLE tournament_matches;

-- Step 5: Rename new tables
ALTER TABLE tournament_players_new RENAME TO tournament_players;
ALTER TABLE tournament_matches_new RENAME TO tournament_matches;

-- Step 6: Recreate indexes
CREATE INDEX idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);

COMMIT;

PRAGMA foreign_keys = ON;

-- Verification
.print "✅ Tournament schema fix completed!"
.print "📊 Verifying new schema..."

.print "tournaments table:"
SELECT name, type FROM pragma_table_info('tournaments') WHERE name = 'id';

.print "tournament_players table:"  
SELECT name, type FROM pragma_table_info('tournament_players') WHERE name = 'tournament_id';

.print "tournament_matches table:"
SELECT name, type FROM pragma_table_info('tournament_matches') WHERE name = 'tournament_id';

.print "🔗 Foreign key constraints:"
SELECT * FROM pragma_foreign_key_list('tournament_players');
SELECT * FROM pragma_foreign_key_list('tournament_matches');