export const DEFAULT_AVATAR_URL =
  'https://api.dicebear.com/7.x/avataaars/svg?seed=default&backgroundColor=b6e3f4';

export const getAvatarUrl = (avatarUrl: string | null | undefined): string => {
  if (!avatarUrl || avatarUrl.trim() === '') {
    return DEFAULT_AVATAR_URL;
  }
  if (avatarUrl.startsWith('/uploads/')) {
    return `https://localhost:8000${avatarUrl}`;
  }
  return avatarUrl;
};

export const getDefaultAvatarWithSeed = (seed: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;
};
