// 🔍 Debug Tools pour diagnostiquer les problèmes d'invitations
import { invitationService } from '../services/InvitationService';
import { invitationStore } from '../core/InvitationStore';
import { webSocketManager } from '../core/WebSocketManager';
import { kissInvites } from '../utils/kissInvites';

export class InvitationDebug {
  private static instance: InvitationDebug;
  
  static getInstance(): InvitationDebug {
    if (!InvitationDebug.instance) {
      InvitationDebug.instance = new InvitationDebug();
    }
    return InvitationDebug.instance;
  }

  // 📊 Diagnostic complet du système
  diagnoseFull(): void {
    console.log('🔍 === INVITATION SYSTEM DIAGNOSTIC ===');
    
    this.diagnoseWebSocketManager();
    this.diagnoseInvitationStore();
    this.diagnoseInvitationService();
    this.diagnoseKissInvites();
    this.diagnoseConnections();
    
    console.log('🔍 === END DIAGNOSTIC ===');
  }

  private diagnoseWebSocketManager(): void {
    console.log('📡 WebSocketManager Status:');
    
    const connectionInfo = webSocketManager.getConnectionInfo();
    console.log('  - Connection State:', connectionInfo.state);
    console.log('  - Authenticated:', connectionInfo.authenticated);
    console.log('  - Reconnect Attempts:', connectionInfo.reconnectAttempts);
    console.log('  - Circuit State:', connectionInfo.circuitState);
    console.log('  - Queue Size:', connectionInfo.queueSize);
  }

  private diagnoseInvitationStore(): void {
    console.log('📦 InvitationStore Status:');
    
    const connectionState = invitationStore.getConnectionState();
    console.log('  - Connection State:', connectionState.state);
    console.log('  - Last Error:', connectionState.error);
    console.log('  - Is Connected:', invitationStore.isConnected());
    
    const receivedInvites = invitationStore.getReceivedInvites();
    const sentInvites = invitationStore.getSentInvites();
    console.log('  - Received Invites:', receivedInvites.length);
    console.log('  - Sent Invites:', sentInvites.length);
  }

  private diagnoseInvitationService(): void {
    console.log('🎯 InvitationService Status:');
    
    const connectionState = invitationService.getConnectionState();
    console.log('  - Connected:', connectionState.connected);
    console.log('  - Connection Info:', connectionState.info);
    
    const stats = invitationService.getStats();
    console.log('  - Stats:', stats);
  }

  private diagnoseKissInvites(): void {
    console.log('💋 KissInvites Status:');
    
    const stats = kissInvites.getStats();
    console.log('  - System Stats:', stats.system);
    console.log('  - Service Stats:', stats.service);
    console.log('  - Button Stats:', stats.buttons);
  }

  private diagnoseConnections(): void {
    console.log('🔌 Connection Analysis:');
    
    // Compter les connexions WebSocket ouvertes
    let wsCount = 0;
    try {
      // This is a hack to count WebSocket connections, not reliable
      console.log('  - Active WebSocket connections: Cannot reliably count from client-side');
    } catch (e) {
      console.log('  - Cannot count WebSocket connections');
    }
    
    // Vérifier les tokens
    const authToken = localStorage.getItem('authToken');
    const auth_token = localStorage.getItem('auth_token');
    console.log('  - authToken present:', !!authToken);
    console.log('  - auth_token present:', !!auth_token);
    
    // Vérifier le path actuel
    console.log('  - Current path:', window.location.pathname);
  }

  // 🧪 Tester l'envoi d'une invitation
  async testInviteSend(userId: number): Promise<void> {
    console.log(`🧪 Testing invite send to user ${userId}`);
    
    try {
      const result = await invitationService.sendInvite(userId);
      console.log('✅ Invite send result:', result);
    } catch (error) {
      console.error('❌ Invite send error:', error);
    }
  }

  // 🎯 Simuler la réception d'une invitation (pour test)
  simulateInviteReceived(fromUserId: number, fromUsername: string): void {
    console.log('🧪 Simulating invite reception...');
    
    const fakeInvite = {
      inviteId: `test_${Date.now()}`,
      fromUserId,
      fromUsername,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    
    console.log('📨 Simulating:', fakeInvite);
    invitationStore.addReceivedInvite(fakeInvite);
  }

  // 🔄 Forcer la reconnexion de tous les systèmes
  forceReconnectAll(): void {
    console.log('🔄 Forcing reconnection of all WebSocket systems...');
    
    try {
      webSocketManager.forceReconnect();
      console.log('✅ WebSocketManager reconnection initiated');
    } catch (error) {
      console.error('❌ WebSocketManager reconnect failed:', error);
    }
  }

  // 📋 Lister tous les event listeners
  listEventListeners(): void {
    console.log('👂 Event Listeners Analysis:');
    console.log('  - This is limited - cannot inspect all listeners from client-side');
    console.log('  - Check browser DevTools > Elements > Event Listeners for complete view');
  }
}

// Export singleton et ajout à window pour debug facile
export const invitationDebug = InvitationDebug.getInstance();

// Ajouter au window pour debug depuis la console
declare global {
  interface Window {
    invitationDebug: InvitationDebug;
  }
}

window.invitationDebug = invitationDebug;