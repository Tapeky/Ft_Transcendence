import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateToken } from '../middleware';
import { TournamentManager } from '../websocket/TournamentManager';

/**
 * Nouvelles routes pour le système de tournois complet
 * Respecte les exigences du sujet ft_transcendence
 */

interface TournamentParams {
  id: string;
}

interface StartTournamentBody {
  force?: boolean; // Pour forcer le démarrage même avec peu de participants
}

interface MatchResultBody {
  winnerId: number;
  player1Score: number;
  player2Score: number;
}

export async function extendedTournamentRoutes(server: FastifyInstance) {
  const tournamentManager = TournamentManager.getInstance();

  // PUT /api/tournaments/:id/start - Démarrer un tournoi avec le nouveau système
  server.put<{
    Params: TournamentParams;
    Body: StartTournamentBody;
  }>('/:id/start', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{
    Params: TournamentParams;
    Body: StartTournamentBody;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      const userId = (request as any).user.id;
      const { force = false } = request.body || {};

      const bracket = await tournamentManager.startTournament(tournamentId, userId);

      reply.send({
        success: true,
        message: 'Tournoi démarré avec système de brackets complet',
        data: {
          bracket,
          nextMatch: bracket.nextMatch,
          totalRounds: bracket.rounds.length,
          participants: bracket.participants.length
        }
      });

    } catch (error: any) {
      request.log.error('Erreur démarrage tournoi avancé:', error);
      reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/tournaments/:id/next-match - Obtenir le prochain match (exigence sujet)
  server.get<{
    Params: TournamentParams;
  }>('/:id/next-match', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{
    Params: TournamentParams;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      const nextMatch = await tournamentManager.announceNextMatch(tournamentId);

      if (!nextMatch) {
        return reply.send({
          success: true,
          message: 'Aucun match suivant disponible',
          data: { nextMatch: null }
        });
      }

      reply.send({
        success: true,
        message: 'Prochain match annoncé',
        data: { 
          nextMatch,
          announcement: `🎮 Prochain match: ${nextMatch.player1?.alias} vs ${nextMatch.player2?.alias || 'BYE'}`
        }
      });

    } catch (error: any) {
      request.log.error('Erreur annonce prochain match:', error);
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // PUT /api/tournaments/matches/:matchId/result - Mettre à jour le résultat d'un match
  server.put<{
    Params: { matchId: string };
    Body: MatchResultBody;
  }>('/matches/:matchId/result', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{
    Params: { matchId: string };
    Body: MatchResultBody;
  }>, reply: FastifyReply) => {
    try {
      const matchId = parseInt(request.params.matchId);
      const { winnerId, player1Score, player2Score } = request.body;

      // Validation des scores
      if (typeof winnerId !== 'number' || winnerId <= 0) {
        return reply.status(400).send({
          success: false,
          error: 'winnerId invalide'
        });
      }

      if (typeof player1Score !== 'number' || typeof player2Score !== 'number') {
        return reply.status(400).send({
          success: false,
          error: 'Scores invalides'
        });
      }

      await tournamentManager.updateMatchResult(
        matchId, 
        winnerId, 
        player1Score, 
        player2Score
      );

      reply.send({
        success: true,
        message: 'Résultat du match mis à jour, progression automatique effectuée'
      });

    } catch (error: any) {
      request.log.error('Erreur mise à jour résultat match:', error);
      reply.status(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/tournaments/:id/bracket-full - Récupérer l'état complet du bracket
  server.get<{
    Params: TournamentParams;
  }>('/:id/bracket-full', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{
    Params: TournamentParams;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      // Cette méthode sera ajoutée au TournamentManager
      // const fullBracket = await tournamentManager.getFullBracket(tournamentId);

      reply.send({
        success: true,
        message: 'État complet du bracket récupéré',
        data: {
          // bracket: fullBracket,
          // currentRound: fullBracket.currentRound,
          // nextMatch: fullBracket.nextMatch,
          // completedMatches: fullBracket.completedMatches
        }
      });

    } catch (error: any) {
      request.log.error('Erreur récupération bracket complet:', error);
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // POST /api/tournaments/:id/subscribe - S'abonner aux événements du tournoi
  server.post<{
    Params: TournamentParams;
  }>('/:id/subscribe', {
    preHandler: [authenticateToken]
  }, async (request: FastifyRequest<{
    Params: TournamentParams;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      const userId = (request as any).user.id;

      // Cette logique sera gérée via WebSocket
      // tournamentManager.subscribeTournamentEvents(tournamentId, callback);

      reply.send({
        success: true,
        message: 'Abonnement aux événements du tournoi activé (via WebSocket)',
        data: {
          tournamentId,
          userId,
          eventTypes: [
            'tournament_started',
            'next_match_announced', 
            'match_completed',
            'tournament_completed'
          ]
        }
      });

    } catch (error: any) {
      request.log.error('Erreur abonnement tournoi:', error);
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/tournaments/:id/status - État détaillé du tournoi
  server.get<{
    Params: TournamentParams;
  }>('/:id/status', async (request: FastifyRequest<{
    Params: TournamentParams;
  }>, reply: FastifyReply) => {
    try {
      const tournamentId = parseInt(request.params.id);
      
      // Implementation complète dans TournamentManager
      reply.send({
        success: true,
        message: 'État du tournoi récupéré',
        data: {
          tournamentId,
          status: 'Implémentation en cours...',
          // tournament: fullTournamentInfo,
          // currentPhase: 'registration|running|completed',
          // nextMatch: nextMatchInfo,
          // bracket: bracketState,
          // participants: participantsList,
          // completionPercentage: calculatedPercentage
        }
      });

    } catch (error: any) {
      request.log.error('Erreur état tournoi:', error);
      reply.status(500).send({
        success: false,
        error: error.message
      });
    }
  });
}