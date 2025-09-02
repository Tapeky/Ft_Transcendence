import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';
import { DatabaseManager } from '../database/DatabaseManager';

// Interface complète avec tous les cas d'usage
interface RecordMatchBody {
  // Joueurs (flexibilité maximale)
  player1_id?: number | null;
  player2_id?: number | null;
  player1_guest_name?: string | null;
  player2_guest_name?: string | null;
  
  // Scores (obligatoires)
  player1_score: number;
  player2_score: number;
  winner_id?: number | null;
  
  // Métadonnées du jeu
  game_type?: string;
  max_score?: number;
  tournament_id?: number | null;
  
  // Statistiques détaillées du gameplay
  player1_touched_ball?: number;
  player1_missed_ball?: number;
  player1_touched_ball_in_row?: number;
  player1_missed_ball_in_row?: number;
  player2_touched_ball?: number;
  player2_missed_ball?: number;
  player2_touched_ball_in_row?: number;
  player2_missed_ball_in_row?: number;
  
  // Durée et métadonnées
  duration_seconds?: number;
  match_data?: string; // JSON pour données supplémentaires
}

interface CreateMatchBody {
  player2_id: number;
  game_type?: string;
  max_score?: number;
}

interface MatchParams {
  id: string;
}

interface MatchResultBody {
  player1_score: number;
  player2_score: number;
  winner_id: number;
}

export async function matchRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance();

  // POST /api/matches/record - Enregistrer un match complet (avec support invités + stats)
  server.post<{ Body: RecordMatchBody }>('/record', {
    preHandler: [
      validateInput({
        body: {
          player1_score: { required: true, type: 'number', min: 0 },
          player2_score: { required: true, type: 'number', min: 0 },
          game_type: { type: 'string', enum: ['pong', 'tournament'] },
          max_score: { type: 'number', min: 1, max: 21 }
        }
      })
    ]
  }, async (request: FastifyRequest<{ Body: RecordMatchBody }>, reply: FastifyReply) => {
    try {
      const {
        player1_id, player2_id, player1_guest_name, player2_guest_name,
        player1_score, player2_score, winner_id, game_type = 'pong',
        max_score = 3, tournament_id, duration_seconds,
        player1_touched_ball = 0, player1_missed_ball = 0,
        player1_touched_ball_in_row = 0, player1_missed_ball_in_row = 0,
        player2_touched_ball = 0, player2_missed_ball = 0,
        player2_touched_ball_in_row = 0, player2_missed_ball_in_row = 0,
        match_data
      } = request.body;

      // Validation business logic
      const validationError = await validateMatchData({
        player1_id, player2_id, player1_guest_name, player2_guest_name,
        player1_score, player2_score, winner_id, tournament_id
      }, db);
      
      if (validationError) {
        return reply.status(400).send({
          success: false,
          error: validationError
        });
      }

      // Normaliser les données
      const finalP1Id = player1_id || null;
      const finalP2Id = player2_id || null;
      const finalP1GuestName = finalP1Id ? null : player1_guest_name;
      const finalP2GuestName = finalP2Id ? null : player2_guest_name;

      // Insérer le match avec toutes les données
      const result = await db.execute(`
        INSERT INTO matches (
          player1_id, player2_id, player1_guest_name, player2_guest_name,
          player1_score, player2_score, winner_id, game_type, max_score,
          tournament_id, duration_seconds, status,
          player1_touched_ball, player1_missed_ball, 
          player1_touched_ball_in_row, player1_missed_ball_in_row,
          player2_touched_ball, player2_missed_ball,
          player2_touched_ball_in_row, player2_missed_ball_in_row,
          match_data, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        finalP1Id, finalP2Id, finalP1GuestName, finalP2GuestName,
        player1_score, player2_score, winner_id, game_type, max_score,
        tournament_id, duration_seconds,
        player1_touched_ball, player1_missed_ball,
        player1_touched_ball_in_row, player1_missed_ball_in_row,
        player2_touched_ball, player2_missed_ball,
        player2_touched_ball_in_row, player2_missed_ball_in_row,
        match_data ? JSON.stringify(match_data) : null
      ]);

      const matchId = result.lastID;

      // Si c'est un match de tournoi, avancer le bracket
      if (tournament_id && winner_id) {
        await advanceTournamentBracket(tournament_id, matchId, winner_id, db);
      }

      // Log pour tracking
      server.log.info(`Match recorded: ID=${matchId}, Players=${finalP1Id || finalP1GuestName} vs ${finalP2Id || finalP2GuestName}, Score=${player1_score}-${player2_score}`);

      // Récupérer le match complet pour la réponse
      const createdMatch = await getMatchById(matchId, db);

      reply.status(201).send({
        success: true,
        message: 'Match enregistré avec succès',
        data: createdMatch
      });

    } catch (error: unknown) {
      request.log.error('Erreur enregistrement match:', error);
      
      // Gestion d'erreurs spécifiques
      if (error instanceof Error) {
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          return reply.status(400).send({
            success: false,
            error: 'ID joueur invalide'
          });
        }
        if (error.message.includes('UNIQUE constraint failed')) {
          return reply.status(409).send({
            success: false,
            error: 'Match déjà enregistré'
          });
        }
      }

      reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'enregistrement du match'
      });
    }
  });

  // GET /api/matches - Historique avec filtres avancés
  server.get('/', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { 
        player_id, tournament_id, game_type, limit = 50, offset = 0,
        include_guests = false, include_stats = false 
      } = request.query as any;
      
      const userId = (request as any).user?.id;
      const targetPlayerId = player_id || userId;

      let baseQuery = `
        SELECT m.*, t.name as tournament_name,
               u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
               u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
      `;

      if (include_stats) {
        baseQuery += `, m.player1_touched_ball, m.player1_missed_ball, 
                        m.player2_touched_ball, m.player2_missed_ball`;
      }

      baseQuery += `
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id
        LEFT JOIN users u2 ON m.player2_id = u2.id
        LEFT JOIN tournaments t ON m.tournament_id = t.id
        WHERE (m.player1_id = ? OR m.player2_id = ?)
      `;

      const params = [targetPlayerId, targetPlayerId];

      if (!include_guests) {
        baseQuery += ` AND m.player1_guest_name IS NULL AND m.player2_guest_name IS NULL`;
      }

      if (tournament_id) {
        baseQuery += ` AND m.tournament_id = ?`;
        params.push(tournament_id);
      }

      if (game_type) {
        baseQuery += ` AND m.game_type = ?`;
        params.push(game_type);
      }

      baseQuery += ` ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const matches = await db.query(baseQuery, params);

      reply.send({
        success: true,
        data: matches,
        pagination: { limit, offset, total: matches.length }
      });

    } catch (error: unknown) {
      request.log.error('Erreur récupération matches:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des matches'
      });
    }
  });

  // POST /api/matches - Créer un match direct
  server.post<{ Body: CreateMatchBody }>('/', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          player2_id: { required: true, type: 'number' },
          game_type: { type: 'string' },
          max_score: { type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest<{ Body: CreateMatchBody }>, reply: FastifyReply) => {
    try {
      const { player2_id, game_type = 'pong', max_score = 3 } = request.body;
      const player1_id = (request as any).user.id;

      if (player1_id === player2_id) {
        return reply.status(400).send({
          success: false,
          error: 'Vous ne pouvez pas jouer contre vous-même'
        });
      }

      const opponent = await db.query(`
        SELECT id, username FROM users WHERE id = ?
      `, [player2_id]);

      if (!opponent.length) {
        return reply.status(404).send({
          success: false,
          error: 'Adversaire non trouvé'
        });
      }

      const result = await db.query(`
        INSERT INTO matches (player1_id, player2_id, game_type, max_score, status)
        VALUES (?, ?, ?, ?, 'scheduled')
      `, [player1_id, player2_id, game_type, max_score]);

      const matchId = (result as any).lastInsertRowid;

      const match = await db.query(`
        SELECT m.*, 
               u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
               u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id
        LEFT JOIN users u2 ON m.player2_id = u2.id
        WHERE m.id = ?
      `, [matchId]);

      reply.status(201).send({
        success: true,
        data: match[0],
        message: 'Match créé avec succès'
      });
    } catch (error: unknown) {
      request.log.error('Erreur création match:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du match'
      });
    }
  });

  // GET /api/matches/live - Matches en cours avec WebSocket support
  server.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const liveMatches = await db.query(`
        SELECT m.*, t.name as tournament_name,
               u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
               u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id
        LEFT JOIN users u2 ON m.player2_id = u2.id  
        LEFT JOIN tournaments t ON m.tournament_id = t.id
        WHERE m.status = 'playing'
        ORDER BY m.started_at DESC
      `);

      reply.send({
        success: true,
        data: liveMatches,
        count: liveMatches.length
      });

    } catch (error: unknown) {
      request.log.error('Erreur matches live:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des matches en cours'
      });
    }
  });

  // GET /api/matches/:id - Détails complets d'un match
  server.get<{ Params: MatchParams }>('/:id', async (request: FastifyRequest<{ Params: MatchParams }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.id);
      const match = await getMatchById(matchId, db);

      if (!match) {
        return reply.status(404).send({
          success: false,
          error: 'Match non trouvé'
        });
      }

      reply.send({
        success: true,
        data: match
      });

    } catch (error: unknown) {
      request.log.error('Erreur détails match:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du match'
      });
    }
  });

  // PUT /api/matches/:id/result - Enregistrer le résultat
  server.put<{ Params: MatchParams; Body: MatchResultBody }>('/:id/result', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          player1_score: { required: true, type: 'number' },
          player2_score: { required: true, type: 'number' },
          winner_id: { required: true, type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest<{ Params: MatchParams; Body: MatchResultBody }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.id);
      const { player1_score, player2_score, winner_id } = request.body;
      const userId = (request as any).user.id;

      const match = await db.query(`
        SELECT * FROM matches WHERE id = ?
      `, [matchId]);

      if (!match.length) {
        return reply.status(404).send({
          success: false,
          error: 'Match non trouvé'
        });
      }

      const currentMatch = match[0];

      if (currentMatch.player1_id !== userId && currentMatch.player2_id !== userId) {
        return reply.status(403).send({
          success: false,
          error: 'Vous n\'êtes pas autorisé à enregistrer ce résultat'
        });
      }

      if (currentMatch.status === 'completed') {
        return reply.status(400).send({
          success: false,
          error: 'Ce match est déjà terminé'
        });
      }

      if (winner_id !== currentMatch.player1_id && winner_id !== currentMatch.player2_id) {
        return reply.status(400).send({
          success: false,
          error: 'Le gagnant doit être l\'un des deux joueurs'
        });
      }

      const startTime = currentMatch.started_at ? new Date(currentMatch.started_at) : new Date();
      const endTime = new Date();
      const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      await db.query(`
        UPDATE matches 
        SET player1_score = ?, player2_score = ?, winner_id = ?, 
            status = 'completed', completed_at = CURRENT_TIMESTAMP,
            duration_seconds = ?
        WHERE id = ?
      `, [player1_score, player2_score, winner_id, durationSeconds, matchId]);

      if (currentMatch.tournament_id) {
        await advanceTournamentBracket(currentMatch.tournament_id, matchId, winner_id, db);
      }

      const updatedMatch = await db.query(`
        SELECT m.*, 
               u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
               u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id
        LEFT JOIN users u2 ON m.player2_id = u2.id
        WHERE m.id = ?
      `, [matchId]);

      reply.send({
        success: true,
        data: updatedMatch[0],
        message: 'Résultat enregistré avec succès'
      });
    } catch (error: unknown) {
      request.log.error('Erreur enregistrement résultat:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de l\'enregistrement du résultat'
      });
    }
  });

  // POST /api/matches/:id/start - Démarrer un match
  server.post<{ Params: MatchParams }>('/:id/start', {
    preHandler: authenticateToken
  }, async (request: FastifyRequest<{ Params: MatchParams }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.id);
      const userId = (request as any).user.id;

      const match = await db.query(`
        SELECT * FROM matches WHERE id = ? AND (player1_id = ? OR player2_id = ?)
      `, [matchId, userId, userId]);

      if (!match.length) {
        return reply.status(404).send({
          success: false,
          error: 'Match non trouvé ou accès non autorisé'
        });
      }

      if (match[0].status !== 'scheduled') {
        return reply.status(400).send({
          success: false,
          error: 'Le match ne peut pas être démarré'
        });
      }

      await db.query(`
        UPDATE matches 
        SET status = 'playing', started_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [matchId]);

      reply.send({
        success: true,
        message: 'Match démarré'
      });

    } catch (error: unknown) {
      request.log.error('Erreur démarrage match:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors du démarrage du match'
      });
    }
  });
}

// Fonctions utilitaires
async function validateMatchData(data: any, db: any): Promise<string | null> {
  const {
    player1_id, player2_id, player1_guest_name, player2_guest_name,
    player1_score, player2_score, winner_id, tournament_id
  } = data;

  if ((!player1_id && !player1_guest_name) || (!player2_id && !player2_guest_name)) {
    return 'Chaque joueur doit avoir soit un ID soit un nom d\'invité';
  }

  if (player1_id) {
    const user1 = await db.query('SELECT id FROM users WHERE id = ?', [player1_id]);
    if (!user1.length) return `Joueur 1 (ID: ${player1_id}) non trouvé`;
  }

  if (player2_id) {
    const user2 = await db.query('SELECT id FROM users WHERE id = ?', [player2_id]);
    if (!user2.length) return `Joueur 2 (ID: ${player2_id}) non trouvé`;
  }

  if (winner_id && winner_id !== player1_id && winner_id !== player2_id) {
    return 'Le gagnant doit être l\'un des deux joueurs';
  }

  if (tournament_id) {
    const tournament = await db.query('SELECT id FROM tournaments WHERE id = ?', [tournament_id]);
    if (!tournament.length) return `Tournoi (ID: ${tournament_id}) non trouvé`;
  }

  return null;
}

async function getMatchById(matchId: number, db: any) {
  const matches = await db.query(`
    SELECT m.*, t.name as tournament_name,
           u1.username as player1_username, u1.display_name as player1_display_name, u1.avatar_url as player1_avatar_url,
           u2.username as player2_username, u2.display_name as player2_display_name, u2.avatar_url as player2_avatar_url
    FROM matches m
    LEFT JOIN users u1 ON m.player1_id = u1.id
    LEFT JOIN users u2 ON m.player2_id = u2.id
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.id = ?
  `, [matchId]);

  return matches.length ? matches[0] : null;
}

async function advanceTournamentBracket(tournamentId: number, matchId: number, winnerId: number, db: any) {
  const remainingMatches = await db.query(`
    SELECT COUNT(*) as count FROM matches 
    WHERE tournament_id = ? AND status != 'completed'
  `, [tournamentId]);

  if (remainingMatches[0].count === 0) {
    await db.query(`
      UPDATE tournaments 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, winner_id = ?
      WHERE id = ?
    `, [winnerId, tournamentId]);
  }
}