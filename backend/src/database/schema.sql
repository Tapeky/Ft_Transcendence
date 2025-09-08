-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_online BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    
    -- Stats utilisateur
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    total_games INTEGER DEFAULT 0,
    
    -- Auth externe (Google, GitHub, etc.)
    google_id VARCHAR(255) UNIQUE,
    github_id VARCHAR(255) UNIQUE,
    
    -- GDPR compliance
    data_consent BOOLEAN DEFAULT FALSE,
    data_consent_date DATETIME
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Table des amitiés
CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, blocked
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, friend_id)
);

-- Table des tournois
CREATE TABLE IF NOT EXISTS tournaments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_players INTEGER NOT NULL DEFAULT 8,
    current_players INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'waiting', -- waiting, ready, running, completed, cancelled
    bracket_data TEXT, -- JSON pour stocker la structure du bracket
    winner_id INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    
    FOREIGN KEY (winner_id) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des participants aux tournois avec alias
CREATE TABLE IF NOT EXISTS tournament_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    alias VARCHAR(50) NOT NULL, -- Alias obligatoire pour le tournoi
    position INTEGER, -- position finale dans le tournoi
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(tournament_id, user_id), -- Un seul alias par joueur par tournoi
    UNIQUE(tournament_id, alias) -- Pas de doublons d'alias dans un tournoi
);

-- Table des matches
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER, -- NULL si match hors tournoi
    player1_id INTEGER, -- NULL si joueur invité
    player2_id INTEGER, -- NULL si joueur invité
    player1_guest_name VARCHAR(100), -- Nom du joueur invité
    player2_guest_name VARCHAR(100), -- Nom du joueur invité
    player1_score INTEGER DEFAULT 0,
    player2_score INTEGER DEFAULT 0,
    winner_id INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, bye
    game_type VARCHAR(50) DEFAULT 'pong', -- pong, autre_jeu
    match_data TEXT, -- JSON pour données spécifiques au match
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Métadonnées pour l'historique
    duration_seconds INTEGER,
    max_score INTEGER DEFAULT 3,
    
    -- Statistiques détaillées du gameplay
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
    
    -- Contrainte : au moins un joueur doit être défini pour chaque côté
    CHECK (
        (player1_id IS NOT NULL OR player1_guest_name IS NOT NULL) AND
        (player2_id IS NOT NULL OR player2_guest_name IS NOT NULL)
    )
);

-- Index pour les performances des matches
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_players ON matches(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- Table des sessions JWT (pour la sécurité)
CREATE TABLE IF NOT EXISTS jwt_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour nettoyer les tokens expirés
CREATE INDEX IF NOT EXISTS idx_jwt_expires ON jwt_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_jwt_user ON jwt_tokens(user_id);

-- Table des logs de sécurité (pour Brice)
CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details TEXT, -- JSON avec détails supplémentaires
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index pour les logs de sécurité
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_action ON security_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_logs_date ON security_logs(created_at);

-- Triggers pour maintenir les stats utilisateur
CREATE TRIGGER IF NOT EXISTS update_user_stats_on_match_complete
AFTER UPDATE OF status ON matches
WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
    -- Mise à jour pour le gagnant
    UPDATE users 
    SET total_wins = total_wins + 1,
        total_games = total_games + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.winner_id;
    
    -- Mise à jour pour le perdant
    UPDATE users 
    SET total_losses = total_losses + 1,
        total_games = total_games + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = (CASE 
                    WHEN NEW.winner_id = NEW.player1_id THEN NEW.player2_id 
                    ELSE NEW.player1_id 
                END);
END;

-- Trigger pour update timestamp
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ======================================
-- GAME INVITES SYSTEM
-- ======================================

-- Table des invitations de jeu
CREATE TABLE IF NOT EXISTS game_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour les invitations de jeu
CREATE INDEX IF NOT EXISTS idx_game_invites_sender ON game_invites(sender_id);
CREATE INDEX IF NOT EXISTS idx_game_invites_receiver ON game_invites(receiver_id);
CREATE INDEX IF NOT EXISTS idx_game_invites_status ON game_invites(status);
CREATE INDEX IF NOT EXISTS idx_game_invites_expires ON game_invites(expires_at);

-- Trigger pour update timestamp des invitations
CREATE TRIGGER IF NOT EXISTS update_game_invites_timestamp
AFTER UPDATE ON game_invites
BEGIN
    UPDATE game_invites SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ======================================
-- CHAT SYSTEM TABLES
-- ======================================

-- Table des conversations (messages directs)
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- S'assurer que user1_id < user2_id pour éviter les doublons
    CHECK (user1_id < user2_id),
    UNIQUE(user1_id, user2_id)
);

-- Table des messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'game_invite', 'tournament_notification'
    metadata TEXT, -- JSON pour invitations/notifications
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- Trigger pour mettre à jour updated_at des conversations
CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp
AFTER INSERT ON messages
BEGIN
    UPDATE conversations 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.conversation_id;
END;