/**
 * Utilitaires pour la gestion des avatars
 */

export const DEFAULT_AVATAR_URL = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4';

/**
 * Retourne l'URL d'avatar avec fallback par défaut
 * @param avatarUrl URL de l'avatar (peut être null/undefined/empty)
 * @returns URL d'avatar valide
 */
export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  // Si pas d'avatar ou vide, retourner l'avatar par défaut
  if (!avatarUrl || avatarUrl.trim() === '') {
    return DEFAULT_AVATAR_URL;
  }
  
  // Si c'est un avatar uploadé (commence par /uploads/), ajouter l'URL du backend
  if (avatarUrl.startsWith('/uploads/')) {
    return `https://localhost:8000${avatarUrl}`;
  }
  
  // Sinon, retourner l'URL telle quelle (Dicebear, etc.)
  return avatarUrl;
};

/**
 * Génère un avatar par défaut avec seed personnalisé
 * @param seed Seed pour générer un avatar unique (username, id, etc.)
 * @returns URL d'avatar Dicebear avec seed personnalisé
 */
export const getDefaultAvatarWithSeed = (seed: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;
};