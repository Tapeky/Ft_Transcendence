// ============================================================================
// ConnectionManager.ts - Robust connection handling with automatic reconnection
// ============================================================================

import {
  ConnectionState,
  ReconnectionData,
  NetworkError,
  MessageType,
  GameMessage,
  generateId
} from '../shared/types/OnlineGameTypes';

import { GameProtocol } from './GameProtocol';

// ============================================================================
// Connection Manager Configuration
// ============================================================================

interface ConnectionConfig {
  maxReconnectAttempts: number;
  baseReconnectDelay: number; // Base delay in ms
  maxReconnectDelay: number; // Maximum delay in ms
  backoffMultiplier: number; // Exponential backoff multiplier
  pingInterval: number; // Ping interval in ms
  pongTimeout: number; // How long to wait for pong response
  heartbeatTimeout: number; // Consider connection dead after this time
}

const DEFAULT_CONFIG: ConnectionConfig = {
  maxReconnectAttempts: 5,
  baseReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  backoffMultiplier: 2,
  pingInterval: 5000,
  pongTimeout: 10000,
  heartbeatTimeout: 15000
};

// ============================================================================
// Network Quality Monitor
// ============================================================================

class NetworkQualityMonitor {
  private rttSamples: number[] = [];
  private packetLossSamples: number[] = [];
  private lastPingTime = 0;
  private pingsSent = 0;
  private pongsReceived = 0;

  recordPing(): void {
    this.lastPingTime = Date.now();
    this.pingsSent++;
  }

  recordPong(): number {
    if (this.lastPingTime === 0) return 0;

    const rtt = Date.now() - this.lastPingTime;
    this.rttSamples.push(rtt);
    this.pongsReceived++;

    // Keep only last 10 samples
    if (this.rttSamples.length > 10) {
      this.rttSamples.shift();
    }

    return rtt;
  }

  getAverageRTT(): number {
    if (this.rttSamples.length === 0) return 0;
    return this.rttSamples.reduce((sum, rtt) => sum + rtt, 0) / this.rttSamples.length;
  }

  getJitter(): number {
    if (this.rttSamples.length < 2) return 0;

    const avg = this.getAverageRTT();
    const variance = this.rttSamples.reduce((sum, rtt) => sum + Math.pow(rtt - avg, 2), 0) / this.rttSamples.length;
    return Math.sqrt(variance);
  }

  getPacketLoss(): number {
    if (this.pingsSent === 0) return 0;
    return (this.pingsSent - this.pongsReceived) / this.pingsSent;
  }

  getQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const rtt = this.getAverageRTT();
    const jitter = this.getJitter();
    const loss = this.getPacketLoss();

    if (rtt < 50 && jitter < 10 && loss < 0.01) return 'excellent';
    if (rtt < 100 && jitter < 25 && loss < 0.03) return 'good';
    if (rtt < 200 && jitter < 50 && loss < 0.05) return 'fair';
    return 'poor';
  }

  reset(): void {
    this.rttSamples = [];
    this.packetLossSamples = [];
    this.lastPingTime = 0;
    this.pingsSent = 0;
    this.pongsReceived = 0;
  }
}

// ============================================================================
// Main Connection Manager
// ============================================================================

export class ConnectionManager {
  private ws: WebSocket | null = null;
  private config: ConnectionConfig;
  private state: ConnectionState;
  private networkMonitor: NetworkQualityMonitor;

  // Reconnection state
  private sessionId: string | null = null;
  private playerId: string | null = null;
  private lastSequence = 0;
  private lastStateTimestamp = 0;

  // Timers
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

  // Event handlers
  public onConnected: (() => void) | null = null;
  public onDisconnected: (() => void) | null = null;
  public onReconnected: (() => void) | null = null;
  public onMessage: ((data: ArrayBuffer) => void) | null = null;
  public onError: ((error: NetworkError) => void) | null = null;
  public onNetworkUpdate: ((rtt: number, quality: string) => void) | null = null;

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.networkMonitor = new NetworkQualityMonitor();
    this.state = {
      status: 'disconnected',
      lastPing: 0,
      reconnectAttempts: 0,
      attempts: 0,
      nextRetryDelay: this.config.baseReconnectDelay
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async connect(url: string, sessionId: string, playerId?: string): Promise<WebSocket> {
    this.sessionId = sessionId;
    this.playerId = playerId || generateId();
    this.state.status = 'connecting';

    try {
      this.ws = new WebSocket(url);
      this.setupWebSocketHandlers();

      return new Promise((resolve, reject) => {
        if (!this.ws) {
          reject(new NetworkError('WebSocket is null'));
          return;
        }

        const onOpen = () => {
          this.handleConnectionSuccess();
          cleanup();
          resolve(this.ws!);
        };

        const onError = (error: Event) => {
          this.handleConnectionError(new NetworkError('WebSocket connection failed'));
          cleanup();
          reject(new NetworkError('WebSocket connection failed'));
        };

        const onClose = () => {
          this.handleConnectionError(new NetworkError('WebSocket closed during connection'));
          cleanup();
          reject(new NetworkError('WebSocket closed during connection'));
        };

        const cleanup = () => {
          if (this.ws) {
            this.ws.removeEventListener('open', onOpen);
            this.ws.removeEventListener('error', onError);
            this.ws.removeEventListener('close', onClose);
          }
        };

        this.ws.addEventListener('open', onOpen);
        this.ws.addEventListener('error', onError);
        this.ws.addEventListener('close', onClose);

        // Connection timeout
        setTimeout(() => {
          if (this.state.status === 'connecting') {
            cleanup();
            reject(new NetworkError('Connection timeout'));
          }
        }, 10000); // 10 second timeout
      });

    } catch (error) {
      this.handleConnectionError(new NetworkError(`Connection failed: ${error}`));
      throw error;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.handleConnectionSuccess();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      this.handleConnectionLost(event);
    };

    this.ws.onerror = (error) => {
      this.handleConnectionError(new NetworkError('WebSocket error'));
    };
  }

  private handleConnectionSuccess(): void {
    this.state = {
      status: 'connected',
      lastPing: Date.now(),
      reconnectAttempts: 0,
      attempts: 0,
      nextRetryDelay: this.config.baseReconnectDelay
    };

    this.startHeartbeat();
    this.networkMonitor.reset();

    if (this.onConnected) {
      this.onConnected();
    }

    console.log('✅ Connected to game server');
  }

  private handleMessage(event: MessageEvent): void {
    try {
      // Handle both binary and text messages
      let data: ArrayBuffer;

      if (event.data instanceof ArrayBuffer) {
        data = event.data;
      } else if (event.data instanceof Blob) {
        // Convert blob to ArrayBuffer asynchronously
        event.data.arrayBuffer().then(buffer => {
          this.processMessage(buffer);
        });
        return;
      } else {
        // Assume JSON string for backward compatibility
        const jsonData = JSON.parse(event.data);
        if (jsonData.type === 'pong') {
          this.handlePong();
          return;
        }
        // Convert JSON to binary format
        data = new TextEncoder().encode(event.data).buffer;
      }

      this.processMessage(data);

    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private processMessage(data: ArrayBuffer): void {
    try {
      const message = GameProtocol.decode(data);

      // Handle internal messages
      if (message.type === MessageType.PONG) {
        this.handlePong();
        return;
      }

      // Update sequence tracking
      if (message.sequence && message.sequence > this.lastSequence) {
        this.lastSequence = message.sequence;
      }

      // Forward to game service
      if (this.onMessage) {
        this.onMessage(data);
      }

    } catch (error) {
      console.error('Error decoding message:', error);
    }
  }

  private handleConnectionLost(event: CloseEvent): void {
    this.stopHeartbeat();

    const wasConnected = this.state.status === 'connected';

    if (event.wasClean) {
      // Clean disconnect
      this.state.status = 'disconnected';
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    } else {
      // Unexpected disconnect - attempt reconnection
      this.handleDisconnection();
    }

    console.warn(`🔌 Connection lost: ${event.reason || 'Unknown reason'}`);
  }

  private handleConnectionError(error: NetworkError): void {
    console.error('Connection error:', error);

    if (this.onError) {
      this.onError(error);
    }
  }

  // ============================================================================
  // Reconnection Logic
  // ============================================================================

  handleDisconnection(): void {
    if (this.state.status === 'reconnecting') {
      return; // Already trying to reconnect
    }

    this.state.status = 'reconnecting';
    this.attemptReconnection();
  }

  private attemptReconnection(): void {
    if (this.state.attempts >= this.config.maxReconnectAttempts) {
      this.state.status = 'disconnected';
      this.state.lastError = 'Max reconnection attempts reached';

      if (this.onError) {
        this.onError(new NetworkError('Failed to reconnect after maximum attempts'));
      }

      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.state.attempts++;

    if (process.env.NODE_ENV !== 'test') {
      console.log(`🔄 Reconnection attempt ${this.state.attempts}/${this.config.maxReconnectAttempts}`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.performReconnection();
    }, this.state.nextRetryDelay);

    // Exponential backoff
    this.state.nextRetryDelay = Math.min(
      this.state.nextRetryDelay * this.config.backoffMultiplier,
      this.config.maxReconnectDelay
    );
  }

  private async performReconnection(): Promise<void> {
    if (!this.sessionId) {
      this.handleConnectionError(new NetworkError('No session ID for reconnection'));
      return;
    }

    try {
      const url = this.buildReconnectionUrl();
      await this.connect(url, this.sessionId, this.playerId || undefined);

      // Send reconnection message
      this.sendReconnectionMessage();

      // Reset state
      this.state.attempts = 0;
      this.state.nextRetryDelay = this.config.baseReconnectDelay;

      if (this.onReconnected) {
        this.onReconnected();
      }

      console.log('✅ Reconnected successfully');

    } catch (error) {
      console.warn('Reconnection failed, will retry...', error);
      this.attemptReconnection();
    }
  }

  private buildReconnectionUrl(): string {
    if (!this.sessionId) {
      throw new Error('No session ID available');
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/game/${this.sessionId}?reconnect=true`;
  }

  private sendReconnectionMessage(): void {
    if (!this.isConnected() || !this.sessionId || !this.playerId) return;

    const reconnectionData: ReconnectionData = {
      attempts: this.state.attempts,
      lastAttempt: Date.now(),
      backoffDelay: this.state.nextRetryDelay,
      maxDelay: this.config.maxReconnectDelay,
      sessionId: this.sessionId,
      playerId: this.playerId,
      lastSequence: this.lastSequence,
      lastStateTimestamp: this.lastStateTimestamp,
      timeDisconnected: Date.now()
    };

    const message: GameMessage = {
      id: generateId(),
      type: MessageType.RECONNECT,
      timestamp: Date.now(),
      sequence: ++this.lastSequence,
      sessionId: this.sessionId,
      playerId: this.playerId,
      payload: reconnectionData
    };

    this.sendMessage(message);
  }

  // ============================================================================
  // Heartbeat and Network Monitoring
  // ============================================================================

  private startHeartbeat(): void {
    this.stopHeartbeat();

    // Start ping timer
    this.pingTimer = setInterval(() => {
      this.sendPing();
    }, this.config.pingInterval);

    // Start heartbeat timeout timer
    this.resetHeartbeatTimeout();
  }

  private stopHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private sendPing(): void {
    if (!this.isConnected()) return;

    this.networkMonitor.recordPing();

    const message: GameMessage = {
      id: generateId(),
      type: MessageType.PING,
      timestamp: Date.now(),
      sequence: ++this.lastSequence,
      payload: { clientTime: Date.now() }
    };

    this.sendMessage(message);

    // Set pong timeout
    this.pongTimer = setTimeout(() => {
      console.warn('⚠️  Pong timeout - connection may be unstable');
      this.handleDisconnection();
    }, this.config.pongTimeout);
  }

  private handlePong(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }

    const rtt = this.networkMonitor.recordPong();
    this.resetHeartbeatTimeout();

    // Notify about network updates for lag compensation
    if (this.onNetworkUpdate) {
      const quality = this.networkMonitor.getQuality();
      this.onNetworkUpdate(rtt, quality);
    }

    // Optional: Log network quality periodically
    if (this.lastSequence % 10 === 0 && process.env.NODE_ENV !== 'test') {
      const quality = this.networkMonitor.getQuality();
      console.debug(`📊 Network: ${quality} (RTT: ${rtt.toFixed(1)}ms)`);
    }
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }

    this.heartbeatTimer = setTimeout(() => {
      console.warn('💔 Heartbeat timeout - connection lost');
      this.handleDisconnection();
    }, this.config.heartbeatTimeout);
  }

  // ============================================================================
  // Message Sending
  // ============================================================================

  sendMessage(message: GameMessage): boolean {
    if (!this.isConnected()) {
      console.warn('Cannot send message - not connected');
      return false;
    }

    // Ajouter sessionId et playerId si disponibles
    const fullMessage = {
      ...message,
      sessionId: this.sessionId || undefined,
      playerId: this.playerId || undefined
    };

    try {
      // Validate message size
      if (!GameProtocol.validateMessage(fullMessage)) {
        console.error('Message too large or invalid');
        return false;
      }

      const encoded = GameProtocol.encode(fullMessage);
      this.ws!.send(encoded);

      return true;

    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): ConnectionState {
    return { ...this.state };
  }

  getNetworkQuality() {
    return {
      rtt: this.networkMonitor.getAverageRTT(),
      jitter: this.networkMonitor.getJitter(),
      packetLoss: this.networkMonitor.getPacketLoss(),
      quality: this.networkMonitor.getQuality()
    };
  }

  // Alias for test compatibility
  getNetworkMetrics() {
    const hasData = this.networkMonitor.getAverageRTT() > 0;
    return {
      rtt: this.networkMonitor.getAverageRTT(),
      jitter: this.networkMonitor.getJitter(),
      packetLoss: this.networkMonitor.getPacketLoss(),
      quality: hasData ? this.networkMonitor.getQuality() : 'unknown'
    };
  }

  // For test compatibility - monitoring starts automatically with heartbeat
  startNetworkMonitoring(): void {
    // Monitoring is automatically started when connection is established
    // This method exists for test compatibility
    if (!this.isConnected()) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('📊 Network monitoring will start when connected');
      }
    } else {
      if (process.env.NODE_ENV !== 'test') {
        console.log('📊 Network monitoring already active');
      }
    }
  }

  disconnect(): void {
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.state.status = 'disconnected';
  }

  // Complete cleanup for tests - stops all timers and monitoring
  destroy(): void {
    this.disconnect();
    
    // Clear all event handlers to prevent memory leaks
    this.onConnected = null;
    this.onDisconnected = null;
    this.onReconnected = null;
    this.onMessage = null;
    this.onError = null;
    this.onNetworkUpdate = null;
    
    // Reset network monitor
    this.networkMonitor.reset();
    
    // Reset state
    this.sessionId = null;
    this.playerId = null;
    this.lastSequence = 0;
    this.lastStateTimestamp = 0;
  }

  // Update session info for reconnection
  updateSessionInfo(sessionId: string, playerId?: string): void {
    this.sessionId = sessionId;
    if (playerId) {
      this.playerId = playerId;
    }
  }

  updateSequence(sequence: number): void {
    if (sequence > this.lastSequence) {
      this.lastSequence = sequence;
    }
  }

  updateStateTimestamp(timestamp: number): void {
    this.lastStateTimestamp = timestamp;
  }
}