// Global type declarations for Ft_Transcendence frontend

import { Router } from '../core/app/Router';
import { Application } from '../core/app/Application';

declare global {
  interface Window {
    router: Router;
    application: Application;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }

  interface ImportMeta {
    env: {
      VITE_API_URL?: string;
      NODE_ENV?: string;
      [key: string]: string | undefined;
    };
  }
}

// Make this file a module
export {};