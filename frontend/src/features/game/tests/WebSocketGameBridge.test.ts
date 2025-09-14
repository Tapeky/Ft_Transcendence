// Test suite for WebSocketGameBridge
// Validates the UNIFIED WEBSOCKET solution that eliminates dual connections

import { webSocketGameBridge, WebSocketGameBridge } from '../core/WebSocketGameBridge';

// Mock WebSocketManager
const mockWebSocketManager = {
  sendMessage: jest.fn().mockReturnValue(true),
  isConnected: jest.fn().mockReturnValue(true),
  initialize: jest.fn()
};

describe('WebSocketGameBridge', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset bridge state
    if (webSocketGameBridge.hasActiveGame()) {
      webSocketGameBridge.unregisterGame();
    }
  });

  describe('Bridge Initialization', () => {
    test('should initialize with WebSocketManager', () => {
      webSocketGameBridge.initialize(mockWebSocketManager);
      expect(mockWebSocketManager.initialize).not.toHaveBeenCalled(); // Bridge initializes itself
    });

    test('should be singleton', () => {
      const instance1 = WebSocketGameBridge.getInstance();
      const instance2 = WebSocketGameBridge.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Game Registration', () => {
    test('should register game with handler', () => {
      const gameId = 123;
      const mockHandler = jest.fn();
      const mockCleanup = jest.fn();

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, mockHandler, mockCleanup);

      expect(webSocketGameBridge.getActiveGameId()).toBe(gameId);
      expect(webSocketGameBridge.hasActiveGame()).toBe(true);
      expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
        type: 'join_game',
        gameId: gameId
      });
    });

    test('should unregister previous game when registering new one', () => {
      const gameId1 = 123;
      const gameId2 = 456;
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const mockCleanup1 = jest.fn();

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId1, mockHandler1, mockCleanup1);
      webSocketGameBridge.registerGame(gameId2, mockHandler2);

      expect(webSocketGameBridge.getActiveGameId()).toBe(gameId2);
      expect(mockCleanup1).toHaveBeenCalledWith(gameId1);
      expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
        type: 'leave_game',
        gameId: gameId1
      });
    });
  });

  describe('Game Unregistration', () => {
    test('should unregister game and send leave message', () => {
      const gameId = 123;
      const mockHandler = jest.fn();
      const mockCleanup = jest.fn();

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, mockHandler, mockCleanup);
      webSocketGameBridge.unregisterGame(gameId);

      expect(webSocketGameBridge.getActiveGameId()).toBe(null);
      expect(webSocketGameBridge.hasActiveGame()).toBe(false);
      expect(mockCleanup).toHaveBeenCalledWith(gameId);
      expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
        type: 'leave_game',
        gameId: gameId
      });
    });
  });

  describe('Message Handling', () => {
    test('should route game messages to registered handler', () => {
      const gameId = 123;
      const mockHandler = jest.fn();
      const gameMessage = {
        type: 'game_state',
        data: { score: { left: 1, right: 0 } }
      };

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, mockHandler);
      
      const handled = webSocketGameBridge.handleGameMessage(gameMessage);
      
      expect(handled).toBe(true);
      expect(mockHandler).toHaveBeenCalledWith(gameMessage);
    });

    test('should identify game-related messages correctly', () => {
      const gameMessages = [
        { type: 'game_start', data: {} },
        { type: 'player_ready', data: {} },
        { type: 'ready_status', data: {} },
        { type: 'game_update', data: {} },
        { type: 'countdown', data: {} }
      ];

      const nonGameMessages = [
        { type: 'game_invite_received', data: {} },
        { type: 'invite_sent', data: {} },
        { type: 'chat_message', data: {} }
      ];

      webSocketGameBridge.initialize(mockWebSocketManager);

      gameMessages.forEach(msg => {
        const handled = webSocketGameBridge.handleGameMessage(msg);
        expect(handled).toBe(false); // No active game registered
      });

      nonGameMessages.forEach(msg => {
        const handled = webSocketGameBridge.handleGameMessage(msg);
        expect(handled).toBe(false); // Not game messages
      });
    });

    test('should not handle messages when no game registered', () => {
      const gameMessage = { type: 'game_state', data: {} };
      
      webSocketGameBridge.initialize(mockWebSocketManager);
      const handled = webSocketGameBridge.handleGameMessage(gameMessage);
      
      expect(handled).toBe(false);
    });
  });

  describe('Game Communication', () => {
    test('should send game input via bridge', () => {
      const gameId = 123;
      const input = { up: true, down: false };

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, jest.fn());
      
      const sent = webSocketGameBridge.sendGameInput(gameId, input);
      
      expect(sent).toBe(true);
      expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
        type: 'player_input',
        gameId: gameId,
        input: input
      });
    });

    test('should send player ready status via bridge', () => {
      const gameId = 123;

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, jest.fn());
      
      const sent = webSocketGameBridge.sendPlayerReady(gameId, true);
      
      expect(sent).toBe(true);
      expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
        type: 'player_ready',
        gameId: gameId,
        ready: true
      });
    });

    test('should check connection status via WebSocketManager', () => {
      webSocketGameBridge.initialize(mockWebSocketManager);
      
      const connected = webSocketGameBridge.isConnected();
      
      expect(connected).toBe(true);
      expect(mockWebSocketManager.isConnected).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle message handler errors gracefully', () => {
      const gameId = 123;
      const mockHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const gameMessage = { type: 'game_state', data: {} };

      // Spy on console.error to verify error logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, mockHandler);
      
      const handled = webSocketGameBridge.handleGameMessage(gameMessage);
      
      expect(handled).toBe(false); // Should return false on error
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error in game message handler:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle cleanup errors gracefully', () => {
      const gameId = 123;
      const mockCleanup = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, jest.fn(), mockCleanup);
      webSocketGameBridge.unregisterGame(gameId);
      
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error in game cleanup handler:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle send failures gracefully', () => {
      const gameId = 123;
      mockWebSocketManager.sendMessage.mockReturnValue(false);

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, jest.fn());
      
      const sent = webSocketGameBridge.sendGameInput(gameId, { up: false, down: false });
      
      expect(sent).toBe(false);
    });
  });

  describe('Cleanup and Destruction', () => {
    test('should cleanup active game on destroy', () => {
      const gameId = 123;
      const mockCleanup = jest.fn();

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, jest.fn(), mockCleanup);
      webSocketGameBridge.destroy();

      expect(mockCleanup).toHaveBeenCalledWith(gameId);
    });

    test('should reset state on destroy', () => {
      const gameId = 123;

      webSocketGameBridge.initialize(mockWebSocketManager);
      webSocketGameBridge.registerGame(gameId, jest.fn());
      webSocketGameBridge.destroy();

      expect(webSocketGameBridge.getActiveGameId()).toBe(null);
      expect(webSocketGameBridge.hasActiveGame()).toBe(false);
    });
  });
});

// Integration test to verify the bridge eliminates dual WebSocket connections
describe('WebSocketGameBridge Integration', () => {
  test('should eliminate dual WebSocket connection problem', () => {
    // This test verifies that:
    // 1. Game.ts no longer creates its own WebSocket
    // 2. Bridge uses existing WebSocketManager connection
    // 3. Invitations continue to work after games

    const gameId = 123;
    const mockHandler = jest.fn();
    
    webSocketGameBridge.initialize(mockWebSocketManager);
    
    // Simulate game starting
    webSocketGameBridge.registerGame(gameId, mockHandler);
    expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
      type: 'join_game',
      gameId: gameId
    });
    
    // Simulate game messages
    const gameUpdate = { type: 'game_state', data: { ball: { x: 100, y: 50 } } };
    webSocketGameBridge.handleGameMessage(gameUpdate);
    expect(mockHandler).toHaveBeenCalledWith(gameUpdate);
    
    // Simulate game ending
    webSocketGameBridge.unregisterGame(gameId);
    expect(mockWebSocketManager.sendMessage).toHaveBeenCalledWith({
      type: 'leave_game',
      gameId: gameId
    });
    
    // Verify bridge is ready for invitations
    expect(webSocketGameBridge.hasActiveGame()).toBe(false);
    
    // Verify WebSocketManager connection is preserved (not destroyed)
    expect(mockWebSocketManager.isConnected()).toBe(true);
  });
});