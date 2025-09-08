/**
 * Tournament Validator - Comprehensive validation and error handling
 */

import { TournamentBracket, BracketMatch, TournamentPlayer } from './BracketEngine';
import { TournamentStatus, TournamentState } from './TournamentStateMachine';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class TournamentValidator {
  
  /**
   * Validate tournament creation data
   */
  validateTournamentCreation(data: {
    name: string;
    description?: string;
    maxPlayers: number;
    minPlayers?: number;
    createdBy: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Tournament name is required',
        code: 'TOURNAMENT_NAME_REQUIRED'
      });
    } else if (data.name.length > 255) {
      errors.push({
        field: 'name',
        message: 'Tournament name cannot exceed 255 characters',
        code: 'TOURNAMENT_NAME_TOO_LONG'
      });
    } else if (data.name.length < 3) {
      errors.push({
        field: 'name',
        message: 'Tournament name must be at least 3 characters',
        code: 'TOURNAMENT_NAME_TOO_SHORT'
      });
    }

    // Description validation (optional)
    if (data.description && data.description.length > 1000) {
      errors.push({
        field: 'description',
        message: 'Tournament description cannot exceed 1000 characters',
        code: 'TOURNAMENT_DESCRIPTION_TOO_LONG'
      });
    }

    // Max players validation
    if (!data.maxPlayers || data.maxPlayers < 2) {
      errors.push({
        field: 'maxPlayers',
        message: 'Tournament must allow at least 2 participants',
        code: 'TOURNAMENT_MIN_PARTICIPANTS_INVALID'
      });
    } else if (data.maxPlayers > 64) {
      errors.push({
        field: 'maxPlayers',
        message: 'Tournament cannot exceed 64 participants',
        code: 'TOURNAMENT_MAX_PARTICIPANTS_EXCEEDED'
      });
    }

    // Min players validation
    const minPlayers = data.minPlayers || 2;
    if (minPlayers < 2) {
      errors.push({
        field: 'minPlayers',
        message: 'Minimum participants must be at least 2',
        code: 'TOURNAMENT_MIN_PARTICIPANTS_INVALID'
      });
    } else if (minPlayers > data.maxPlayers) {
      errors.push({
        field: 'minPlayers',
        message: 'Minimum participants cannot exceed maximum participants',
        code: 'TOURNAMENT_MIN_EXCEEDS_MAX'
      });
    }

    // Creator validation
    if (!data.createdBy || data.createdBy <= 0) {
      errors.push({
        field: 'createdBy',
        message: 'Valid creator ID is required',
        code: 'TOURNAMENT_CREATOR_INVALID'
      });
    }

    // Ensure max players is power of 2 for single elimination
    if (data.maxPlayers > 0 && !this.isPowerOfTwo(data.maxPlayers) && data.maxPlayers !== 3 && data.maxPlayers !== 5 && data.maxPlayers !== 6 && data.maxPlayers !== 7) {
      // For non-power-of-2 numbers, we'll need byes, which is fine
      // Only warn for certain cases, but allow them
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate player joining tournament
   */
  validatePlayerJoin(data: {
    tournamentId: number;
    userId: number;
    alias: string;
    tournamentState: TournamentState;
    existingParticipants: TournamentPlayer[];
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // Tournament ID validation
    if (!data.tournamentId || data.tournamentId <= 0) {
      errors.push({
        field: 'tournamentId',
        message: 'Valid tournament ID is required',
        code: 'TOURNAMENT_ID_INVALID'
      });
    }

    // User ID validation
    if (!data.userId || data.userId <= 0) {
      errors.push({
        field: 'userId',
        message: 'Valid user ID is required',
        code: 'USER_ID_INVALID'
      });
    }

    // Alias validation
    const aliasValidation = this.validateAlias(data.alias);
    if (!aliasValidation.isValid) {
      errors.push(...aliasValidation.errors);
    }

    // Check if alias already exists in tournament
    if (data.existingParticipants.some(p => p.alias.toLowerCase() === data.alias.toLowerCase())) {
      errors.push({
        field: 'alias',
        message: 'This alias is already taken in this tournament',
        code: 'ALIAS_ALREADY_EXISTS'
      });
    }

    // Check if user already joined
    if (data.existingParticipants.some(p => p.user_id === data.userId)) {
      errors.push({
        field: 'userId',
        message: 'You are already participating in this tournament',
        code: 'USER_ALREADY_JOINED'
      });
    }

    // Tournament state validation
    if (data.tournamentState.status === TournamentStatus.RUNNING) {
      errors.push({
        field: 'tournament',
        message: 'Cannot join a running tournament',
        code: 'TOURNAMENT_ALREADY_STARTED'
      });
    }

    if (data.tournamentState.status === TournamentStatus.COMPLETED) {
      errors.push({
        field: 'tournament',
        message: 'Cannot join a completed tournament',
        code: 'TOURNAMENT_COMPLETED'
      });
    }

    if (data.tournamentState.status === TournamentStatus.CANCELLED) {
      errors.push({
        field: 'tournament',
        message: 'Cannot join a cancelled tournament',
        code: 'TOURNAMENT_CANCELLED'
      });
    }

    // Capacity validation
    if (data.tournamentState.participantCount >= data.tournamentState.maxParticipants) {
      errors.push({
        field: 'tournament',
        message: 'Tournament is full',
        code: 'TOURNAMENT_FULL'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate tournament start conditions
   */
  validateTournamentStart(data: {
    tournamentId: number;
    tournamentState: TournamentState;
    participants: TournamentPlayer[];
    userId: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // Tournament ID validation
    if (!data.tournamentId || data.tournamentId <= 0) {
      errors.push({
        field: 'tournamentId',
        message: 'Valid tournament ID is required',
        code: 'TOURNAMENT_ID_INVALID'
      });
    }

    // Check permissions - only creator can start
    if (data.tournamentState.createdBy !== data.userId) {
      errors.push({
        field: 'permissions',
        message: 'Only tournament creator can start the tournament',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // Tournament state validation
    if (data.tournamentState.status === TournamentStatus.RUNNING) {
      errors.push({
        field: 'tournament',
        message: 'Tournament is already running',
        code: 'TOURNAMENT_ALREADY_RUNNING'
      });
    }

    if (data.tournamentState.status === TournamentStatus.COMPLETED) {
      errors.push({
        field: 'tournament',
        message: 'Tournament is already completed',
        code: 'TOURNAMENT_COMPLETED'
      });
    }

    if (data.tournamentState.status === TournamentStatus.CANCELLED) {
      errors.push({
        field: 'tournament',
        message: 'Tournament is cancelled',
        code: 'TOURNAMENT_CANCELLED'
      });
    }

    // Participant validation
    if (data.participants.length < data.tournamentState.minParticipants) {
      errors.push({
        field: 'participants',
        message: `Tournament needs at least ${data.tournamentState.minParticipants} participants to start (current: ${data.participants.length})`,
        code: 'INSUFFICIENT_PARTICIPANTS'
      });
    }

    // Validate all participants have valid data
    data.participants.forEach((participant, index) => {
      if (!participant.user_id || participant.user_id <= 0) {
        errors.push({
          field: `participants[${index}].user_id`,
          message: 'Invalid participant user ID',
          code: 'PARTICIPANT_INVALID_USER_ID'
        });
      }

      const aliasValidation = this.validateAlias(participant.alias);
      if (!aliasValidation.isValid) {
        aliasValidation.errors.forEach(error => {
          errors.push({
            field: `participants[${index}].alias`,
            message: error.message,
            code: error.code
          });
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate match result update
   */
  validateMatchResult(data: {
    matchId: number;
    tournamentId: number;
    winnerId: number;
    player1Score: number;
    player2Score: number;
    player1Id: number;
    player2Id: number;
    currentMatchStatus: string;
    duration?: number;
  }): ValidationResult {
    const errors: ValidationError[] = [];

    // Match ID validation
    if (!data.matchId || data.matchId <= 0) {
      errors.push({
        field: 'matchId',
        message: 'Valid match ID is required',
        code: 'MATCH_ID_INVALID'
      });
    }

    // Winner validation
    if (!data.winnerId || data.winnerId <= 0) {
      errors.push({
        field: 'winnerId',
        message: 'Valid winner ID is required',
        code: 'WINNER_ID_INVALID'
      });
    } else if (data.winnerId !== data.player1Id && data.winnerId !== data.player2Id) {
      errors.push({
        field: 'winnerId',
        message: 'Winner must be one of the match participants',
        code: 'WINNER_NOT_PARTICIPANT'
      });
    }

    // Score validation
    if (data.player1Score < 0 || data.player2Score < 0) {
      errors.push({
        field: 'scores',
        message: 'Scores cannot be negative',
        code: 'NEGATIVE_SCORES'
      });
    }

    if (data.player1Score > 11 || data.player2Score > 11) {
      errors.push({
        field: 'scores',
        message: 'Scores cannot exceed 11',
        code: 'SCORES_TOO_HIGH'
      });
    }

    // Winner must have won
    const winnerScore = data.winnerId === data.player1Id ? data.player1Score : data.player2Score;
    const loserScore = data.winnerId === data.player1Id ? data.player2Score : data.player1Score;

    if (winnerScore <= loserScore) {
      errors.push({
        field: 'scores',
        message: 'Winner must have higher score than loser',
        code: 'INVALID_WINNER_SCORE'
      });
    }

    // For standard Pong, winner should have 11 points (unless forfeit)
    if (winnerScore < 11 && data.duration !== 0) {
      errors.push({
        field: 'scores',
        message: 'Match winner should have 11 points',
        code: 'INCOMPLETE_MATCH'
      });
    }

    // Match status validation
    if (data.currentMatchStatus === 'completed') {
      errors.push({
        field: 'match',
        message: 'Match is already completed',
        code: 'MATCH_ALREADY_COMPLETED'
      });
    }

    if (data.currentMatchStatus === 'cancelled') {
      errors.push({
        field: 'match',
        message: 'Cannot update cancelled match',
        code: 'MATCH_CANCELLED'
      });
    }

    // Duration validation (if provided)
    if (data.duration !== undefined) {
      if (data.duration < 0) {
        errors.push({
          field: 'duration',
          message: 'Duration cannot be negative',
          code: 'NEGATIVE_DURATION'
        });
      }

      if (data.duration > 3600) { // 1 hour max
        errors.push({
          field: 'duration',
          message: 'Duration cannot exceed 1 hour',
          code: 'DURATION_TOO_LONG'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate alias format and content
   */
  validateAlias(alias: string): ValidationResult {
    const errors: ValidationError[] = [];

    if (!alias || alias.trim().length === 0) {
      errors.push({
        field: 'alias',
        message: 'Alias is required',
        code: 'ALIAS_REQUIRED'
      });
      return { isValid: false, errors };
    }

    const trimmedAlias = alias.trim();

    // Length validation
    if (trimmedAlias.length < 2) {
      errors.push({
        field: 'alias',
        message: 'Alias must be at least 2 characters long',
        code: 'ALIAS_TOO_SHORT'
      });
    }

    if (trimmedAlias.length > 50) {
      errors.push({
        field: 'alias',
        message: 'Alias cannot exceed 50 characters',
        code: 'ALIAS_TOO_LONG'
      });
    }

    // Character validation - only letters, numbers, underscores, and hyphens
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedAlias)) {
      errors.push({
        field: 'alias',
        message: 'Alias can only contain letters, numbers, underscores, and hyphens',
        code: 'ALIAS_INVALID_CHARACTERS'
      });
    }

    // Must start with letter or number (not underscore or hyphen)
    if (!/^[a-zA-Z0-9]/.test(trimmedAlias)) {
      errors.push({
        field: 'alias',
        message: 'Alias must start with a letter or number',
        code: 'ALIAS_INVALID_START'
      });
    }

    // Cannot be all numbers (to avoid confusion with IDs)
    if (/^\d+$/.test(trimmedAlias)) {
      errors.push({
        field: 'alias',
        message: 'Alias cannot be only numbers',
        code: 'ALIAS_ONLY_NUMBERS'
      });
    }

    // Reserved words
    const reservedWords = ['admin', 'system', 'bot', 'null', 'undefined', 'guest', 'anonymous'];
    if (reservedWords.includes(trimmedAlias.toLowerCase())) {
      errors.push({
        field: 'alias',
        message: 'This alias is reserved and cannot be used',
        code: 'ALIAS_RESERVED'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate bracket integrity
   */
  validateBracket(bracket: TournamentBracket): ValidationResult {
    const errors: ValidationError[] = [];

    // Basic bracket validation
    if (!bracket.rounds || bracket.rounds.length === 0) {
      errors.push({
        field: 'bracket.rounds',
        message: 'Bracket must have at least one round',
        code: 'BRACKET_NO_ROUNDS'
      });
      return { isValid: false, errors };
    }

    // Validate participants
    if (!bracket.participants || bracket.participants.length < 2) {
      errors.push({
        field: 'bracket.participants',
        message: 'Bracket must have at least 2 participants',
        code: 'BRACKET_INSUFFICIENT_PARTICIPANTS'
      });
    }

    // Validate round structure
    bracket.rounds.forEach((round, roundIndex) => {
      if (round.round !== roundIndex + 1) {
        errors.push({
          field: `bracket.rounds[${roundIndex}]`,
          message: `Round ${roundIndex + 1} has incorrect round number: ${round.round}`,
          code: 'BRACKET_ROUND_NUMBER_MISMATCH'
        });
      }

      // Validate matches in round
      round.matches.forEach((match, matchIndex) => {
        if (match.round !== round.round) {
          errors.push({
            field: `bracket.rounds[${roundIndex}].matches[${matchIndex}]`,
            message: `Match has incorrect round number: ${match.round}`,
            code: 'BRACKET_MATCH_ROUND_MISMATCH'
          });
        }

        // First round must have real players
        if (round.round === 1) {
          if (!match.player1) {
            errors.push({
              field: `bracket.rounds[${roundIndex}].matches[${matchIndex}]`,
              message: 'First round matches must have player1',
              code: 'BRACKET_MISSING_PLAYER1'
            });
          }
        }

        // Completed matches must have winner
        if (match.status === 'completed' && !match.winner) {
          errors.push({
            field: `bracket.rounds[${roundIndex}].matches[${matchIndex}]`,
            message: 'Completed match must have a winner',
            code: 'BRACKET_COMPLETED_NO_WINNER'
          });
        }

        // Winner must be one of the players
        if (match.winner && match.player1 && match.player2) {
          if (match.winner.user_id !== match.player1.user_id && 
              match.winner.user_id !== match.player2.user_id) {
            errors.push({
              field: `bracket.rounds[${roundIndex}].matches[${matchIndex}]`,
              message: 'Match winner must be one of the participants',
              code: 'BRACKET_INVALID_WINNER'
            });
          }
        }
      });
    });

    // Validate tournament completion state
    if (bracket.isComplete) {
      if (!bracket.winner) {
        errors.push({
          field: 'bracket.winner',
          message: 'Completed tournament must have a winner',
          code: 'BRACKET_COMPLETED_NO_WINNER'
        });
      }

      const finalRound = bracket.rounds[bracket.rounds.length - 1];
      if (!finalRound.isComplete) {
        errors.push({
          field: 'bracket.finalRound',
          message: 'Final round must be complete if tournament is complete',
          code: 'BRACKET_INCOMPLETE_FINAL_ROUND'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Helper function to check if number is power of 2
   */
  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }
}