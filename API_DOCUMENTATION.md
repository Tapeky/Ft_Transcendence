# 📚 ft_transcendence - API Documentation

**Base URL:** `https://localhost:8000`  
**Auth:** `Authorization: Bearer <token>` (marked with [AUTH])

## 📑 Table des matières
- [🔐 Authentication](#-authentication)
- [👥 Users](#-users)
- [👨‍👩‍👧‍👦 Friends](#-friends)
- [🎭 Avatars](#-avatars)
- [🏆 Tournaments](#-tournaments)
- [⚔️ Matches](#️-matches)
- [👤 Profile](#-profile)
- [🔧 System](#-system)
- [🧪 Quick Examples](#-quick-examples)

---
-> = INPUT  
<- = OUTPUT

## 🔐 Authentication

### POST /api/auth/register
*Créer un nouveau compte utilisateur*  
-> `{"username": <string>, "email": <string>, "password": <string>, "display_name": <string?>, "data_consent": <boolean>}`  
<- `{"success": true, "data": {"user": {...}, "token": <string>}, "message": "Compte créé avec succès"}` || `{"error": "Email déjà utilisé"}`

### POST /api/auth/login
*Se connecter avec email/password*  
-> `{"email": <string>, "password": <string>}`  
<- `{"success": true, "data": {"user": {...}, "token": <string>}, "message": "Connexion réussie"}` || `{"error": "Email ou mot de passe incorrect"}`

### POST /api/auth/logout [AUTH]
*Se déconnecter et mettre le statut offline*  
-> `{}`  
<- `{"success": true, "message": "Déconnexion réussie"}`

### GET /api/auth/me [AUTH]
*Récupérer les infos de l'utilisateur connecté*  
<- `{"success": true, "data": {"id": <number>, "username": <string>, "email": <string>, "display_name": <string>, "avatar_url": <string>, "stats": {...}}}`

### PUT /api/auth/profile [AUTH]
*Modifier son display_name ou avatar_url*  
-> `{"display_name": <string?>, "avatar_url": <string?>}`  
<- `{"success": true, "data": {"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>}, "message": "Profil mis à jour avec succès"}`

### PUT /api/auth/password [AUTH]
*Changer son mot de passe*  
-> `{"current_password": <string>, "new_password": <string>}`  
<- `{"success": true, "message": "Mot de passe changé avec succès"}` || `{"error": "Mot de passe actuel incorrect"}`

### DELETE /api/auth/account [AUTH]
*Supprimer définitivement son compte (GDPR)*  
-> `{"password": <string>, "confirm_deletion": <boolean>}`  
<- `{"success": true, "message": "Compte supprimé avec succès"}` || `{"error": "Mot de passe incorrect"}`

### GET /api/auth/github
*Authentification via GitHub OAuth*  
<- `Redirect to GitHub OAuth`

### GET /api/auth/google
*Authentification via Google OAuth*  
<- `Redirect to Google OAuth`

---

## 👥 Users

### GET /api/users/search?q=<string>&limit=<number> [AUTH]
*Rechercher des utilisateurs par nom/username*  
<- `{"success": true, "data": [{"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "is_online": <boolean>, "total_wins": <number>, "total_losses": <number>}]}`

### GET /api/users/leaderboard?limit=<number>
*Classement des meilleurs joueurs par victoires*  
<- `{"success": true, "data": [{"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "total_wins": <number>, "total_losses": <number>, "win_rate": <number>}]}`

### GET /api/users/online [AUTH]
*Liste des utilisateurs actuellement en ligne*  
<- `{"success": true, "data": [{"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "is_online": true}]}`

### GET /api/users/:id [AUTH]
*Voir le profil public d'un utilisateur*  
<- `{"success": true, "data": {"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "is_online": <boolean>, "created_at": <string>, "stats": {...}}}` || `{"error": "Utilisateur non trouvé"}`

---

## 👨‍👩‍👧‍👦 Friends

### POST /api/friends/request [AUTH]
*Envoyer une demande d'ami à un utilisateur*  
-> `{"friend_id": <number>}`  
<- `{"success": true, "message": "Demande d'amis envoyé avec succès", "data": {"id": <number>, "friend_id": <number>, "status": "pending"}}` || `{"error": "Vous ne pouvez pas vous ajouter vous-même en ami"}`

### PUT /api/friends/accept/:id [AUTH]
*Accepter une demande d'ami reçue*  
<- `{"success": true, "message": "Demande d'ami accepté avec succès"}` || `{"error": "Demande d'ami non trouvée"}`

### PUT /api/friends/decline/:id [AUTH]
*Refuser une demande d'ami reçue*  
<- `{"success": true, "message": "Demande d'ami refusée avec succès"}` || `{"error": "Demande d'ami non trouvée"}`

### DELETE /api/friends/:id [AUTH]
*Supprimer un ami de sa liste*  
<- `{"success": true, "message": "Ami supprimé avec succès"}` || `{"error": "Amitié non trouvée"}`

### GET /api/friends [AUTH]
*Récupérer sa liste d'amis*  
<- `{"success": true, "data": [{"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "is_online": <boolean>, "total_wins": <number>, "total_losses": <number>}], "message": "Liste d'amis récupéré avec succès"}`

### GET /api/friends/requests [AUTH]
*Voir les demandes d'amis reçues*  
<- `{"success": true, "data": [{"id": <number>, "created_at": <string>, "user_id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "is_online": <boolean>}], "message": "Demandes d'amis reçues récupéré avec succès"}`

### GET /api/friends/sent [AUTH]
*Voir les demandes d'amis envoyées*  
<- `{"success": true, "data": [{"id": <number>, "created_at": <string>, "friend_id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "is_online": <boolean>}], "message": "Demandes d'amis envoyé récupéré avec succès"}`

### GET /api/friends/blocked [AUTH]
*Liste des utilisateurs bloqués*  
<- `{"success": true, "data": [{"id": <number>, "username": <string>, "display_name": <string>, "avatar_url": <string>, "created_at": <string>}], "message": "Liste des utilisateurs bloqués récupérée avec succès"}`

### PUT /api/friends/block/:id [AUTH]
*Bloquer un utilisateur*  
<- `{"success": true, "message": "Utilisateur bloqué avec succès"}` || `{"error": "Utilisateur non trouvé"}`

### PUT /api/friends/unblock/:id [AUTH]
*Débloquer un utilisateur*  
<- `{"success": true, "message": "Utilisateur débloqué avec succès"}` || `{"error": "Utilisateur non bloqué"}`

---

## 🎭 Avatars

### GET /api/avatars
*Récupérer la liste des 4 avatars disponibles*  
<- `{"success": true, "data": [{"id": "default", "name": "default", "url": <string>}, {"id": "avatar-1", "name": "Avatar Style 1", "url": <string>}, {"id": "avatar-2", "name": "Avatar Style 2", "url": <string>}, {"id": "avatar-3", "name": "Avatar Style 3", "url": <string>}], "message": "liste des avatars récupérée avec succès"}`

### PUT /api/avatars/set [AUTH]
*Changer son avatar (4 choix disponibles)*  
-> `{"avatar_id": <string>}`  
<- `{"success": true, "message": "Avatar mis à jour avec succès", "data": {"avatar_id": <string>, "avatar_url": <string>}}` || `{"error": "Avatar invalide"}`

### POST /api/avatars/upload [AUTH]
*Upload d'un avatar personnalisé*  
-> `multipart/form-data` with `file` field  
<- `{"success": true, "message": "Avatar uploadé avec succès", "data": {"avatar_url": <string>, "filename": <string>}}` || `{"error": "Aucun fichier fourni"}`

---

## 🏆 Tournaments

### GET /api/tournaments
*Liste de tous les tournois avec nombre de participants*  
<- `{"success": true, "data": [{"id": <number>, "name": <string>, "description": <string>, "max_players": <number>, "current_players": <number>, "status": <string>, "created_by": <number>, "creator_username": <string>, "created_at": <string>}]}`

### POST /api/tournaments [AUTH]
*Créer un nouveau tournoi*  
-> `{"name": <string>, "description": <string?>, "max_players": <number?>}`  
<- `{"success": true, "data": {"id": <number>, "name": <string>, "description": <string>, "max_players": <number>, "creator_username": <string>}, "message": "Tournoi créé avec succès"}` || `{"error": "Le nom du tournoi est requis"}`

### POST /api/tournaments/:id/join [AUTH]
*Rejoindre un tournoi avec un alias obligatoire*  
-> `{"alias": <string>}`  
<- `{"success": true, "message": "Vous avez rejoint le tournoi en tant que \"<alias>\""}` || `{"error": "Cet alias est déjà pris pour ce tournoi"}`

### GET /api/tournaments/:id/bracket
*Afficher le bracket d'un tournoi avec les alias des participants*  
<- `{"success": true, "data": {"tournament": {...}, "participants": [{"id": <number>, "alias": <string>, "username": <string>, "display_name": <string>, "joined_at": <string>}], "matches": [...], "bracket_data": {...}}}` || `{"error": "Tournoi non trouvé"}`

### PUT /api/tournaments/:id/start [AUTH]
*Démarrer un tournoi (créateur uniquement)*  
<- `{"success": true, "message": "Tournoi démarré avec succès", "data": {"bracket_data": {...}}}` || `{"error": "Il faut au moins 2 participants pour démarrer"}`

### GET /api/tournaments/:id/matches
*Voir tous les matches d'un tournoi avec les alias des joueurs*  
<- `{"success": true, "data": {"tournament": {...}, "matches": [{"id": <number>, "player1_alias": <string>, "player2_alias": <string>, "player1_score": <number>, "player2_score": <number>, "status": <string>}]}}`

---

## ⚔️ Matches

### POST /api/matches/record
*Enregistrer un match complet avec support joueurs invités et statistiques détaillées*  
-> `{"player1_id": <number?>, "player2_id": <number?>, "player1_guest_name": <string?>, "player2_guest_name": <string?>, "player1_score": <number>, "player2_score": <number>, "winner_id": <number?>, "game_type": <string?>, "max_score": <number?>, "tournament_id": <number?>, "duration_seconds": <number?>, "player1_touched_ball": <number?>, "player1_missed_ball": <number?>, "player2_touched_ball": <number?>, "player2_missed_ball": <number?>, "match_data": <string?>}`  
<- `{"success": true, "message": "Match enregistré avec succès", "data": {"id": <number>, "player1_username": <string>, "player2_username": <string>, "player1_score": <number>, "player2_score": <number>, "status": "completed"}}` || `{"error": "Chaque joueur doit avoir soit un ID soit un nom d'invité"}`

### GET /api/matches [AUTH]
*Historique des matches d'un utilisateur avec filtres avancés*  
-> `?player_id=<number>&tournament_id=<number>&game_type=<string>&limit=<number>&offset=<number>&include_guests=<boolean>&include_stats=<boolean>`  
<- `{"success": true, "data": [{"id": <number>, "player1_username": <string>, "player2_username": <string>, "player1_guest_name": <string>, "player2_guest_name": <string>, "player1_score": <number>, "player2_score": <number>, "winner_id": <number>, "game_type": <string>, "tournament_name": <string>, "created_at": <string>}], "pagination": {"limit": <number>, "offset": <number>, "total": <number>}}`

### POST /api/matches [AUTH]
*Créer un match direct entre deux utilisateurs*  
-> `{"player2_id": <number>, "game_type": <string?>, "max_score": <number?>}`  
<- `{"success": true, "data": {"id": <number>, "player1_id": <number>, "player2_id": <number>, "player1_username": <string>, "player2_username": <string>, "status": "scheduled"}, "message": "Match créé avec succès"}` || `{"error": "Vous ne pouvez pas jouer contre vous-même"}`

### GET /api/matches/live
*Liste des matches actuellement en cours*  
<- `{"success": true, "data": [{"id": <number>, "player1_username": <string>, "player2_username": <string>, "tournament_name": <string>, "started_at": <string>, "status": "playing"}], "count": <number>}`

### GET /api/matches/:id
*Détails complets d'un match spécifique*  
<- `{"success": true, "data": {"id": <number>, "player1_username": <string>, "player2_username": <string>, "player1_score": <number>, "player2_score": <number>, "winner_id": <number>, "status": <string>, "game_type": <string>, "duration_seconds": <number>, "tournament_name": <string>, "created_at": <string>}}` || `{"error": "Match non trouvé"}`

### PUT /api/matches/:id/result [AUTH]
*Enregistrer le résultat d'un match (joueurs participants uniquement)*  
-> `{"player1_score": <number>, "player2_score": <number>, "winner_id": <number>}`  
<- `{"success": true, "data": {"id": <number>, "player1_score": <number>, "player2_score": <number>, "winner_id": <number>, "status": "completed"}, "message": "Résultat enregistré avec succès"}` || `{"error": "Vous n'êtes pas autorisé à enregistrer ce résultat"}`

### POST /api/matches/:id/start [AUTH]
*Démarrer un match programmé (joueurs participants uniquement)*  
<- `{"success": true, "message": "Match démarré"}` || `{"error": "Le match ne peut pas être démarré"}`

---

## 👤 Profile

### PATCH /api/profile [AUTH]
*Modifier uniquement son display_name*  
-> `{"display_name": <string>}`  
<- `{"success": true, "data": {"display_name": <string>}, "message": "Profil mis à jour avec succès"}`

---

## 🔧 System

### GET /health
*Vérifier l'état du serveur et de la DB*  
<- `{"status": "healthy", "timestamp": <string>, "environment": <string>, "database": {...}, "uptime": <number>}`

### GET /
*Informations générales sur l'API*  
<- `{"name": "ft_transcendence API", "version": "1.0.0", "environment": <string>, "timestamp": <string>, "endpoints": {...}}`

---

## 🚨 Error Format
`{"success": false, "error": <string>, "details": <string?>}`

**Status Codes:** 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 409 (Conflict), 500 (Server Error)

---

## 🧪 Quick Examples

```bash
# Register
curl -k -X POST https://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"password123","data_consent":true}'

# Login
curl -k -X POST https://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"password123"}'

# Get avatars
curl -k https://localhost:8000/api/avatars

# Change avatar
curl -k -X PUT https://localhost:8000/api/avatars/set \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"avatar_id":"avatar-2"}'

# Upload custom avatar
curl -k -X POST https://localhost:8000/api/avatars/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/image.jpg"

# Search users
curl -k "https://localhost:8000/api/users/search?q=john" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send friend request
curl -k -X POST https://localhost:8000/api/friends/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"friend_id":2}'

# Create tournament
curl -k -X POST https://localhost:8000/api/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"My Tournament","description":"Test tournament","max_players":8}'

# Join tournament with alias
curl -k -X POST https://localhost:8000/api/tournaments/1/join \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"alias":"Shadow_Player"}'

# Record match with guest players
curl -k -X POST https://localhost:8000/api/matches/record \
  -H "Content-Type: application/json" \
  -d '{"player1_guest_name":"Guest1","player2_guest_name":"Guest2","player1_score":3,"player2_score":1,"game_type":"pong"}'

# Get match history
curl -k "https://localhost:8000/api/matches?limit=10&include_guests=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Notes
- **HTTPS:** Self-signed cert in dev (use `-k` with curl)
- **Avatars:** 4 DiceBear styles, auto-assigned to new users
- **Auth:** JWT tokens, 24h expiration
- **CORS:** Configured for `localhost:3000` in development
- **Tournaments:** Alias system obligatoire, brackets automatiques
- **Matches:** Support joueurs invités + statistiques détaillées Pong
- **Database:** SQLite avec triggers automatiques pour stats utilisateur