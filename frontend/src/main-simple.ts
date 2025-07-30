// 🎯 KISS Main - Initialisation simple
import { gameInvites } from './services/GameInviteService';
import { SimpleInvitePopup } from './components/SimpleInvitePopup';

// 🚀 Démarrage simple
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎯 KISS App starting...');
  
  // Écouter les invitations
  gameInvites.onInvite((invite) => {
    console.log('📨 Invitation received from', invite.from);
    new SimpleInvitePopup(invite);
  });

  // Ajouter boutons d'invitation partout où c'est nécessaire
  addInviteButtons();
});

// 🔘 Ajouter boutons d'invitation simplifiés
function addInviteButtons(): void {
  // Exemple : ajouter aux profils utilisateurs
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // Bouton avec data-invite-user="123"
    if (target.dataset.inviteUser) {
      const userId = parseInt(target.dataset.inviteUser);
      gameInvites.sendInvite(userId);
      
      // Feedback simple
      target.textContent = '⏳ Invite sent...';
      target.style.opacity = '0.5';
      
      setTimeout(() => {
        target.textContent = '🎮 Invite to Play';
        target.style.opacity = '1';
      }, 3000);
    }
  });
}

// 🌍 Disponible globalement pour debug
(window as any).gameInvites = gameInvites;