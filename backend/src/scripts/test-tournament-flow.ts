#!/usr/bin/env ts-node

/**
 * Test Tournament Flow - Complete tournament from creation to completion
 * Tests the entire Phase 1 implementation
 */

import { DatabaseManager } from '../database/DatabaseManager';
import { BracketEngine } from '../game/BracketEngine';
import { TournamentStateMachine, TournamentStatus } from '../game/TournamentStateMachine';
import { TournamentValidator } from '../game/TournamentValidator';
import { TournamentMatchHandler } from '../websocket/TournamentMatchHandler';
import path from 'path';

interface TestPlayer {
  id: number;
  user_id: number;
  alias: string;
  username: string;
}

class TournamentFlowTester {
  private db: DatabaseManager;
  private bracketEngine: BracketEngine;
  private stateMachine: TournamentStateMachine;
  private validator: TournamentValidator;
  private matchHandler: TournamentMatchHandler;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.bracketEngine = new BracketEngine();
    this.stateMachine = new TournamentStateMachine();
    this.validator = new TournamentValidator();
    this.matchHandler = new TournamentMatchHandler();
  }

  async runCompleteTest(): Promise<void> {
    console.log('🏆 Starting Complete Tournament Flow Test');
    console.log('==========================================');

    try {
      // Connect to test database
      const dbPath = path.join(process.env.DB_PATH || './db', 'test_tournament.db');
      await this.db.connect(dbPath);
      await this.db.initialize();

      // Clean up any existing test data
      await this.cleanup();

      // Create test users
      const testUsers = await this.createTestUsers();
      console.log(`✅ Created ${testUsers.length} test users`);

      // Test 1: Tournament Creation
      const tournament = await this.testTournamentCreation();
      console.log(`✅ Tournament created: ID ${tournament.id}`);

      // Test 2: Player Registration
      const participants = await this.testPlayerRegistration(tournament.id, testUsers);
      console.log(`✅ ${participants.length} players registered`);

      // Test 3: Tournament State Management
      await this.testStateTransitions(tournament.id, participants);
      console.log(`✅ State transitions working`);

      // Test 4: Bracket Generation
      const bracket = await this.testBracketGeneration(tournament.id, participants);
      console.log(`✅ Bracket generated with ${bracket.rounds.length} rounds`);

      // Test 5: Match Results and Progression
      const winner = await this.testMatchProgression(tournament.id, bracket);
      console.log(`✅ Tournament completed - Winner: ${winner.alias}`);

      // Test 6: Validation System
      await this.testValidationSystem();
      console.log(`✅ Validation system working`);

      console.log('\n🎉 All Tournament Flow Tests PASSED!');

    } catch (error) {
      console.error('❌ Tournament Flow Test FAILED:', error);
      throw error;
    } finally {
      await this.cleanup();
      await this.db.close();
    }
  }

  private async createTestUsers(): Promise<TestPlayer[]> {
    const users: TestPlayer[] = [];
    const usernames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      const result = await this.db.execute(`
        INSERT INTO users (username, email, password_hash, display_name, data_consent)
        VALUES (?, ?, 'test_hash', ?, true)
      `, [username.toLowerCase(), `${username.toLowerCase()}@test.com`, username]);

      users.push({
        id: i + 1,
        user_id: result.lastID!,
        alias: `${username}_Alias`,
        username: username.toLowerCase()
      });
    }

    return users;
  }

  private async testTournamentCreation(): Promise<any> {
    // Test validation first
    const validationResult = this.validator.validateTournamentCreation({
      name: 'Test Tournament',
      description: 'A test tournament for Phase 1 validation',
      maxPlayers: 8,
      minPlayers: 2,
      createdBy: 1
    });

    if (!validationResult.isValid) {
      throw new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
    }

    // Create tournament
    const result = await this.db.execute(`
      INSERT INTO tournaments (name, description, max_players, min_players, status, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['Test Tournament', 'A test tournament for Phase 1 validation', 8, 2, 'waiting', 1]);

    return {
      id: result.lastID!,
      name: 'Test Tournament',
      max_players: 8,
      min_players: 2,
      status: 'waiting'
    };
  }

  private async testPlayerRegistration(tournamentId: number, users: TestPlayer[]): Promise<TestPlayer[]> {
    const participants: TestPlayer[] = [];

    // Register first 4 players
    for (let i = 0; i < 4; i++) {
      const user = users[i];
      
      // Validate join request
      const validationResult = this.validator.validatePlayerJoin({
        tournamentId,
        userId: user.user_id,
        alias: user.alias,
        tournamentState: {
          id: tournamentId,
          status: TournamentStatus.WAITING,
          participantCount: i,
          maxParticipants: 8,
          minParticipants: 2,
          createdBy: 1
        },
        existingParticipants: participants
      });

      if (!validationResult.isValid) {
        throw new Error(`Player join validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Register player
      await this.db.execute(`
        INSERT INTO tournament_participants (tournament_id, user_id, alias)
        VALUES (?, ?, ?)
      `, [tournamentId, user.user_id, user.alias]);

      participants.push(user);
    }

    // Update tournament participant count
    await this.db.execute(`
      UPDATE tournaments SET current_players = ? WHERE id = ?
    `, [participants.length, tournamentId]);

    return participants;
  }

  private async testStateTransitions(tournamentId: number, participants: TestPlayer[]): Promise<void> {
    // Test state machine
    const tournamentState = {
      id: tournamentId,
      status: TournamentStatus.WAITING,
      participantCount: participants.length,
      maxParticipants: 8,
      minParticipants: 2,
      createdBy: 1
    };

    // Should be able to transition to READY
    const readyTransition = this.stateMachine.transition(tournamentState, TournamentStatus.READY);
    if (!readyTransition.success) {
      throw new Error(`State transition to READY failed: ${readyTransition.error}`);
    }

    // Update state
    tournamentState.status = TournamentStatus.READY;

    // Should be able to start tournament
    const canStart = this.stateMachine.canStart(tournamentState);
    if (!canStart.canStart) {
      throw new Error(`Cannot start tournament: ${canStart.reason}`);
    }

    // Transition to RUNNING
    const runningTransition = this.stateMachine.transition(tournamentState, TournamentStatus.RUNNING);
    if (!runningTransition.success) {
      throw new Error(`State transition to RUNNING failed: ${runningTransition.error}`);
    }
  }

  private async testBracketGeneration(tournamentId: number, participants: TestPlayer[]): Promise<any> {
    // Generate bracket
    const bracket = this.bracketEngine.generateBracket(tournamentId, participants);

    // Validate bracket
    const bracketValidation = this.validator.validateBracket(bracket);
    if (!bracketValidation.isValid) {
      throw new Error(`Bracket validation failed: ${bracketValidation.errors.map(e => e.message).join(', ')}`);
    }

    // Update tournament with bracket data
    await this.db.execute(`
      UPDATE tournaments SET 
        status = 'running',
        bracket_data = ?,
        current_round = ?,
        total_rounds = ?,
        started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(bracket), bracket.currentRound, bracket.rounds.length, tournamentId]);

    // Create database matches for first round
    const firstRound = bracket.rounds[0];
    for (const match of firstRound.matches) {
      if (match.player1 && (match.player2 || match.status === 'bye')) {
        await this.db.execute(`
          INSERT INTO matches (
            tournament_id, player1_id, player2_id, status, game_type, round
          ) VALUES (?, ?, ?, ?, 'pong', ?)
        `, [
          tournamentId,
          match.player1.user_id,
          match.player2?.user_id || null,
          match.status,
          match.round
        ]);
      }
    }

    return bracket;
  }

  private async testMatchProgression(tournamentId: number, initialBracket: any): Promise<TestPlayer> {
    let currentBracket = initialBracket;

    while (!currentBracket.isComplete) {
      // Find next match to complete
      const nextMatch = this.bracketEngine.findNextMatch(currentBracket.rounds);
      if (!nextMatch || !nextMatch.player1) {
        throw new Error('No next match found but tournament not complete');
      }

      // Handle bye matches
      if (!nextMatch.player2) {
        if (nextMatch.status !== 'bye') {
          throw new Error('Match with no player2 should be bye');
        }
        continue;
      }

      // Get match from database
      const dbMatch = await this.db.queryOne(`
        SELECT * FROM matches 
        WHERE tournament_id = ? AND player1_id = ? AND player2_id = ? AND status = 'scheduled'
        LIMIT 1
      `, [tournamentId, nextMatch.player1.user_id, nextMatch.player2.user_id]);

      if (!dbMatch) {
        throw new Error('Match not found in database');
      }

      // Simulate match result (random winner)
      const winner = Math.random() > 0.5 ? nextMatch.player1 : nextMatch.player2;
      const winnerScore = 11;
      const loserScore = Math.floor(Math.random() * 10);

      // Validate match result
      const resultValidation = this.validator.validateMatchResult({
        matchId: dbMatch.id,
        tournamentId,
        winnerId: winner.user_id,
        player1Score: winner === nextMatch.player1 ? winnerScore : loserScore,
        player2Score: winner === nextMatch.player2 ? winnerScore : loserScore,
        player1Id: nextMatch.player1.user_id,
        player2Id: nextMatch.player2.user_id,
        currentMatchStatus: dbMatch.status,
        duration: Math.floor(Math.random() * 600) + 60 // 1-10 minutes
      });

      if (!resultValidation.isValid) {
        throw new Error(`Match result validation failed: ${resultValidation.errors.map(e => e.message).join(', ')}`);
      }

      // Update match result using match handler
      const result = await this.matchHandler.updateMatchResult(tournamentId, {
        matchId: dbMatch.id,
        winnerId: winner.user_id,
        player1Score: winner === nextMatch.player1 ? winnerScore : loserScore,
        player2Score: winner === nextMatch.player2 ? winnerScore : loserScore,
        duration: Math.floor(Math.random() * 600) + 60
      });

      // Get updated bracket
      currentBracket = await this.matchHandler.getTournamentBracket(tournamentId);
      
      console.log(`  Match completed: ${nextMatch.player1.alias} vs ${nextMatch.player2.alias} - Winner: ${winner.alias}`);

      if (result.tournamentComplete) {
        console.log(`  🏆 Tournament completed!`);
        break;
      }
    }

    if (!currentBracket.winner) {
      throw new Error('Tournament completed but no winner found');
    }

    return currentBracket.winner;
  }

  private async testValidationSystem(): Promise<void> {
    // Test various validation scenarios
    
    // Invalid tournament creation
    const invalidTournament = this.validator.validateTournamentCreation({
      name: '', // Invalid: empty name
      maxPlayers: 1, // Invalid: too few players
      minPlayers: 5, // Invalid: min > max
      createdBy: 0 // Invalid: invalid creator ID
    });

    if (invalidTournament.isValid) {
      throw new Error('Validation should have failed for invalid tournament data');
    }

    // Invalid alias
    const invalidAlias = this.validator.validateAlias('');
    if (invalidAlias.isValid) {
      throw new Error('Validation should have failed for empty alias');
    }

    // Invalid match result
    const invalidMatchResult = this.validator.validateMatchResult({
      matchId: 1,
      tournamentId: 1,
      winnerId: 1,
      player1Score: 5, // Invalid: winner should have 11
      player2Score: 10, // Invalid: loser has higher score
      player1Id: 1,
      player2Id: 2,
      currentMatchStatus: 'scheduled'
    });

    if (invalidMatchResult.isValid) {
      throw new Error('Validation should have failed for invalid match result');
    }

    console.log('  All validation tests passed');
  }

  private async cleanup(): Promise<void> {
    try {
      // Clean up test data
      await this.db.execute('DELETE FROM tournament_participants WHERE tournament_id IN (SELECT id FROM tournaments WHERE name = ?)', ['Test Tournament']);
      await this.db.execute('DELETE FROM matches WHERE tournament_id IN (SELECT id FROM tournaments WHERE name = ?)', ['Test Tournament']);
      await this.db.execute('DELETE FROM tournaments WHERE name = ?', ['Test Tournament']);
      await this.db.execute('DELETE FROM users WHERE email LIKE ?', ['%@test.com']);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
async function runTest() {
  const tester = new TournamentFlowTester();
  try {
    await tester.runCompleteTest();
    console.log('\n✅ Phase 1 Tournament System - ALL TESTS PASSED! ✅');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Phase 1 Tournament System - TESTS FAILED! ❌');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}