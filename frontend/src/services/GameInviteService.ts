// 🎯 KISS Game Invite Service - Tout en WebSocket
export class GameInviteService {
  private ws: WebSocket | null = null;
  private onInviteReceived?: (invite: SimpleInvite) => void;

  constructor() {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket('ws://localhost:8000/ws');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'game_invite' && this.onInviteReceived) {
        this.onInviteReceived(data);
      }
      
      if (data.type === 'game_start') {
        window.location.href = `/game/${data.gameId}`;
      }
    };
  }

  // 📤 Envoyer invitation (simple message WebSocket)
  sendInvite(userId: number): void {
    if (!this.ws) return;
    
    this.ws.send(JSON.stringify({
      type: 'send_invite',
      to: userId
    }));
  }

  // ✅ Répondre à invitation
  respondToInvite(inviteId: string, accept: boolean): void {
    if (!this.ws) return;
    
    this.ws.send(JSON.stringify({
      type: 'respond_invite',
      inviteId,
      accept
    }));
  }

  // 🎧 Écouter les invitations
  onInvite(callback: (invite: SimpleInvite) => void): void {
    this.onInviteReceived = callback;
  }
}

interface SimpleInvite {
  id: string;
  from: string;
  fromId: number;
}

// Export singleton
export const gameInvites = new GameInviteService();