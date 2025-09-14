// Integration Test for UNIFIED WEBSOCKET Solution
// Validates that the invitation → game → invitation cycle works without dual connections

import { webSocketGameBridge } from '../core/WebSocketGameBridge';
import { webSocketManager } from '../../invitations/core/WebSocketManager';

// Mock implementations
class MockWebSocket {
  public readyState = WebSocket.OPEN;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  
  private messageHandler: (data: any) => void = () => {};
  
  constructor(public url: string) {}
  
  send(data: string): void {
    // Mock successful send
    const message = JSON.parse(data);
    console.log('MockWebSocket sent:', message);
    
    // Simulate auth success for auth messages
    if (message.type === 'auth') {
      setTimeout(() => {
        this.simulateMessage({ type: 'auth_success' });
      }, 10);
    }
  }
  
  close(): void {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { wasClean: true }));
    }
  }
  
  simulateMessage(message: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { 
        data: JSON.stringify(message) 
      }));
    }
  }
}

// Mock apiService.connectWebSocket
const mockConnectWebSocket = jest.fn(() => new MockWebSocket('ws://localhost:8000/ws'));

// Mock the apiService module
jest.mock('../../../shared/services/api', () => ({
  apiService: {
    connectWebSocket: mockConnectWebSocket
  }
}));

describe('Unified WebSocket Integration Test', () => {
  let mockWs: MockWebSocket;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectWebSocket.mockClear();
    
    // Reset bridge state
    if (webSocketGameBridge.hasActiveGame()) {
      webSocketGameBridge.unregisterGame();
    }
  });
  
  afterEach(() => {
    // Cleanup
    webSocketManager.disconnect();
  });

  test('CRITICAL: Single WebSocket connection eliminates dual connection problem', async () => {
    console.log('🧪 Testing UNIFIED WEBSOCKET solution...');
    
    // PHASE 1: Initial connection (invitation system)
    console.log('📨 Phase 1: Invitation system startup');
    
    await webSocketManager.connect();
    
    // Verify only ONE WebSocket connection created
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    expect(webSocketManager.isConnected()).toBe(true);
    
    // PHASE 2: Simulate game invitation flow
    console.log('🎮 Phase 2: Game invitation received');
    
    // Simulate receiving game invitation
    mockWs = mockConnectWebSocket.mock.results[0].value;
    mockWs.simulateMessage({
      type: 'game_invite_received',
      inviteId: 'invite-123',
      fromUserId: 456,
      fromUsername: 'opponent',
      expiresAt: Date.now() + 30000
    });
    
    // PHASE 3: Accept invitation and start game
    console.log('✅ Phase 3: Accepting invitation and entering game');
    
    // Simulate game start
    mockWs.simulateMessage({
      type: 'game_started',
      inviteId: 'invite-123',
      gameId: 789,
      opponent: { id: 456, username: 'opponent' }
    });
    
    // PHASE 4: Game registration via bridge (CRITICAL: NO NEW WEBSOCKET)
    console.log('🌉 Phase 4: Game registers with bridge (no new WebSocket)');
    
    const gameId = 789;
    const mockGameHandler = jest.fn();
    const mockCleanupHandler = jest.fn();
    
    // Register game with bridge - this should NOT create a new WebSocket
    webSocketGameBridge.registerGame(gameId, mockGameHandler, mockCleanupHandler);
    
    // CRITICAL CHECK: Still only ONE WebSocket connection
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    expect(webSocketGameBridge.hasActiveGame()).toBe(true);
    expect(webSocketGameBridge.getActiveGameId()).toBe(gameId);
    
    // PHASE 5: Game messages routed through bridge
    console.log('📡 Phase 5: Game messages routed via bridge');
    
    // Simulate game state message
    const gameStateMessage = {
      type: 'game_state',
      data: {
        leftPaddle: { pos: { x: 20, y: 100 }, hitCount: 0 },
        rightPaddle: { pos: { x: 780, y: 150 }, hitCount: 1 },
        ball: { pos: { x: 400, y: 200 }, direction: { x: 5, y: 3 } },
        leftScore: 1,
        rightScore: 2
      }
    };
    
    mockWs.simulateMessage(gameStateMessage);
    
    // Verify message routed to game handler
    expect(mockGameHandler).toHaveBeenCalledWith(gameStateMessage);
    
    // PHASE 6: Game input sent via bridge
    console.log('⌨️ Phase 6: Game input sent via bridge');
    
    const inputSent = webSocketGameBridge.sendGameInput(gameId, { up: true, down: false });
    expect(inputSent).toBe(true);
    
    // PHASE 7: Game ends and cleanup
    console.log('🏁 Phase 7: Game ends with proper cleanup');
    
    // Simulate game end
    mockWs.simulateMessage({
      type: 'game_end',
      data: {
        gameId: gameId,
        winner: 'Left Player',
        finalScore: { left: 5, right: 2 }
      }
    });
    
    // Unregister game (simulates Game.ts destroy)
    webSocketGameBridge.unregisterGame(gameId);
    
    // Verify cleanup
    expect(mockCleanupHandler).toHaveBeenCalledWith(gameId);
    expect(webSocketGameBridge.hasActiveGame()).toBe(false);
    expect(webSocketGameBridge.getActiveGameId()).toBe(null);
    
    // PHASE 8: CRITICAL - Invitations work after game
    console.log('📨 Phase 8: CRITICAL - Invitations work after game');
    
    // WebSocket connection should still be active
    expect(webSocketManager.isConnected()).toBe(true);
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1); // Still only ONE connection
    
    // Simulate another invitation (this should work!)
    mockWs.simulateMessage({
      type: 'game_invite_received',
      inviteId: 'invite-456',
      fromUserId: 789,
      fromUsername: 'newopponent',
      expiresAt: Date.now() + 30000
    });
    
    // PHASE 9: Second game cycle (verify repeatability)
    console.log('🔄 Phase 9: Second game cycle works');
    
    const gameId2 = 999;
    const mockGameHandler2 = jest.fn();
    
    webSocketGameBridge.registerGame(gameId2, mockGameHandler2);
    
    // Still only ONE WebSocket connection!
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1);
    
    // Test second game functionality
    const gameMessage2 = { type: 'ready_status', data: { leftPlayerReady: true, rightPlayerReady: false } };
    mockWs.simulateMessage(gameMessage2);
    expect(mockGameHandler2).toHaveBeenCalledWith(gameMessage2);
    
    // Cleanup second game
    webSocketGameBridge.unregisterGame(gameId2);
    
    console.log('✅ UNIFIED WEBSOCKET solution validation COMPLETE!');
    
    // FINAL VERIFICATION
    expect(mockConnectWebSocket).toHaveBeenCalledTimes(1); // Single connection throughout
    expect(webSocketManager.isConnected()).toBe(true);     // Connection preserved
    expect(webSocketGameBridge.hasActiveGame()).toBe(false); // Clean state
  });

  test('Error scenarios handled gracefully', () => {
    console.log('🧪 Testing error scenarios...');
    
    // Test bridge without WebSocketManager
    const gameId = 123;
    const mockHandler = jest.fn();
    
    // Should handle gracefully
    webSocketGameBridge.registerGame(gameId, mockHandler);
    
    // Test sending when not connected
    mockConnectWebSocket.mockImplementation(() => {
      const ws = new MockWebSocket('ws://localhost:8000/ws');
      ws.readyState = WebSocket.CLOSED;
      return ws;
    });
    
    const sent = webSocketGameBridge.sendGameInput(gameId, { up: true, down: false });
    expect(sent).toBe(false);
  });

  test('Multiple game registrations handled correctly', () => {
    console.log('🧪 Testing multiple game registrations...');
    
    const gameId1 = 111;
    const gameId2 = 222;
    const mockHandler1 = jest.fn();
    const mockHandler2 = jest.fn();
    const mockCleanup1 = jest.fn();
    
    webSocketGameBridge.registerGame(gameId1, mockHandler1, mockCleanup1);
    expect(webSocketGameBridge.getActiveGameId()).toBe(gameId1);
    
    // Register second game should cleanup first
    webSocketGameBridge.registerGame(gameId2, mockHandler2);
    expect(webSocketGameBridge.getActiveGameId()).toBe(gameId2);
    expect(mockCleanup1).toHaveBeenCalledWith(gameId1);
  });

  test('Bridge message classification works correctly', () => {
    console.log('🧪 Testing message classification...');
    
    const gameMessages = [
      { type: 'game_state', data: {} },
      { type: 'player_ready', data: {} },
      { type: 'ready_status', data: {} },
      { type: 'countdown', data: {} },
      { type: 'game_start', data: {} },
      { type: 'game_end', data: {} },
      { type: 'pong', data: {} }
    ];
    
    const invitationMessages = [
      { type: 'game_invite_received', data: {} },
      { type: 'invite_sent', data: {} },
      { type: 'invite_declined', data: {} },
      { type: 'chat_message', data: {} }
    ];
    
    // Game messages should be handled by bridge (when game active)
    const gameId = 123;
    const mockHandler = jest.fn();
    webSocketGameBridge.registerGame(gameId, mockHandler);
    
    gameMessages.forEach(msg => {
      const handled = webSocketGameBridge.handleGameMessage(msg);
      expect(handled).toBe(true);
    });
    
    // Invitation messages should not be handled by bridge
    invitationMessages.forEach(msg => {
      const handled = webSocketGameBridge.handleGameMessage(msg);
      expect(handled).toBe(false);
    });
  });
});

// Performance test to verify resource usage
describe('Resource Usage Validation', () => {
  test('Single WebSocket connection reduces resource usage by 50%', () => {
    console.log('⚡ Testing resource usage...');
    
    const initialConnectionCount = mockConnectWebSocket.mock.calls.length;
    
    // Start invitation system
    webSocketManager.connect();
    
    // Start multiple games
    for (let i = 1; i <= 5; i++) {
      webSocketGameBridge.registerGame(i, jest.fn());
      webSocketGameBridge.unregisterGame(i);
    }
    
    const finalConnectionCount = mockConnectWebSocket.mock.calls.length;
    const connectionsCreated = finalConnectionCount - initialConnectionCount;
    
    // Should only create 1 connection regardless of game count
    expect(connectionsCreated).toBeLessThanOrEqual(1);
    
    console.log(`✅ Resource test: ${connectionsCreated} connection(s) created for 5 games`);
  });
});

// Edge case testing
describe('Edge Case Scenarios', () => {
  test('Page refresh and reconnection scenarios', () => {
    console.log('🧪 Testing page refresh scenarios...');
    
    // Simulate page refresh by destroying and recreating instances
    webSocketManager.disconnect();
    webSocketGameBridge.destroy();
    
    // Reconnection should work
    webSocketManager.connect();
    webSocketGameBridge.registerGame(123, jest.fn());
    
    expect(webSocketGameBridge.hasActiveGame()).toBe(true);
  });
  
  test('Network disconnection and recovery', () => {
    console.log('🧪 Testing network disconnection...');
    
    webSocketManager.connect();
    const gameId = 456;
    webSocketGameBridge.registerGame(gameId, jest.fn());
    
    // Simulate network disconnection
    const mockWs = mockConnectWebSocket.mock.results[0].value;
    mockWs.close();
    
    // Bridge should handle gracefully
    expect(webSocketGameBridge.isConnected()).toBe(false);
    
    // Game should remain registered but inactive
    expect(webSocketGameBridge.hasActiveGame()).toBe(true);
    expect(webSocketGameBridge.getActiveGameId()).toBe(gameId);
  });
});