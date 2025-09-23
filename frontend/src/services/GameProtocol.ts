// ============================================================================
// GameProtocol.ts - Optimized binary protocol for game communication
// ============================================================================

import {
  GameMessage,
  MessageType,
  StateUpdateMessage,
  InputMessage,
  GameState
} from '../shared/types/OnlineGameTypes';

// ============================================================================
// Binary Protocol for Efficient Game Communication
// ============================================================================

export class GameProtocol {
  private static readonly PROTOCOL_VERSION = 1;
  private static readonly MAX_MESSAGE_SIZE = 1024;

  /**
   * Encode game message to binary format for efficient transmission
   */
  static encode(message: GameMessage): ArrayBuffer {
    const buffer = new ArrayBuffer(GameProtocol.MAX_MESSAGE_SIZE);
    const view = new DataView(buffer);

    let offset = 0;

    // Protocol header (expandable)
    view.setUint8(offset, GameProtocol.PROTOCOL_VERSION); offset += 1; // Version
    view.setUint8(offset, message.type as unknown as number); offset += 1; // Message type
    view.setUint16(offset, message.sequence || 0, true); offset += 2; // Sequence number (little endian)
    view.setFloat64(offset, message.timestamp, true); offset += 8; // Timestamp (little endian)
    
    // Optional fields flags (4 bytes)
    let flags = 0;
    if (message.sessionId) flags |= 0x01; // sessionId present
    if (message.playerId) flags |= 0x02; // playerId present
    view.setUint32(offset, flags, true); offset += 4;
    
    // Encode optional sessionId
    if (message.sessionId) {
      const sessionIdBytes = new TextEncoder().encode(message.sessionId);
      view.setUint8(offset, sessionIdBytes.length); offset += 1;
      for (let i = 0; i < sessionIdBytes.length; i++) {
        view.setUint8(offset, sessionIdBytes[i]); offset += 1;
      }
    }
    
    // Encode optional playerId  
    if (message.playerId) {
      const playerIdBytes = new TextEncoder().encode(message.playerId);
      view.setUint8(offset, playerIdBytes.length); offset += 1;
      for (let i = 0; i < playerIdBytes.length; i++) {
        view.setUint8(offset, playerIdBytes[i]); offset += 1;
      }
    }

    // Encode payload based on message type
    switch (message.type) {
      case MessageType.STATE_UPDATE:
        offset = this.encodeStateUpdate(view, offset, message as StateUpdateMessage);
        break;

      case MessageType.INPUT:
        offset = this.encodeInput(view, offset, message as InputMessage);
        break;

      case MessageType.PING:
        offset = this.encodePing(view, offset, message);
        break;

      case MessageType.INPUT_ACK:
        offset = this.encodeInputAck(view, offset, message);
        break;

      default:
        // For complex payloads, fall back to JSON
        offset = this.encodeJson(view, offset, message.payload);
        break;
    }

    // Update message length in header
    view.setUint32(12, offset - 16, true); // Payload length

    return buffer.slice(0, offset);
  }

  /**
   * Decode binary message back to game message object
   */
  static decode(data: ArrayBuffer | Uint8Array): GameMessage {
    const buffer = data instanceof ArrayBuffer ? data : data.buffer;
    const view = new DataView(buffer);

    let offset = 0;

    // Read protocol header with optional fields
    const version = view.getUint8(offset); offset += 1;
    const type = view.getUint8(offset) as unknown as MessageType; offset += 1;
    const sequence = view.getUint16(offset, true); offset += 2;
    const timestamp = view.getFloat64(offset, true); offset += 8;
    const flags = view.getUint32(offset, true); offset += 4;

    if (version !== GameProtocol.PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }

    // Decode optional sessionId
    let sessionId: string | undefined;
    if (flags & 0x01) {
      const sessionIdLength = view.getUint8(offset); offset += 1;
      const sessionIdBytes = new Uint8Array(sessionIdLength);
      for (let i = 0; i < sessionIdLength; i++) {
        sessionIdBytes[i] = view.getUint8(offset); offset += 1;
      }
      sessionId = new TextDecoder().decode(sessionIdBytes);
    }

    // Decode optional playerId
    let playerId: string | undefined;
    if (flags & 0x02) {
      const playerIdLength = view.getUint8(offset); offset += 1;
      const playerIdBytes = new Uint8Array(playerIdLength);
      for (let i = 0; i < playerIdLength; i++) {
        playerIdBytes[i] = view.getUint8(offset); offset += 1;
      }
      playerId = new TextDecoder().decode(playerIdBytes);
    }

    // Decode payload based on message type
    let payload: any;

    switch (type) {
      case MessageType.STATE_UPDATE:
        payload = this.decodeStateUpdate(view, offset);
        break;

      case MessageType.INPUT:
        payload = this.decodeInput(view, offset);
        break;

      case MessageType.PING:
        payload = this.decodePing(view, offset);
        break;

      case MessageType.INPUT_ACK:
        payload = this.decodeInputAck(view, offset);
        break;

      default:
        // Fall back to JSON decoding 
        payload = this.decodeJsonPayload(view, offset);
        break;
    }

    return {
      type,
      timestamp,
      sequence,
      sessionId,
      playerId,
      payload
    } as GameMessage;
  }

  // ============================================================================
  // State Update Encoding/Decoding (Most Frequent Message)
  // ============================================================================

  private static encodeStateUpdate(view: DataView, offset: number, message: StateUpdateMessage): number {
    const { gameState, serverTime, acknowledgedInput } = message.payload;

    // Server time (8 bytes)
    view.setFloat64(offset, serverTime, true); offset += 8;

    // Game state (optimized encoding)
    offset = this.encodeGameState(view, offset, gameState);

    // Acknowledged input ID (if present)
    if (acknowledgedInput) {
      view.setUint8(offset, 1); offset += 1; // Has ack flag
      const ackBytes = new TextEncoder().encode(acknowledgedInput);
      view.setUint8(offset, ackBytes.length); offset += 1;
      for (let i = 0; i < ackBytes.length; i++) {
        view.setUint8(offset, ackBytes[i]); offset += 1;
      }
    } else {
      view.setUint8(offset, 0); offset += 1; // No ack flag
    }

    return offset;
  }

  private static decodeStateUpdate(view: DataView, offset: number): any {
    const serverTime = view.getFloat64(offset, true); offset += 8;

    const { gameState, newOffset } = this.decodeGameState(view, offset);
    offset = newOffset;

    const hasAck = view.getUint8(offset); offset += 1;
    let acknowledgedInput: string | undefined;

    if (hasAck) {
      const ackLength = view.getUint8(offset); offset += 1;
      const ackBytes = new Uint8Array(ackLength);
      for (let i = 0; i < ackLength; i++) {
        ackBytes[i] = view.getUint8(offset); offset += 1;
      }
      acknowledgedInput = new TextDecoder().decode(ackBytes);
    }

    return {
      gameState,
      serverTime,
      acknowledgedInput
    };
  }

  // ============================================================================
  // Game State Encoding (Ultra-Compact)
  // ============================================================================

  private static encodeGameState(view: DataView, offset: number, state: GameState): number {
    // Ball position and direction (16 bytes)
    view.setFloat32(offset, state.ball.pos.x, true); offset += 4;
    view.setFloat32(offset, state.ball.pos.y, true); offset += 4;
    view.setFloat32(offset, state.ball.direction.x, true); offset += 4;
    view.setFloat32(offset, state.ball.direction.y, true); offset += 4;

    // Left paddle (12 bytes)
    view.setFloat32(offset, state.leftPaddle.pos.x, true); offset += 4;
    view.setFloat32(offset, state.leftPaddle.pos.y, true); offset += 4;
    view.setUint32(offset, state.leftPaddle.hitCount, true); offset += 4;

    // Right paddle (12 bytes)
    view.setFloat32(offset, state.rightPaddle.pos.x, true); offset += 4;
    view.setFloat32(offset, state.rightPaddle.pos.y, true); offset += 4;
    view.setUint32(offset, state.rightPaddle.hitCount, true); offset += 4;

    // Scores and state (8 bytes)
    view.setUint16(offset, state.leftScore || 0, true); offset += 2;
    view.setUint16(offset, state.rightScore || 0, true); offset += 2;
    view.setUint32(offset, this.encodeGameStateEnum(state.state), true); offset += 4;

    return offset;
  }

  private static decodeGameState(view: DataView, offset: number): { gameState: GameState; newOffset: number } {
    const gameState: GameState = {
      ball: {
        pos: {
          x: view.getFloat32(offset, true),
          y: view.getFloat32(offset + 4, true)
        },
        direction: {
          x: view.getFloat32(offset + 8, true),
          y: view.getFloat32(offset + 12, true)
        }
      },
      leftPaddle: {
        pos: {
          x: view.getFloat32(offset + 16, true),
          y: view.getFloat32(offset + 20, true)
        },
        hitCount: view.getUint32(offset + 24, true)
      },
      rightPaddle: {
        pos: {
          x: view.getFloat32(offset + 28, true),
          y: view.getFloat32(offset + 32, true)
        },
        hitCount: view.getUint32(offset + 36, true)
      },
      leftScore: view.getUint16(offset + 40, true),
      rightScore: view.getUint16(offset + 42, true),
      state: this.decodeGameStateEnum(view.getUint32(offset + 44, true))
    } as GameState;

    return { gameState, newOffset: offset + 48 };
  }

  // ============================================================================
  // Input Message Encoding/Decoding
  // ============================================================================

  private static encodeInput(view: DataView, offset: number, message: InputMessage): number {
    const input = message.payload;

    // Input ID (16 bytes max, variable length)
    const idBytes = new TextEncoder().encode(input.id || '');
    view.setUint8(offset, idBytes.length); offset += 1;
    for (let i = 0; i < idBytes.length; i++) {
      view.setUint8(offset, idBytes[i]); offset += 1;
    }

    // Player ID (16 bytes max, variable length)
    const playerIdBytes = new TextEncoder().encode(input.playerId || '');
    view.setUint8(offset, playerIdBytes.length); offset += 1;
    for (let i = 0; i < playerIdBytes.length; i++) {
      view.setUint8(offset, playerIdBytes[i]); offset += 1;
    }

    // Input data (12 bytes) with safe fallbacks
    view.setFloat64(offset, input.timestamp || Date.now(), true); offset += 8;
    view.setUint16(offset, input.sequenceNumber || 0, true); offset += 2;
    view.setFloat32(offset, input.value || 0, true); offset += 4; // Normalized -1 to 1
    view.setUint8(offset, input.type === 'PADDLE_MOVE' ? 1 : 0); offset += 1;
    view.setUint8(offset, (input as any).up ? 1 : 0); offset += 1;
    view.setUint8(offset, (input as any).down ? 1 : 0); offset += 1;

    return offset;
  }

  private static decodeInput(view: DataView, offset: number): any {
    // Input ID
    const idLength = view.getUint8(offset); offset += 1;
    const idBytes = new Uint8Array(idLength);
    for (let i = 0; i < idLength; i++) {
      idBytes[i] = view.getUint8(offset); offset += 1;
    }
    const id = new TextDecoder().decode(idBytes);

    // Player ID
    const playerIdLength = view.getUint8(offset); offset += 1;
    const playerIdBytes = new Uint8Array(playerIdLength);
    for (let i = 0; i < playerIdLength; i++) {
      playerIdBytes[i] = view.getUint8(offset); offset += 1;
    }
    const playerId = new TextDecoder().decode(playerIdBytes);

    // Input data
    const timestamp = view.getFloat64(offset, true); offset += 8;
    const sequenceNumber = view.getUint16(offset, true); offset += 2;
    const value = view.getFloat32(offset, true); offset += 4;
    const type = view.getUint8(offset) === 1 ? 'PADDLE_MOVE' : 'PADDLE_STOP'; offset += 1;
    const up = view.getUint8(offset) === 1; offset += 1;
    const down = view.getUint8(offset) === 1; offset += 1;

    return {
      id,
      playerId,
      timestamp,
      sequenceNumber,
      value,
      type,
      up,
      down
    };
  }

  // ============================================================================
  // Simple Message Types
  // ============================================================================

  private static encodePing(view: DataView, offset: number, message: GameMessage): number {
    const clientTime = message.payload.clientTime || Date.now();
    view.setFloat64(offset, clientTime, true); offset += 8;
    return offset;
  }

  private static decodePing(view: DataView, offset: number): any {
    return {
      clientTime: view.getFloat64(offset, true)
    };
  }

  private static encodeInputAck(view: DataView, offset: number, message: GameMessage): number {
    const { inputId, serverTime } = message.payload;

    // Input ID
    const idBytes = new TextEncoder().encode(inputId);
    view.setUint8(offset, idBytes.length); offset += 1;
    for (let i = 0; i < idBytes.length; i++) {
      view.setUint8(offset, idBytes[i]); offset += 1;
    }

    // Server time
    view.setFloat64(offset, serverTime, true); offset += 8;

    return offset;
  }

  private static decodeInputAck(view: DataView, offset: number): any {
    // Input ID
    const idLength = view.getUint8(offset); offset += 1;
    const idBytes = new Uint8Array(idLength);
    for (let i = 0; i < idLength; i++) {
      idBytes[i] = view.getUint8(offset); offset += 1;
    }
    const inputId = new TextDecoder().decode(idBytes);

    // Server time
    const serverTime = view.getFloat64(offset, true);

    return { inputId, serverTime };
  }

  // ============================================================================
  // Fallback JSON Encoding for Complex Payloads
  // ============================================================================

  private static encodeJson(view: DataView, offset: number, payload: any): number {
    const jsonString = JSON.stringify(payload);
    const jsonBytes = new TextEncoder().encode(jsonString);

    // Length prefix
    view.setUint32(offset, jsonBytes.length, true); offset += 4;

    // JSON data
    for (let i = 0; i < jsonBytes.length; i++) {
      view.setUint8(offset, jsonBytes[i]); offset += 1;
    }

    return offset;
  }

  private static decodeJson(view: DataView, offset: number, length: number): any {
    const jsonLength = view.getUint32(offset, true); offset += 4;
    const jsonBytes = new Uint8Array(jsonLength);

    for (let i = 0; i < jsonLength; i++) {
      jsonBytes[i] = view.getUint8(offset); offset += 1;
    }

    const jsonString = new TextDecoder().decode(jsonBytes);
    return JSON.parse(jsonString);
  }

  private static decodeJsonPayload(view: DataView, offset: number): any {
    const jsonLength = view.getUint32(offset, true); offset += 4;
    const jsonBytes = new Uint8Array(jsonLength);

    for (let i = 0; i < jsonLength; i++) {
      jsonBytes[i] = view.getUint8(offset); offset += 1;
    }

    const jsonString = new TextDecoder().decode(jsonBytes);
    return JSON.parse(jsonString);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private static encodeGameStateEnum(state: any): number {
    switch (state) {
      case 'Running': return 0;
      case 'Aborted': return 1;
      case 'LeftWins': return 2;
      case 'RightWins': return 3;
      default: return 0;
    }
  }

  private static decodeGameStateEnum(value: number): any {
    switch (value) {
      case 0: return 'Running';
      case 1: return 'Aborted';
      case 2: return 'LeftWins';
      case 3: return 'RightWins';
      default: return 'Running';
    }
  }

  /**
   * Calculate the size of an encoded message without actually encoding it
   */
  static calculateMessageSize(message: GameMessage): number {
    let size = 16; // Header size

    switch (message.type) {
      case MessageType.STATE_UPDATE:
        size += 8 + 48 + 2; // serverTime + gameState + ack flag/length
        const ackInput = (message as StateUpdateMessage).payload.acknowledgedInput;
        if (ackInput) {
          size += ackInput.length;
        }
        break;

      case MessageType.INPUT:
        const input = (message as InputMessage).payload;
        size += 2 + (input.id?.length || 0) + (input.playerId?.length || 0) + 15; // lengths + strings + input data
        break;

      case MessageType.PING:
        size += 8; // clientTime
        break;

      default:
        const jsonSize = JSON.stringify(message.payload).length;
        size += 4 + jsonSize; // length prefix + JSON
        break;
    }

    return size;
  }

  /**
   * Validate message before encoding
   */
  static validateMessage(message: GameMessage): boolean {
    if (!message.type || !message.timestamp || message.sequence === undefined) {
      return false;
    }

    const size = this.calculateMessageSize(message);
    return size <= this.MAX_MESSAGE_SIZE;
  }
}