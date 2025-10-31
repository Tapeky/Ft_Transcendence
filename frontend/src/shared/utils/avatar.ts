import { config, avatarUtils } from '../../config/environment';

export const DEFAULT_AVATAR_URL =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4';

export const getAvatarUrl = (avatarUrl: string | null | undefined, addTimestamp: boolean = true): string => {
  if (!avatarUrl || avatarUrl.trim() === '') {
    return DEFAULT_AVATAR_URL;
  }
  if (avatarUrl.startsWith('/uploads/')) {
    const baseUrl = `${config.API_BASE_URL}${avatarUrl}`;
    // Ajouter un timestamp pour éviter le cache du navigateur
    return addTimestamp ? `${baseUrl}?t=${Date.now()}` : baseUrl;
  }
  return avatarUrl;
};

export const getDefaultAvatarWithSeed = (seed: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;
};
