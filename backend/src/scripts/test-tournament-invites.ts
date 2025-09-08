#!/usr/bin/env ts-node

/**
 * Test Tournament Invitation System
 * Tests automatiques du système d'invitations de tournoi
 */

import { DatabaseManager } from '../database/DatabaseManager';
import { TournamentManager } from '../websocket/TournamentManager';
import { tournamentInvites } from '../websocket/TournamentInvites';
import path from 'path';

interface MockWebSocketManager {
  users: Map<number, any>;
  getUser: (id: number) => any;
  sendToUser: (id: number, message: any) => void;
  sentMessages: Array<{ userId: number; message: any }>;
}

class TournamentInviteSystemTest {
  private db: DatabaseManager;
  private tournamentManager: TournamentManager;
  private mockWsManager: MockWebSocketManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.tournamentManager = TournamentManager.getInstance();
    this.mockWsManager = this.createMockWebSocketManager();
  }

  private createMockWebSocketManager(): MockWebSocketManager {
    const manager: MockWebSocketManager = {
      users: new Map(),
      sentMessages: [],
      getUser: (id: number) => manager.users.get(id),
      sendToUser: (id: number, message: any) => {
        console.log(`📤 Mock message to user ${id}:`, message.type);
        manager.sentMessages.push({ userId: id, message });
      }
    };
    return manager;
  }

  async runCompleteTest(): Promise<void> {
    console.log('🏆 Starting Tournament Invitation System Test');
    console.log('===============================================');

    try {
      // Setup test database
      const dbPath = path.join(__dirname, '../../db/test_tournament_invites.db');
      await this.db.connect(dbPath);
      await this.db.initialize();
      await this.cleanupTestData();

      // Test 1: Créer des utilisateurs test
      const users = await this.createTestUsers();
      console.log(`✅ Created ${users.length} test users`);

      // Simuler connexions WebSocket
      users.forEach(user => {
        this.mockWsManager.users.set(user.id, {
          id: user.id,
          username: user.username,
          socket: { socket: { send: () => {} } }
        });
      });

      // Test 2: Créer et démarrer un tournoi
      const tournament = await this.createTestTournament(users);
      console.log(`✅ Created tournament: ${tournament.name}`);

      // Test 3: Initialiser le système d'invitations
      this.tournamentManager.initializeTournamentInvites(this.mockWsManager);
      tournamentInvites.setWebSocketManager(this.mockWsManager);
      console.log('✅ Tournament invitation system initialized');

      // Test 4: Démarrer le tournoi (doit envoyer des invitations)
      const bracket = await this.tournamentManager.startTournament(tournament.id, users[0].id);
      console.log(`✅ Tournament started - bracket generated with ${bracket.rounds.length} rounds`);

      // Test 5: Vérifier que des invitations ont été envoyées
      await this.waitForInvitations();
      console.log(`✅ Invitations sent: ${this.mockWsManager.sentMessages.length} messages`);

      // Test 6: Simuler acceptation d'invitations
      await this.simulateInviteResponses();
      console.log('✅ Invite responses simulated');

      // Test 7: Vérifier la progression
      await this.verifyTournamentProgression(tournament.id);
      console.log('✅ Tournament progression verified');

      console.log('\n🎉 All Tournament Invitation Tests PASSED!');

    } catch (error) {
      console.error('❌ Tournament Invitation Test FAILED:', error);
      throw error;
    } finally {
      await this.cleanupTestData();
      await this.db.close();
    }
  }

  private async createTestUsers(): Promise<Array<{id: number, username: string}>> {
    const users = [];
    const usernames = ['Alice', 'Bob', 'Charlie', 'Diana'];

    for (let i = 0; i < usernames.length; i++) {
      const username = usernames[i];
      const result = await this.db.execute(`
        INSERT INTO users (username, email, password_hash, display_name, data_consent)
        VALUES (?, ?, 'test_hash', ?, true)
      `, [username.toLowerCase(), `${username.toLowerCase()}@test.com`, username]);

      users.push({
        id: result.lastID as number,
        username: username.toLowerCase()
      });
    }

    return users;
  }

  private async createTestTournament(users: Array<{id: number, username: string}>): Promise<any> {
    // Créer le tournoi
    const result = await this.db.execute(`
      INSERT INTO tournaments (name, description, max_players, created_by, status)
      VALUES (?, ?, ?, ?, 'open')
    `, ['Test Tournament Invites', 'Test tournament for invitation system', 8, users[0].id]);

    const tournamentId = result.lastID as number;

    // Inscrire les participants
    for (const user of users) {
      await this.db.execute(`
        INSERT INTO tournament_participants (tournament_id, user_id, alias)
        VALUES (?, ?, ?)
      `, [tournamentId, user.id, `${user.username}_alias`]);
    }

    return {
      id: tournamentId,
      name: 'Test Tournament Invites',
      max_players: 8
    };
  }

  private async waitForInvitations(): Promise<void> {
    // Attendre un peu que les invitations soient envoyées
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const inviteMessages = this.mockWsManager.sentMessages.filter(
      m => m.message.type === 'tournament_match_invitation'
    );
    
    if (inviteMessages.length === 0) {
      throw new Error('No tournament invitations were sent');
    }
    
    console.log(`📤 Found ${inviteMessages.length} tournament invitations`);
  }

  private async simulateInviteResponses(): Promise<void> {
    const inviteMessages = this.mockWsManager.sentMessages.filter(
      m => m.message.type === 'tournament_match_invitation'
    );

    for (const msgData of inviteMessages) {
      const inviteId = msgData.message.inviteId;
      const userId = msgData.userId;
      
      console.log(`🤖 Simulating accept from user ${userId} for invite ${inviteId}`);
      
      // Simuler acceptation
      await tournamentInvites.handleTournamentInviteResponse(userId, inviteId, true);
      
      // Petit délai entre les réponses
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async verifyTournamentProgression(tournamentId: number): Promise<void> {
    // Vérifier qu'il y a des matches en cours ou complétés
    const matches = await this.db.query(`
      SELECT * FROM matches 
      WHERE tournament_id = ? AND status IN ('in_progress', 'completed')
    `, [tournamentId]);

    if (matches.length === 0) {
      throw new Error('No matches were started after invitations');
    }

    console.log(`📊 Found ${matches.length} matches in progress/completed`);
  }

  private async cleanupTestData(): Promise<void> {
    try {
      await this.db.execute('DELETE FROM tournament_participants WHERE tournament_id IN (SELECT id FROM tournaments WHERE name LIKE ?)', ['Test Tournament%']);
      await this.db.execute('DELETE FROM matches WHERE tournament_id IN (SELECT id FROM tournaments WHERE name LIKE ?)', ['Test Tournament%']);
      await this.db.execute('DELETE FROM tournaments WHERE name LIKE ?', ['Test Tournament%']);
      await this.db.execute('DELETE FROM users WHERE email LIKE ?', ['%@test.com']);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Run the test
async function runTest() {
  const tester = new TournamentInviteSystemTest();
  try {
    await tester.runCompleteTest();
    console.log('\n✅ Tournament Invitation System - ALL TESTS PASSED! ✅');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tournament Invitation System - TESTS FAILED! ❌');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}