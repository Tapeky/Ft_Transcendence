# 🔧 KISS Game Invites - Guide de Dépannage

## ❌ Erreur: "getToken is not a function"

### 🎯 Problème
```
TypeError: (intermediate value).getToken is not a function
    at GameInviteService.ts:56
```

### 🔍 Cause
La méthode `getToken()` n'existe pas dans `apiService` ou l'import est corrompu.

### ✅ Solutions

#### Solution 1: Vérification Rapide
```bash
# 1. Vérifier les imports
node scripts/fix-kiss-imports.js

# 2. Si tout est OK, effacer le cache navigateur
# Appuyer sur Ctrl+F5 (ou Cmd+Shift+R sur Mac)

# 3. Redémarrer le serveur de développement
cd frontend && npm run dev
```

#### Solution 2: Vérification Manuelle

1. **Ouvrir `frontend/src/services/api.ts`**
2. **Chercher la méthode `getToken()`** - doit être présente :
```typescript
getToken(): string | null {
    return this.token;
}
```

3. **Si manquante, l'ajouter après `clearToken()`** :
```typescript
clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
}

getToken(): string | null {
    return this.token;
}
```

#### Solution 3: Debug Avancé

1. **Ouvrir `frontend/kiss-debug.html` dans le navigateur**
2. **Vérifier les statuts d'import**
3. **Cliquer "Fix Import Issues" si nécessaire**

### 🛠️ Vérifications Supplémentaires

#### Vérifier l'Export d'ApiService
Dans `frontend/src/services/api.ts`, en fin de fichier :
```typescript
export const apiService = new ApiService();
```

#### Vérifier l'Import dans GameInviteService
Dans `frontend/src/services/GameInviteService.ts`, en début de fichier :
```typescript
import { apiService } from './api';
```

### 🚨 Si le Problème Persiste

#### Option 1: Fallback Manuel
Modifier `GameInviteService.ts` ligne ~56 :
```typescript
private authenticate(): void {
  // Fallback si getToken() ne fonctionne pas
  const token = localStorage.getItem('auth_token');
  if (!token || !this.ws) return;

  this.ws.send(JSON.stringify({
    type: 'auth',
    token: token
  }));
}
```

#### Option 2: Reconstruction Complète
```bash
# 1. Sauvegarder les modifications
git add . && git commit -m "save work"

# 2. Nettoyer les modules
cd frontend && rm -rf node_modules && npm install

# 3. Redémarrer
npm run dev
```

---

## ❌ Autres Erreurs Courantes

### "Cannot read property 'onInviteReceived' of undefined"

**Cause**: `gameInviteService` n'est pas importé correctement.

**Solution**:
```typescript
// Dans main.ts, vérifier:
const { gameInviteService } = await import('./services/GameInviteService');
if (!gameInviteService) {
  throw new Error('GameInviteService not loaded');
}
```

### "WebSocket connection failed"

**Cause**: Backend non démarré ou URL WebSocket incorrecte.

**Solutions**:
1. Vérifier que le backend tourne sur le bon port
2. Dans `api.ts`, vérifier `getWebSocketUrl()`:
```typescript
private getWebSocketUrl(): string {
  const apiUrl = (import.meta as any).env.VITE_API_URL || 'https://localhost:8000';
  const wsUrl = apiUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:');
  return `${wsUrl}/ws`;
}
```

### "SimpleInvitePopup is not a constructor"

**Cause**: Import de classe incorrect.

**Solution**:
```typescript
// Vérifier l'import:
import { SimpleInvitePopup } from './components/SimpleInvitePopup';

// Utilisation:
new SimpleInvitePopup(invite);
```

---

## 🔧 Scripts de Diagnostic

### Script Automatique
```bash
# Vérification complète
./scripts/kiss-migration-complete.sh
```

### Debug Interactif
```bash
# Ouvrir dans le navigateur
frontend/kiss-debug.html
```

### Tests Manuels
```bash
# Tester les imports Node.js
node -e "
const fs = require('fs');
const api = fs.readFileSync('frontend/src/services/api.ts', 'utf8');
console.log('getToken present:', api.includes('getToken()'));
"
```

---

## 📞 Support

Si aucune solution ne fonctionne :

1. **Copier l'erreur complète** de la console navigateur
2. **Vérifier les logs backend** pour les erreurs WebSocket
3. **Tester avec `frontend/kiss-test.html`** pour isoler le problème
4. **Redémarrer complètement** (backend + frontend)

**Le système KISS est conçu pour être robuste - ces erreurs sont généralement dues au cache navigateur ou à des imports corrompus.**