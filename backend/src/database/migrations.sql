-- Migration pour ajouter la colonne 'round' à la table matches
-- Nécessaire pour le système de brackets multi-rounds

-- Vérifier si la colonne existe déjà, sinon l'ajouter
ALTER TABLE matches ADD COLUMN round INTEGER DEFAULT 1;

-- Créer un index pour optimiser les requêtes par round
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round ON matches(tournament_id, round);

-- Mettre à jour les matches existants pour leur donner un round par défaut
UPDATE matches SET round = 1 WHERE round IS NULL;

-- Ajouter une contrainte pour s'assurer que le round est toujours positif
-- Note: SQLite ne supporte pas les CHECK constraints sur ALTER TABLE,
-- donc nous devons recréer la table si nécessaire

-- Pour les nouvelles installations, cette table sera créée avec la contrainte :
/*
CREATE TABLE matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER,
  player1_id INTEGER NOT NULL,
  player2_id INTEGER,
  winner_id INTEGER,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 11,
  game_type VARCHAR(50) DEFAULT 'pong',
  status VARCHAR(20) DEFAULT 'scheduled',
  round INTEGER DEFAULT 1 CHECK (round > 0),
  duration_seconds INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  finished_at DATETIME,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES users(id),
  FOREIGN KEY (player2_id) REFERENCES users(id),
  FOREIGN KEY (winner_id) REFERENCES users(id)
);
*/