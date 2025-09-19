/**
 * Tournament Controllers - Refactored Architecture
 *
 * This module exports all tournament view controllers that implement
 * the new refactored architecture for the LocalTournament system.
 *
 * @see README.md for complete refactoring documentation
 */

// Base controller class
export { TournamentViewController } from './TournamentViewController';

// Specialized view controllers
export { LobbyViewController } from './LobbyViewController';
export { RegistrationViewController } from './RegistrationViewController';
export { BracketViewController } from './BracketViewController';
export { GameViewController } from './GameViewController';
export { ResultsViewController } from './ResultsViewController';

// Managers (from managers directory)
export { TournamentViewManager, USE_VIEW_CONTROLLERS } from '../managers/TournamentViewManager';
export { TournamentEventManager, USE_EVENT_MANAGER } from '../managers/TournamentEventManager';

// Types
export type { TournamentView } from '../managers/TournamentViewManager';