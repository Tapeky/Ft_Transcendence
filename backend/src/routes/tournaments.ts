import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken, validateInput } from '../middleware';
import { DatabaseManager } from '../database/DatabaseManager';

interface CreateTournamentBody {
  name: string;
  description?: string;
  max_players?: number;
}

interface JoinTournamentParams {
  id: string;
}

interface JoinTournamentBody {
  alias: string;
}

interface TournamentParams {
  id: string;
}

// Créer matches tournoi
async function createTournamentMatches(tournamentId: number, participants: any[]) {
  const db = DatabaseManager.getInstance();
  if (participants.length < 2) {
    throw new Error('Il faut au moins 2 participants');
  }

  const matches = [];
  
  if (participants.length === 2) {
    const result = await db.execute(`
      INSERT INTO matches (tournament_id, player1_id, player2_id, status, game_type)
      VALUES (?, ?, ?, 'scheduled', 'pong')
    `, [tournamentId, participants[0].user_id, participants[1].user_id]);
    matches.push(result);
  } else {
    for (let i = 0; i < participants.length; i += 2) {
      if (i + 1 < participants.length) {
        const result = await db.execute(`
          INSERT INTO matches (tournament_id, player1_id, player2_id, status, game_type)
          VALUES (?, ?, ?, 'scheduled', 'pong')
        `, [tournamentId, participants[i].user_id, participants[i + 1].user_id]);
        matches.push(result);
      }
    }
  }

  return matches;
}

export async function tournamentRoutes(server: FastifyInstance) {
  const db = DatabaseManager.getInstance();

  // GET /api/tournaments - Liste des tournois
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const tournaments = await db.query(`
        SELECT t.*, u.username as creator_username,
               COUNT(tp.user_id) as current_players
        FROM tournaments t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `);

      reply.send({
        success: true,
        data: tournaments
      });
    } catch (error) {
      request.log.error('Erreur tournois:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des tournois'
      });
    }
  });

  // POST /api/tournaments - Créer un tournoi
  server.post<{ Body: CreateTournamentBody }>('/', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          name: { required: true, type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          max_players: { type: 'number' }
        }
      })
    ]
  }, async (request: FastifyRequest<{ Body: CreateTournamentBody }>, reply: FastifyReply) => {
    try {
      const { name, description, max_players = 8 } = request.body;
      const userId = (request as any).user.id;

      const result = await db.execute(`
        INSERT INTO tournaments (name, description, max_players, created_by)
        VALUES (?, ?, ?, ?)
      `, [name, description, max_players, userId]);

      const tournamentId = result.lastID;

      const tournament = await db.query(`
        SELECT t.*, u.username as creator_username
        FROM tournaments t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
      `, [tournamentId]);

      reply.status(201).send({
        success: true,
        data: tournament[0],
        message: 'Tournoi créé avec succès'
      });
    } catch (error) {
      request.log.error('Erreur création tournoi:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la création du tournoi'
      });
    }
  });

  // POST /api/tournaments/:id/join - Rejoindre un tournoi avec alias
  server.post<{ Params: JoinTournamentParams; Body: JoinTournamentBody }>('/:id/join', {
    preHandler: [
      authenticateToken,
      validateInput({
        body: {
          alias: { required: true, type: 'string', minLength: 2, maxLength: 50 }
        }
      })
    ]
  }, async (request: FastifyRequest<{ Params: JoinTournamentParams; Body: JoinTournamentBody }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      const userId = (request as any).user.id;
      const { alias } = request.body;

      // -----------CHECKS DE VALIDATION-----------
      const tournament = await db.query(`
        SELECT * FROM tournaments WHERE id = ? AND status = 'open'
      `, [tournamentId]);

      if (!tournament.length) {
        return reply.status(404).send({
          success: false,
          error: 'Tournoi non trouvé ou fermé'
        });
      }

      const currentPlayers = await db.query(`
        SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?
      `, [tournamentId]);

      if (currentPlayers[0].count >= tournament[0].max_players) {
        return reply.status(400).send({
          success: false,
          error: 'Le tournoi est complet'
        });
      }

      const existing = await db.query(`
        SELECT * FROM tournament_participants WHERE tournament_id = ? AND user_id = ?
      `, [tournamentId, userId]);

      if (existing.length) {
        return reply.status(400).send({
          success: false,
          error: 'Vous participez déjà à ce tournoi'
        });
      }
      // -------------------------------------------

      // Vérifier que l'alias n'est pas déjà pris dans ce tournoi
      const aliasExists = await db.query(`
        SELECT * FROM tournament_participants WHERE tournament_id = ? AND alias = ?
      `, [tournamentId, alias]);

      if (aliasExists.length) {
        return reply.status(409).send({
          success: false,
          error: 'Cet alias est déjà pris pour ce tournoi'
        });
      }

      // Ajouter le participant avec son alias
      await db.execute(`
        INSERT INTO tournament_participants (tournament_id, user_id, alias)
        VALUES (?, ?, ?)
      `, [tournamentId, userId, alias]);

      reply.send({
        success: true,
        message: `Vous avez rejoint le tournoi en tant que "${alias}"`
      });
    } catch (error) {
      request.log.error('Erreur rejoindre tournoi:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la participation au tournoi'
      });
    }
  });

  // GET /api/tournaments/:id/bracket - État du bracket
  server.get<{ Params: TournamentParams }>('/:id/bracket', async (request: FastifyRequest<{ Params: TournamentParams }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);

      const tournament = await db.query(`
        SELECT * FROM tournaments WHERE id = ?
      `, [tournamentId]);

      if (!tournament.length) {
        return reply.status(404).send({
          success: false,
          error: 'Tournoi non trouvé'
        });
      }

      const participants = await db.query(`
        SELECT tp.*, u.username, u.display_name, tp.alias
        FROM tournament_participants tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.tournament_id = ?
        ORDER BY tp.joined_at
      `, [tournamentId]);

      const matches = await db.query(`
        SELECT m.*, 
               u1.username as player1_username,
               u2.username as player2_username,
               tp1.alias as player1_alias,
               tp2.alias as player2_alias
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id
        LEFT JOIN users u2 ON m.player2_id = u2.id
        LEFT JOIN tournament_participants tp1 ON tp1.tournament_id = m.tournament_id AND tp1.user_id = m.player1_id
        LEFT JOIN tournament_participants tp2 ON tp2.tournament_id = m.tournament_id AND tp2.user_id = m.player2_id
        WHERE m.tournament_id = ?
        ORDER BY m.created_at
      `, [tournamentId]);

      reply.send({
        success: true,
        data: {
          tournament: tournament[0],
          participants,
          matches,
          bracket_data: tournament[0].bracket_data ? JSON.parse(tournament[0].bracket_data) : null
        }
      });
    } catch (error) {
      request.log.error('Erreur bracket tournoi:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération du bracket'
      });
    }
  });

  // PUT /api/tournaments/:id/start - Démarrer un tournoi
  server.put<{ Params: TournamentParams }>('/:id/start', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{ Params: TournamentParams }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      const userId = (request as any).user.id;

      const tournament = await db.query(`
        SELECT * FROM tournaments WHERE id = ? AND created_by = ?
      `, [tournamentId, userId]);

      if (!tournament.length) {
        return reply.status(404).send({
          success: false,
          error: 'Tournoi non trouvé ou vous n\'êtes pas le créateur'
        });
      }

      if (tournament[0].status !== 'open') {
        return reply.status(400).send({
          success: false,
          error: 'Le tournoi ne peut pas être démarré'
        });
      }

      const participants = await db.query(`
        SELECT * FROM tournament_participants WHERE tournament_id = ?
      `, [tournamentId]);

      if (participants.length < 2) {
        return reply.status(400).send({
          success: false,
          error: 'Il faut au moins 2 participants pour démarrer'
        });
      }

      const bracketData: any = {
        participants: participants.map(p => ({ id: p.user_id, position: p.id })),
        rounds: []
      };

      try {
        const matches = await createTournamentMatches(tournamentId, participants);
        bracketData.rounds = [{ matches: matches.map(m => ({ id: (m as any).lastID })) }];
      } catch (matchError) {
        request.log.error('Erreur création matches:', matchError);
        return reply.status(500).send({
          success: false,
          error: 'Erreur lors de la création des matches'
        });
      }

      await db.execute(`
        UPDATE tournaments 
        SET status = 'running', started_at = CURRENT_TIMESTAMP, bracket_data = ?
        WHERE id = ?
      `, [JSON.stringify(bracketData), tournamentId]);

      reply.send({
        success: true,
        message: 'Tournoi démarré avec succès',
        data: { bracket_data: bracketData }
      });
    } catch (error) {
      request.log.error('Erreur démarrage tournoi:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors du démarrage du tournoi'
      });
    }
  });

  // GET /api/tournaments/:id/matches - Matches d'un tournoi avec alias
  server.get<{ Params: TournamentParams }>('/:id/matches', async (request: FastifyRequest<{ Params: TournamentParams }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);

      const tournament = await db.query(`
        SELECT * FROM tournaments WHERE id = ?
      `, [tournamentId]);

      if (!tournament.length) {
        return reply.status(404).send({
          success: false,
          error: 'Tournoi non trouvé'
        });
      }

      const matches = await db.query(`
        SELECT m.*, 
               u1.username as player1_username,
               u2.username as player2_username,
               tp1.alias as player1_alias,
               tp2.alias as player2_alias
        FROM matches m
        LEFT JOIN users u1 ON m.player1_id = u1.id
        LEFT JOIN users u2 ON m.player2_id = u2.id
        LEFT JOIN tournament_participants tp1 ON tp1.tournament_id = m.tournament_id AND tp1.user_id = m.player1_id
        LEFT JOIN tournament_participants tp2 ON tp2.tournament_id = m.tournament_id AND tp2.user_id = m.player2_id
        WHERE m.tournament_id = ?
        ORDER BY m.created_at
      `, [tournamentId]);

      reply.send({
        success: true,
        data: {
          tournament: tournament[0],
          matches
        }
      });
    } catch (error) {
      request.log.error('Erreur matches tournoi:', error);
      reply.status(500).send({
        success: false,
        error: 'Erreur lors de la récupération des matches'
      });
    }
  });
}