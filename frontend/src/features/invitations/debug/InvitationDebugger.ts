// 🔧 Debug utilities for invitation system
import { gameInviteService } from '../services/GameInviteService';
import { kissInviteButtons } from '../utils/kissInvites';

export class InvitationDebugger {
  static attachToWindow(): void {
    // Expose debug tools to window for browser console access
    (window as any).invitationDebug = {
      // Service status
      getServiceStatus: () => InvitationDebugger.getServiceStatus(),

      // Button analysis
      analyzeButtons: () => InvitationDebugger.analyzeButtons(),

      // Force operations
      forceScan: () => kissInviteButtons.forceScan(),
      forceReconnect: () => gameInviteService.forceReconnect(),

      // Test invitation
      testInvite: (userId: number) => InvitationDebugger.testInvite(userId),

      // Connection tests
      testConnection: () => InvitationDebugger.testConnection(),

      // Get stats
      getStats: () => kissInviteButtons.getStats(),

      // Complete system check
      fullDiagnosis: () => InvitationDebugger.fullDiagnosis()
    };

    console.log('🔧 InvitationDebugger: Debug tools attached to window.invitationDebug');
  }

  static getServiceStatus(): any {
    const status = {
      connected: gameInviteService.isConnected(),
      webSocketState: (gameInviteService as any).ws?.readyState,
      isAuthenticated: (gameInviteService as any).isAuthenticated,
      pendingMessages: (gameInviteService as any).pendingMessages?.length || 0,
      hasExternalHandler: !!(gameInviteService as any).externalWsHandler,
      currentUrl: window.location.pathname
    };

    console.log('📊 Service Status:', status);
    return status;
  }

  static analyzeButtons(): any {
    const allButtons = document.querySelectorAll('[data-invite-user]');
    const setupButtons = document.querySelectorAll('[data-kiss-setup="true"]');
    const unsetupButtons = document.querySelectorAll('[data-invite-user]:not([data-kiss-setup])');

    const analysis = {
      totalButtons: allButtons.length,
      setupButtons: setupButtons.length,
      unsetupButtons: unsetupButtons.length,
      buttons: Array.from(allButtons).map((btn, idx) => ({
        index: idx,
        userId: btn.getAttribute('data-invite-user'),
        username: btn.getAttribute('data-invite-username'),
        isSetup: btn.getAttribute('data-kiss-setup') === 'true',
        element: btn
      }))
    };

    console.log('🔍 Button Analysis:', analysis);
    return analysis;
  }

  static testInvite(userId: number): void {
    console.log(`🧪 Testing invitation to user ${userId}...`);

    try {
      gameInviteService.sendInvite(userId);
      console.log('✅ Test invite sent successfully');
    } catch (error) {
      console.error('❌ Test invite failed:', error);
    }
  }

  static testConnection(): any {
    const ws = (gameInviteService as any).ws;
    const test = {
      hasWebSocket: !!ws,
      webSocketUrl: ws?.url,
      readyState: ws?.readyState,
      readyStateText: InvitationDebugger.getReadyStateText(ws?.readyState),
      isConnected: gameInviteService.isConnected(),
      authToken: !!(localStorage.getItem('authToken') || localStorage.getItem('auth_token'))
    };

    console.log('🔌 Connection Test:', test);
    return test;
  }

  static getReadyStateText(readyState: number | undefined): string {
    switch (readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }

  static fullDiagnosis(): any {
    console.log('🏥 Running full invitation system diagnosis...');

    const diagnosis = {
      timestamp: new Date().toISOString(),
      service: InvitationDebugger.getServiceStatus(),
      buttons: InvitationDebugger.analyzeButtons(),
      connection: InvitationDebugger.testConnection(),
      stats: kissInviteButtons.getStats(),
      dom: {
        bodyChildren: document.body.children.length,
        invitationElements: document.querySelectorAll('[data-invite]').length,
        gameElements: document.querySelectorAll('[data-game]').length
      }
    };

    // Check for common issues
    const issues = [];

    if (!diagnosis.service.connected) {
      issues.push('❌ GameInviteService not connected');
    }

    if (diagnosis.buttons.unsetupButtons > 0) {
      issues.push(`⚠️ ${diagnosis.buttons.unsetupButtons} buttons not setup by KISS system`);
    }

    if (!diagnosis.connection.authToken) {
      issues.push('❌ No auth token found');
    }

    if (diagnosis.buttons.totalButtons === 0) {
      issues.push('⚠️ No invitation buttons found in DOM');
    }

    diagnosis.issues = issues;

    console.log('🏥 Full Diagnosis:', diagnosis);

    if (issues.length === 0) {
      console.log('✅ No issues detected - system should be working correctly');
    } else {
      console.log('⚠️ Issues detected:', issues);
    }

    return diagnosis;
  }

  static createTestButton(userId: number = 999, username: string = 'testuser'): HTMLButtonElement {
    const button = document.createElement('button');
    button.setAttribute('data-invite-user', userId.toString());
    button.setAttribute('data-invite-username', username);
    button.textContent = `Test Invite ${username}`;
    button.style.cssText = 'padding: 10px; margin: 5px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';

    // Add to body for testing
    document.body.appendChild(button);

    console.log(`🧪 Test button created for user ${userId} (${username})`);

    // Force a scan to pick up the new button
    setTimeout(() => kissInviteButtons.forceScan(), 100);

    return button;
  }

  static removeTestButtons(): void {
    const testButtons = document.querySelectorAll('[data-invite-user="999"]');
    testButtons.forEach(btn => btn.remove());
    console.log(`🧹 Removed ${testButtons.length} test buttons`);
  }
}

// Auto-attach in development
if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => InvitationDebugger.attachToWindow(), 2000);
  });
}