BEGIN TRANSACTION;

CREATE TABLE tournaments_backup AS SELECT * FROM tournaments;
CREATE TABLE tournament_players_backup AS SELECT * FROM tournament_players WHERE 1=0;
CREATE TABLE tournament_matches_backup AS SELECT * FROM tournament_matches WHERE 1=0;

DROP TABLE IF EXISTS tournament_matches;
DROP TABLE IF EXISTS tournament_players;
DROP TABLE IF EXISTS tournaments;

CREATE TABLE tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    max_players INTEGER NOT NULL CHECK (max_players IN (4, 8, 16)),
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'running', 'completed', 'cancelled')),
    winner_alias VARCHAR(50),
    created_by INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE tournament_players (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id INTEGER NOT NULL,
    alias VARCHAR(50) NOT NULL,
    position INTEGER,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, alias)
);

CREATE TABLE tournament_matches (
    id VARCHAR(36) PRIMARY KEY,
    tournament_id INTEGER NOT NULL,
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

CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournament_players_tournament ON tournament_players(tournament_id);
CREATE INDEX idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX idx_tournament_matches_status ON tournament_matches(status);

INSERT INTO tournaments (name, max_players, current_players, status, created_by, created_at, started_at, completed_at)
SELECT name, max_players, current_players, status, created_by, created_at, started_at, completed_at
FROM tournaments_backup;

DROP TABLE tournaments_backup;
DROP TABLE tournament_players_backup;
DROP TABLE tournament_matches_backup;

COMMIT;

.print "Schema fix completed"
.print "Tournaments table structure:"
.schema tournaments
.print "Tournament players table structure:"
.schema tournament_players
.print "Tournament matches table structure:"
.schema tournament_matches
