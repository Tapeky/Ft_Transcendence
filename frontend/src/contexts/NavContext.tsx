import { createContext, useContext } from 'react';

export const NavContext = createContext<{ goTo: (to: string) => void } | null>(null);

export function useNav() {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used inside a RouterProvider');
  }
  return context;
}
