# Configuration GitHub OAuth pour ft_transcendence

## 1. Créer une GitHub App

### Étapes sur GitHub:
1. Va sur [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique sur "New OAuth App"
3. Configure l'application :
   - **Application name** : `ft_transcendence_auth`
   - **Homepage URL** : `http://localhost:3000`
   - **Authorization callback URL** : `http://localhost:8000/api/auth/github/callback`
   - **Description** : `OAuth for ft_transcendence Pong game`

### Récupérer les credentials:
1. Après création, note le **Client ID**
2. Générer le **Client secret** et le noter

## 2. Configuration du projet

### Mettre à jour le fichier .env:
```bash
# Ajouter ces lignes dans .env
GITHUB_CLIENT_ID=ton_github_client_id
GITHUB_CLIENT_SECRET=ton_github_client_secret
```

## 3. Test de l'authentification

### Backend:
- ✅ Routes GitHub OAuth ajoutées (`/api/auth/github` et `/api/auth/github/callback`)
- ✅ Base de données mise à jour avec `github_id`
- ✅ UserRepository modifié pour GitHub

### Frontend:
- ✅ Bouton GitHub ajouté aux formulaires
- ✅ Gestion du callback GitHub dans AuthContext
- ✅ Service API mis à jour

### URLs importantes:
- **Connexion GitHub** : `http://localhost:8000/api/auth/github`
- **Callback GitHub** : `http://localhost:8000/api/auth/github/callback`
- **Frontend** : `http://localhost:3000`

## 4. Flux d'authentification GitHub

1. **Utilisateur clique sur "GitHub"** → Redirigé vers GitHub OAuth
2. **GitHub autorise** → Callback vers `/api/auth/github/callback`
3. **Backend traite** :
   - Échange le code contre un token d'accès
   - Récupère les infos utilisateur GitHub
   - Crée ou lie le compte utilisateur
   - Génère un JWT token
4. **Redirection frontend** → `http://localhost:3000?token=JWT_TOKEN`
5. **Frontend récupère le token** → Authentification réussie

## 5. Démarrer le projet

```bash
# Dans le dossier ft_transcendence
make dev
# ou
docker-compose up --build
```

## 6. Test

1. Va sur `http://localhost:3000`
2. Clique sur "Sign in" 
3. Clique sur le bouton GitHub
4. Autorise l'application sur GitHub
5. Tu devrais être connecté automatiquement !

## Troubleshooting

### Si l'authentification échoue:
1. Vérifier que les variables `GITHUB_CLIENT_ID` et `GITHUB_CLIENT_SECRET` sont correctes
2. Vérifier que l'URL de callback correspond exactement
3. Regarder les logs backend pour les erreurs
4. Vérifier que la base de données a été mise à jour (colonne `github_id`)

### Logs utiles:
```bash
# Logs backend
docker-compose logs -f backend

# Logs database
docker-compose exec backend npm run db:stats
```
