import { SocketStream } from '@fastify/websocket';

export interface ConnectedUser {
  id: number;
  username: string;
  socket: SocketStream;
}

export class WebSocketManager {
  private static instance: WebSocketManager;
  private connectedUsers: Map<number, ConnectedUser> = new Map();

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  addUser(userId: number, username: string, socket: SocketStream): void {
    console.log(`[WebSocketManager] Ajout de l'utilisateur ${username} (${userId}) aux connexions WebSocket`);
    this.connectedUsers.set(userId, { id: userId, username, socket });
    console.log(`[WebSocketManager] Utilisateurs connectés: ${this.connectedUsers.size}`);
    console.log(`[WebSocketManager] Liste des IDs connectés:`, Array.from(this.connectedUsers.keys()));
  }

  removeUser(userId: number): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      console.log(`[WebSocketManager] Suppression de l'utilisateur ${user.username} (${userId}) des connexions WebSocket`);
      this.connectedUsers.delete(userId);
      console.log(`[WebSocketManager] Utilisateurs connectés: ${this.connectedUsers.size}`);
    }
  }

  sendToUser(userId: number, message: any): boolean {
    console.log(`[WebSocketManager] Tentative d'envoi de message à l'utilisateur ${userId} (type: ${typeof userId})`);
    console.log(`[WebSocketManager] Message:`, JSON.stringify(message, null, 2));
    console.log(`[WebSocketManager] Utilisateurs connectés:`, Array.from(this.connectedUsers.keys()));
    
    // Debug: Vérifier les types des clés stockées
    for (const [key, user] of this.connectedUsers) {
      console.log(`[WebSocketManager] Clé stockée: ${key} (type: ${typeof key}), User: ${user.username} (${user.id})`);
    }
    
    const user = this.connectedUsers.get(userId);
    if (user) {
      console.log(`[WebSocketManager] Utilisateur trouvé: ${user.username} (${user.id})`);
      try {
        const messageStr = JSON.stringify(message);
        console.log(`[WebSocketManager] Envoi du message JSON: ${messageStr}`);
        user.socket.socket.send(messageStr);
        console.log(`[WebSocketManager] ✓ Message envoyé avec succès à ${user.username}`);
        return true;
      } catch (error) {
        console.error(`[WebSocketManager] ✗ Erreur lors de l'envoi du message à ${user.username}:`, error);
        // Error sending message, remove user connection
        this.removeUser(userId);
        return false;
      }
    } else {
      console.log(`[WebSocketManager] ✗ Utilisateur ${userId} non trouvé dans les connexions actives`);
    }
    return false;
  }

  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  getUser(userId: number): ConnectedUser | undefined {
    return this.connectedUsers.get(userId);
  }

  hasUser(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  broadcastToAll(message: any): void {
    const deadConnections: number[] = [];
    
    for (const [userId, user] of this.connectedUsers) {
      try {
        user.socket.socket.send(JSON.stringify(message));
      } catch (error) {
        deadConnections.push(userId);
      }
    }

    // Clean up dead connections
    deadConnections.forEach(userId => this.removeUser(userId));
  }

  getConnectionCount(): number {
    return this.connectedUsers.size;
  }
}