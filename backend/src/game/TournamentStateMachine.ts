/**
 * Tournament State Machine - Manages tournament status transitions
 */

export enum TournamentStatus {
  WAITING = 'waiting',        // Collecting participants
  READY = 'ready',           // Minimum participants reached, can start
  RUNNING = 'running',       // Tournament active with bracket
  COMPLETED = 'completed',   // Tournament finished with winner
  CANCELLED = 'cancelled'    // Tournament cancelled
}

export interface TournamentState {
  id: number;
  status: TournamentStatus;
  participantCount: number;
  maxParticipants: number;
  minParticipants: number;
  createdBy: number;
  startedAt?: Date;
  completedAt?: Date;
  winnerId?: number;
}

export interface StateTransition {
  from: TournamentStatus;
  to: TournamentStatus;
  condition: (state: TournamentState) => boolean;
  action?: (state: TournamentState) => Promise<void>;
}

export class TournamentStateMachine {
  private transitions: StateTransition[] = [
    // WAITING -> READY
    {
      from: TournamentStatus.WAITING,
      to: TournamentStatus.READY,
      condition: (state) => state.participantCount >= state.minParticipants
    },

    // READY -> WAITING (if participants leave)
    {
      from: TournamentStatus.READY,
      to: TournamentStatus.WAITING,
      condition: (state) => state.participantCount < state.minParticipants
    },

    // READY -> RUNNING
    {
      from: TournamentStatus.READY,
      to: TournamentStatus.RUNNING,
      condition: (state) => state.participantCount >= state.minParticipants
    },

    // WAITING -> RUNNING (direct start with minimum participants)
    {
      from: TournamentStatus.WAITING,
      to: TournamentStatus.RUNNING,
      condition: (state) => state.participantCount >= state.minParticipants
    },

    // RUNNING -> COMPLETED
    {
      from: TournamentStatus.RUNNING,
      to: TournamentStatus.COMPLETED,
      condition: (state) => state.winnerId !== undefined
    },

    // WAITING/READY -> CANCELLED
    {
      from: TournamentStatus.WAITING,
      to: TournamentStatus.CANCELLED,
      condition: () => true // Can always be cancelled if not started
    },
    {
      from: TournamentStatus.READY,
      to: TournamentStatus.CANCELLED,
      condition: () => true // Can always be cancelled if not started
    }
  ];

  /**
   * Attempt to transition tournament to new state
   */
  transition(currentState: TournamentState, targetStatus: TournamentStatus): {
    success: boolean;
    newStatus: TournamentStatus;
    error?: string;
  } {
    const validTransition = this.transitions.find(t => 
      t.from === currentState.status && 
      t.to === targetStatus &&
      t.condition(currentState)
    );

    if (!validTransition) {
      return {
        success: false,
        newStatus: currentState.status,
        error: `Cannot transition from ${currentState.status} to ${targetStatus}`
      };
    }

    return {
      success: true,
      newStatus: targetStatus
    };
  }

  /**
   * Get possible transitions from current state
   */
  getPossibleTransitions(currentState: TournamentState): TournamentStatus[] {
    return this.transitions
      .filter(t => t.from === currentState.status && t.condition(currentState))
      .map(t => t.to);
  }

  /**
   * Auto-transition based on current state
   */
  autoTransition(currentState: TournamentState): {
    shouldTransition: boolean;
    newStatus?: TournamentStatus;
    reason?: string;
  } {
    // Check for automatic transitions
    for (const transition of this.transitions) {
      if (transition.from === currentState.status && transition.condition(currentState)) {
        // Prioritize certain automatic transitions
        if (transition.to === TournamentStatus.READY && currentState.status === TournamentStatus.WAITING) {
          return {
            shouldTransition: true,
            newStatus: transition.to,
            reason: 'Minimum participants reached'
          };
        }
        
        if (transition.to === TournamentStatus.WAITING && currentState.status === TournamentStatus.READY) {
          return {
            shouldTransition: true,
            newStatus: transition.to,
            reason: 'Participants dropped below minimum'
          };
        }

        if (transition.to === TournamentStatus.COMPLETED && currentState.status === TournamentStatus.RUNNING) {
          return {
            shouldTransition: true,
            newStatus: transition.to,
            reason: 'Tournament completed with winner'
          };
        }
      }
    }

    return { shouldTransition: false };
  }

  /**
   * Validate tournament can start
   */
  canStart(state: TournamentState): { canStart: boolean; reason?: string } {
    if (state.status === TournamentStatus.RUNNING) {
      return { canStart: false, reason: 'Tournament already running' };
    }

    if (state.status === TournamentStatus.COMPLETED) {
      return { canStart: false, reason: 'Tournament already completed' };
    }

    if (state.status === TournamentStatus.CANCELLED) {
      return { canStart: false, reason: 'Tournament cancelled' };
    }

    if (state.participantCount < state.minParticipants) {
      return { 
        canStart: false, 
        reason: `Need at least ${state.minParticipants} participants (current: ${state.participantCount})` 
      };
    }

    return { canStart: true };
  }

  /**
   * Validate player can join tournament
   */
  canJoin(state: TournamentState): { canJoin: boolean; reason?: string } {
    if (state.status === TournamentStatus.RUNNING) {
      return { canJoin: false, reason: 'Tournament already started' };
    }

    if (state.status === TournamentStatus.COMPLETED) {
      return { canJoin: false, reason: 'Tournament completed' };
    }

    if (state.status === TournamentStatus.CANCELLED) {
      return { canJoin: false, reason: 'Tournament cancelled' };
    }

    if (state.participantCount >= state.maxParticipants) {
      return { canJoin: false, reason: 'Tournament full' };
    }

    return { canJoin: true };
  }

  /**
   * Validate player can leave tournament
   */
  canLeave(state: TournamentState): { canLeave: boolean; reason?: string } {
    if (state.status === TournamentStatus.RUNNING) {
      return { canLeave: false, reason: 'Cannot leave running tournament' };
    }

    if (state.status === TournamentStatus.COMPLETED) {
      return { canLeave: false, reason: 'Tournament completed' };
    }

    return { canLeave: true };
  }

  /**
   * Get tournament status display information
   */
  getStatusInfo(status: TournamentStatus): {
    displayName: string;
    description: string;
    color: string;
    canJoin: boolean;
    canStart: boolean;
  } {
    switch (status) {
      case TournamentStatus.WAITING:
        return {
          displayName: 'Open',
          description: 'Waiting for participants',
          color: 'blue',
          canJoin: true,
          canStart: false
        };

      case TournamentStatus.READY:
        return {
          displayName: 'Ready',
          description: 'Ready to start',
          color: 'green',
          canJoin: true,
          canStart: true
        };

      case TournamentStatus.RUNNING:
        return {
          displayName: 'Running',
          description: 'Tournament in progress',
          color: 'orange',
          canJoin: false,
          canStart: false
        };

      case TournamentStatus.COMPLETED:
        return {
          displayName: 'Completed',
          description: 'Tournament finished',
          color: 'gray',
          canJoin: false,
          canStart: false
        };

      case TournamentStatus.CANCELLED:
        return {
          displayName: 'Cancelled',
          description: 'Tournament cancelled',
          color: 'red',
          canJoin: false,
          canStart: false
        };

      default:
        return {
          displayName: 'Unknown',
          description: 'Unknown status',
          color: 'gray',
          canJoin: false,
          canStart: false
        };
    }
  }

  /**
   * Get participant count requirements info
   */
  getParticipantRequirements(participantCount: number, maxParticipants: number): {
    status: 'insufficient' | 'minimum' | 'good' | 'full';
    message: string;
    canStart: boolean;
  } {
    const minParticipants = 2;

    if (participantCount < minParticipants) {
      return {
        status: 'insufficient',
        message: `Need ${minParticipants - participantCount} more participants to start`,
        canStart: false
      };
    }

    if (participantCount === minParticipants) {
      return {
        status: 'minimum',
        message: `Minimum participants reached (${participantCount}/${maxParticipants})`,
        canStart: true
      };
    }

    if (participantCount < maxParticipants) {
      return {
        status: 'good',
        message: `${participantCount}/${maxParticipants} participants joined`,
        canStart: true
      };
    }

    return {
      status: 'full',
      message: `Tournament full (${participantCount}/${maxParticipants})`,
      canStart: true
    };
  }
}