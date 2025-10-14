interface EnvironmentConfig {
  API_BASE_URL: string;
  WS_BASE_URL: string;
  IS_DEVELOPMENT: boolean;
  IS_PRODUCTION: boolean;
  DEFAULT_AVATAR_PATH: string;
}

function createConfig(): EnvironmentConfig {
  const apiUrl = (import.meta as any).env?.VITE_API_URL || 'https://localhost:8000';
  const isDev = (import.meta as any).env?.DEV || false;
  const isProd = (import.meta as any).env?.PROD || false;

  const wsUrl = apiUrl.replace(/^https?:/, window.location.protocol === 'https:' ? 'wss:' : 'ws:');

  return {
    API_BASE_URL: apiUrl,
    WS_BASE_URL: wsUrl,
    IS_DEVELOPMENT: isDev,
    IS_PRODUCTION: isProd,
    DEFAULT_AVATAR_PATH: '/avatars/default.png',
  };
}

export const config: EnvironmentConfig = createConfig();

export const endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
    github: '/api/auth/github',
    google: '/api/auth/google',
  },
  users: {
    base: '/api/users',
    profile: (id: string) => `/api/users/${id}`,
    avatar: (id: string) => `/api/users/${id}/avatar`,
    stats: (id: string) => `/api/users/${id}/stats`,
  },
  friends: {
    base: '/api/friends',
    requests: '/api/friends/requests',
    block: '/api/friends/block',
  },
  game: {
    invites: '/api/game-invites',
    simple: '/simple-pong',
  },
  tournament: {
    base: '/api/local-tournaments',
    create: '/api/local-tournaments/create',
    join: (id: string) => `/api/local-tournaments/${id}/join`,
    start: (id: string) => `/api/local-tournaments/${id}/start`,
  },
  websocket: {
    base: '/ws',
    chat: '/ws/chat',
    game: '/ws/game',
  },
} as const;

export const avatarUtils = {
  getAvatarUrl: (userId: string | number, avatarFilename?: string): string => {
    if (!avatarFilename) {
      return config.DEFAULT_AVATAR_PATH;
    }
    return `${config.API_BASE_URL}/api/users/${userId}/avatar?v=${Date.now()}`;
  },
  getDefaultAvatar: (): string => config.DEFAULT_AVATAR_PATH,
};
