// Interface unifiée pour les invitations de jeu
export interface GameInvite {
  id?: number;                    // ID de la base de données (optionnel pour les invites reçues via WebSocket)
  inviteId: string;              // ID unique de l'invitation
  sender_id?: number;            // ID de l'expéditeur (pour compatibilité DB)
  fromUserId: number;            // ID de l'expéditeur (pour WebSocket)
  receiver_id?: number;          // ID du destinataire (optionnel)
  status?: 'pending' | 'accepted' | 'declined' | 'expired'; // Statut (optionnel pour WebSocket)
  created_at?: string;           // Date de création (optionnel)
  expires_at?: string;           // Date d'expiration format string (DB)
  expiresAt: number;             // Date d'expiration format timestamp (WebSocket)
  sender_username?: string;      // Nom d'utilisateur de l'expéditeur (DB)
  fromUsername: string;          // Nom d'utilisateur de l'expéditeur (WebSocket)
  sender_avatar?: string;        // Avatar de l'expéditeur (optionnel)
}

// Interface pour les données de réponse à une invitation
export interface GameInviteResponse {
  action: 'accept' | 'decline';
  inviteId: string;
  responderId: number;
  responderUsername: string;
}

// Interface pour les données de démarrage de jeu
export interface GameStartData {
  gameId: number;
  opponent: {
    id: number;
    username: string;
    avatar: string;
  };
  playerSide: 'left' | 'right';
}