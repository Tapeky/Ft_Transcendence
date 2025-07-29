// ============================================================================
// GameInput.ts - Comprehensive input handler for Pong game controls
// ============================================================================
// Phase 4 implementation - Complete user controls system with keyboard, touch,
// throttling, visual feedback, and mobile support

import { Input, GameInput } from '../../types/GameTypes';

export type InputCallback = (input: Input) => void;

export interface InputOptions {
  enableMobileControls?: boolean;
  enableVisualFeedback?: boolean;
  throttleRate?: number; // FPS, default 60
  keyMappings?: KeyMapping;
}

export interface KeyMapping {
  up: string[];
  down: string[];
}

const DEFAULT_KEY_MAPPING: KeyMapping = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown']
};

const DEFAULT_OPTIONS: Required<InputOptions> = {
  enableMobileControls: true,
  enableVisualFeedback: true,
  throttleRate: 60,
  keyMappings: DEFAULT_KEY_MAPPING
};

export class GameInputHandler {
  private currentInput: GameInput = new GameInput();
  private previousInput: GameInput = new GameInput();
  private inputCallback: InputCallback | null = null;
  private isActive = false;
  private options: Required<InputOptions>;
  
  // Event handlers
  private boundKeyDown: (event: KeyboardEvent) => void;
  private boundKeyUp: (event: KeyboardEvent) => void;
  private boundTouchStart: (event: TouchEvent) => void;
  private boundTouchEnd: (event: TouchEvent) => void;
  private boundVisibilityChange: () => void;
  
  // Input throttling
  private lastInputSentTime = 0;
  private inputThrottleInterval: number;
  private pendingInputUpdate = false;
  private inputUpdateTimer: number | null = null;
  
  // Touch controls
  private touchControlsContainer: HTMLElement | null = null;
  private touchUpButton: HTMLElement | null = null;
  private touchDownButton: HTMLElement | null = null;
  private activeTouches = new Set<number>();
  
  // Visual feedback
  private visualFeedbackContainer: HTMLElement | null = null;
  private keyStateDisplay: HTMLElement | null = null;
  
  // State tracking
  private pressedKeys = new Set<string>();
  private isPageVisible = true;

  constructor(options: InputOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.inputThrottleInterval = 1000 / this.options.throttleRate;
    
    // Bind event handlers to maintain correct 'this' context
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundTouchStart = this.handleTouchStart.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);
    this.boundVisibilityChange = this.handleVisibilityChange.bind(this);
    
    console.log('⌨️ GameInputHandler: Initialized with options:', this.options);
  }

  /**
   * Phase 4: Activate comprehensive input handling
   */
  public activate(callback: InputCallback, container?: HTMLElement): void {
    console.log('🎮 GameInputHandler: Activating comprehensive input handling');
    
    this.inputCallback = callback;
    this.isActive = true;
    this.isPageVisible = !document.hidden;
    
    // Add keyboard event listeners
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    
    // Add visibility change listener to pause input when tab is not active
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
    
    // Prevent page scrolling when using game keys
    this.preventDefaultKeyActions();
    
    // Initialize mobile controls if enabled
    if (this.options.enableMobileControls && container) {
      this.initializeMobileControls(container);
    }
    
    // Initialize visual feedback if enabled
    if (this.options.enableVisualFeedback && container) {
      this.initializeVisualFeedback(container);
    }
    
    // Start input throttling system
    this.startInputThrottling();
    
    console.log('✅ GameInputHandler: All input systems activated');
  }

  /**
   * Phase 4: Deactivate comprehensive input handling
   */
  public deactivate(): void {
    console.log('🛑 GameInputHandler: Deactivating comprehensive input handling');
    
    this.isActive = false;
    this.inputCallback = null;
    
    // Remove keyboard event listeners
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    
    // Stop input throttling
    this.stopInputThrottling();
    
    // Clean up mobile controls
    this.cleanupMobileControls();
    
    // Clean up visual feedback
    this.cleanupVisualFeedback();
    
    // Reset input state
    this.currentInput.reset();
    this.previousInput.reset();
    this.pressedKeys.clear();
    this.activeTouches.clear();
    
    console.log('✅ GameInputHandler: All input systems deactivated');
  }

  /**
   * Phase 4: Enhanced keydown event handling with throttling
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive || !this.isPageVisible) return;

    // Check if this key is already pressed (prevent key repeat)
    if (this.pressedKeys.has(event.code)) {
      event.preventDefault();
      return;
    }

    let inputChanged = false;
    const keyCode = event.code;

    // Check if key matches any configured mapping
    if (this.options.keyMappings.up.includes(keyCode)) {
      if (!this.currentInput.up) {
        this.currentInput.up = true;
        inputChanged = true;
        this.pressedKeys.add(keyCode);
      }
      event.preventDefault();
    } else if (this.options.keyMappings.down.includes(keyCode)) {
      if (!this.currentInput.down) {
        this.currentInput.down = true;
        inputChanged = true;
        this.pressedKeys.add(keyCode);
      }
      event.preventDefault();
    }

    // Update visual feedback
    if (inputChanged && this.options.enableVisualFeedback) {
      this.updateVisualFeedback();
    }

    // Queue input update if something changed
    if (inputChanged) {
      this.queueInputUpdate();
    }
  }

  /**
   * Phase 4: Enhanced keyup event handling with throttling
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isActive) return;

    let inputChanged = false;
    const keyCode = event.code;

    // Remove from pressed keys set
    this.pressedKeys.delete(keyCode);

    // Check if key matches any configured mapping
    if (this.options.keyMappings.up.includes(keyCode)) {
      // Only change state if no other up keys are pressed
      const otherUpKeysPressed = this.options.keyMappings.up.some(key => 
        key !== keyCode && this.pressedKeys.has(key)
      );
      
      if (this.currentInput.up && !otherUpKeysPressed) {
        this.currentInput.up = false;
        inputChanged = true;
      }
      event.preventDefault();
    } else if (this.options.keyMappings.down.includes(keyCode)) {
      // Only change state if no other down keys are pressed
      const otherDownKeysPressed = this.options.keyMappings.down.some(key => 
        key !== keyCode && this.pressedKeys.has(key)
      );
      
      if (this.currentInput.down && !otherDownKeysPressed) {
        this.currentInput.down = false;
        inputChanged = true;
      }
      event.preventDefault();
    }

    // Update visual feedback
    if (inputChanged && this.options.enableVisualFeedback) {
      this.updateVisualFeedback();
    }

    // Queue input update if something changed
    if (inputChanged) {
      this.queueInputUpdate();
    }
  }

  /**
   * Phase 4: Input throttling system to limit input rate to optimal FPS
   */
  private startInputThrottling(): void {
    console.log(`🔄 GameInputHandler: Starting input throttling at ${this.options.throttleRate}FPS`);
  }
  
  private stopInputThrottling(): void {
    if (this.inputUpdateTimer) {
      clearTimeout(this.inputUpdateTimer);
      this.inputUpdateTimer = null;
    }
    this.pendingInputUpdate = false;
  }
  
  private queueInputUpdate(): void {
    if (!this.pendingInputUpdate) {
      this.pendingInputUpdate = true;
      
      const now = Date.now();
      const timeSinceLastUpdate = now - this.lastInputSentTime;
      const timeToWait = Math.max(0, this.inputThrottleInterval - timeSinceLastUpdate);
      
      this.inputUpdateTimer = window.setTimeout(() => {
        this.sendThrottledInput();
      }, timeToWait);
    }
  }
  
  private sendThrottledInput(): void {
    if (!this.isActive || !this.inputCallback) {
      this.pendingInputUpdate = false;
      return;
    }
    
    // Only send if input actually changed
    if (this.currentInput.up !== this.previousInput.up || 
        this.currentInput.down !== this.previousInput.down) {
      
      this.inputCallback(this.currentInput);
      this.previousInput.copy(this.currentInput);
      this.lastInputSentTime = Date.now();
    }
    
    this.pendingInputUpdate = false;
    this.inputUpdateTimer = null;
  }
  
  /**
   * Phase 4: Handle page visibility changes to pause input when tab is not active
   */
  private handleVisibilityChange(): void {
    this.isPageVisible = !document.hidden;
    
    if (!this.isPageVisible) {
      // Clear all input states when page becomes hidden
      this.currentInput.reset();
      this.pressedKeys.clear();
      this.activeTouches.clear();
      
      if (this.options.enableVisualFeedback) {
        this.updateVisualFeedback();
      }
      
      // Send cleared input immediately
      if (this.inputCallback) {
        this.inputCallback(this.currentInput);
        this.previousInput.copy(this.currentInput);
      }
    }
  }
  
  /**
   * Prevent default actions for game keys to avoid page scrolling
   */
  private preventDefaultKeyActions(): void {
    const preventDefaults = (event: KeyboardEvent) => {
      const allGameKeys = [...this.options.keyMappings.up, ...this.options.keyMappings.down];
      if (allGameKeys.includes(event.code)) {
        event.preventDefault();
      }
    };

    document.addEventListener('keydown', preventDefaults, { passive: false });
    document.addEventListener('keyup', preventDefaults, { passive: false });
  }

  /**
   * Phase 4: Initialize mobile touch controls
   */
  private initializeMobileControls(container: HTMLElement): void {
    console.log('📱 GameInputHandler: Initializing mobile controls');
    
    // Check if mobile controls are needed (touch device detection)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (!isTouchDevice) {
      console.log('💻 GameInputHandler: Desktop device detected, skipping mobile controls');
      return;
    }
    
    // Create mobile controls container
    this.touchControlsContainer = document.createElement('div');
    this.touchControlsContainer.className = 'mobile-game-controls';
    this.touchControlsContainer.innerHTML = `
      <div class="flex flex-col gap-4 fixed right-4 top-1/2 transform -translate-y-1/2 z-50 md:hidden">
        <button 
          id="mobile-up-btn" 
          class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-4 rounded-full shadow-lg select-none touch-manipulation w-16 h-16 flex items-center justify-center text-2xl"
          type="button"
        >
          ↑
        </button>
        <button 
          id="mobile-down-btn" 
          class="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white p-4 rounded-full shadow-lg select-none touch-manipulation w-16 h-16 flex items-center justify-center text-2xl"
          type="button"
        >
          ↓
        </button>
      </div>
    `;
    
    // Add to container
    container.appendChild(this.touchControlsContainer);
    
    // Get button references
    this.touchUpButton = this.touchControlsContainer.querySelector('#mobile-up-btn');
    this.touchDownButton = this.touchControlsContainer.querySelector('#mobile-down-btn');
    
    // Add touch event listeners
    if (this.touchUpButton) {
      this.touchUpButton.addEventListener('touchstart', this.boundTouchStart, { passive: false });
      this.touchUpButton.addEventListener('touchend', this.boundTouchEnd, { passive: false });
      this.touchUpButton.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });
    }
    
    if (this.touchDownButton) {
      this.touchDownButton.addEventListener('touchstart', this.boundTouchStart, { passive: false });
      this.touchDownButton.addEventListener('touchend', this.boundTouchEnd, { passive: false });
      this.touchDownButton.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });
    }
    
    console.log('✅ GameInputHandler: Mobile controls initialized');
  }
  
  /**
   * Phase 4: Handle touch start events
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.isActive) return;
    
    event.preventDefault();
    
    const target = event.currentTarget as HTMLElement;
    let inputChanged = false;
    
    if (target === this.touchUpButton && !this.currentInput.up) {
      this.currentInput.up = true;
      inputChanged = true;
      target.style.transform = 'scale(0.95)';
      
      // Track active touches
      for (let i = 0; i < event.changedTouches.length; i++) {
        this.activeTouches.add(event.changedTouches[i].identifier);
      }
    } else if (target === this.touchDownButton && !this.currentInput.down) {
      this.currentInput.down = true;
      inputChanged = true;
      target.style.transform = 'scale(0.95)';
      
      // Track active touches
      for (let i = 0; i < event.changedTouches.length; i++) {
        this.activeTouches.add(event.changedTouches[i].identifier);
      }
    }
    
    // Update visual feedback
    if (inputChanged && this.options.enableVisualFeedback) {
      this.updateVisualFeedback();
    }
    
    // Queue input update
    if (inputChanged) {
      this.queueInputUpdate();
    }
  }
  
  /**
   * Phase 4: Handle touch end events
   */
  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isActive) return;
    
    event.preventDefault();
    
    const target = event.currentTarget as HTMLElement;
    let inputChanged = false;
    
    // Remove ended touches from active set
    for (let i = 0; i < event.changedTouches.length; i++) {
      this.activeTouches.delete(event.changedTouches[i].identifier);
    }
    
    if (target === this.touchUpButton && this.currentInput.up) {
      this.currentInput.up = false;
      inputChanged = true;
      target.style.transform = 'scale(1)';
    } else if (target === this.touchDownButton && this.currentInput.down) {
      this.currentInput.down = false;
      inputChanged = true;
      target.style.transform = 'scale(1)';
    }
    
    // Update visual feedback
    if (inputChanged && this.options.enableVisualFeedback) {
      this.updateVisualFeedback();
    }
    
    // Queue input update
    if (inputChanged) {
      this.queueInputUpdate();
    }
  }
  
  /**
   * Phase 4: Clean up mobile controls
   */
  private cleanupMobileControls(): void {
    if (this.touchControlsContainer) {
      this.touchControlsContainer.remove();
      this.touchControlsContainer = null;
      this.touchUpButton = null;
      this.touchDownButton = null;
    }
  }
  
  /**
   * Get current input state
   */
  public getCurrentInput(): Input {
    return {
      up: this.currentInput.up,
      down: this.currentInput.down
    };
  }

  /**
   * Phase 4: Initialize visual feedback system
   */
  private initializeVisualFeedback(container: HTMLElement): void {
    console.log('🌈 GameInputHandler: Initializing visual feedback');
    
    // Create visual feedback container
    this.visualFeedbackContainer = document.createElement('div');
    this.visualFeedbackContainer.className = 'input-visual-feedback';
    this.visualFeedbackContainer.innerHTML = `
      <div class="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-sm font-mono z-40">
        <div class="text-xs text-gray-400 mb-2">INPUT STATUS</div>
        <div id="key-state-display" class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="w-12">UP:</span>
            <span id="up-state" class="w-16 text-center px-2 py-1 rounded bg-gray-700">OFF</span>
            <span class="text-xs text-gray-400">${this.options.keyMappings.up.join(', ')}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="w-12">DOWN:</span>
            <span id="down-state" class="w-16 text-center px-2 py-1 rounded bg-gray-700">OFF</span>
            <span class="text-xs text-gray-400">${this.options.keyMappings.down.join(', ')}</span>
          </div>
          <div class="flex items-center gap-2 mt-2 pt-2 border-t border-gray-600">
            <span class="text-xs">Rate: ${this.options.throttleRate}FPS</span>
            <span id="connection-indicator" class="w-2 h-2 rounded-full bg-red-500 ml-auto"></span>
          </div>
        </div>
      </div>
    `;
    
    // Add to container
    container.appendChild(this.visualFeedbackContainer);
    
    // Get references
    this.keyStateDisplay = this.visualFeedbackContainer.querySelector('#key-state-display');
    
    console.log('✅ GameInputHandler: Visual feedback initialized');
  }
  
  /**
   * Phase 4: Update visual feedback display
   */
  private updateVisualFeedback(): void {
    if (!this.visualFeedbackContainer || !this.keyStateDisplay) return;
    
    const upStateElement = this.keyStateDisplay.querySelector('#up-state');
    const downStateElement = this.keyStateDisplay.querySelector('#down-state');
    
    if (upStateElement) {
      upStateElement.textContent = this.currentInput.up ? 'ON' : 'OFF';
      upStateElement.className = this.currentInput.up 
        ? 'w-16 text-center px-2 py-1 rounded bg-green-600 text-white'
        : 'w-16 text-center px-2 py-1 rounded bg-gray-700';
    }
    
    if (downStateElement) {
      downStateElement.textContent = this.currentInput.down ? 'ON' : 'OFF';
      downStateElement.className = this.currentInput.down 
        ? 'w-16 text-center px-2 py-1 rounded bg-green-600 text-white'
        : 'w-16 text-center px-2 py-1 rounded bg-gray-700';
    }
  }
  
  /**
   * Phase 4: Update connection status in visual feedback
   */
  public updateConnectionStatus(isConnected: boolean): void {
    if (!this.visualFeedbackContainer) return;
    
    const connectionIndicator = this.visualFeedbackContainer.querySelector('#connection-indicator');
    if (connectionIndicator) {
      connectionIndicator.className = isConnected
        ? 'w-2 h-2 rounded-full bg-green-500 ml-auto'
        : 'w-2 h-2 rounded-full bg-red-500 ml-auto';
    }
  }
  
  /**
   * Phase 4: Clean up visual feedback
   */
  private cleanupVisualFeedback(): void {
    if (this.visualFeedbackContainer) {
      this.visualFeedbackContainer.remove();
      this.visualFeedbackContainer = null;
      this.keyStateDisplay = null;
    }
  }
  
  /**
   * Check if input handler is active
   */
  public isInputActive(): boolean {
    return this.isActive;
  }

  /**
   * Get input performance statistics
   */
  public getInputStats(): {
    throttleRate: number;
    lastInputSentTime: number;
    isThrottling: boolean;
    pressedKeysCount: number;
    activeTouchesCount: number;
  } {
    return {
      throttleRate: this.options.throttleRate,
      lastInputSentTime: this.lastInputSentTime,
      isThrottling: this.pendingInputUpdate,
      pressedKeysCount: this.pressedKeys.size,
      activeTouchesCount: this.activeTouches.size
    };
  }
  
  /**
   * Update input options dynamically
   */
  public updateOptions(newOptions: Partial<InputOptions>): void {
    const oldOptions = { ...this.options };
    this.options = { ...this.options, ...newOptions };
    
    // Update throttle rate if changed
    if (newOptions.throttleRate && newOptions.throttleRate !== oldOptions.throttleRate) {
      this.inputThrottleInterval = 1000 / this.options.throttleRate;
      console.log(`🔄 GameInputHandler: Updated throttle rate to ${this.options.throttleRate}FPS`);
    }
    
    console.log('⚙️ GameInputHandler: Options updated:', newOptions);
  }
  
  /**
   * Phase 4: Simulate input for testing with enhanced features
   */
  public simulateInput(up: boolean, down: boolean, source: string = 'test'): void {
    console.log(`🎯 GameInputHandler: Simulating input from ${source} - up:`, up, 'down:', down);
    
    this.currentInput.up = up;
    this.currentInput.down = down;
    
    // Update visual feedback
    if (this.options.enableVisualFeedback) {
      this.updateVisualFeedback();
    }
    
    // Send input immediately for testing
    if (this.inputCallback) {
      this.inputCallback(this.currentInput);
      this.previousInput.copy(this.currentInput);
    }
  }

  /**
   * Reset input state comprehensively
   */
  public reset(): void {
    console.log('🔄 GameInputHandler: Resetting all input states');
    
    this.currentInput.reset();
    this.previousInput.reset();
    this.pressedKeys.clear();
    this.activeTouches.clear();
    
    // Reset visual feedback
    if (this.options.enableVisualFeedback) {
      this.updateVisualFeedback();
    }
    
    // Reset mobile control button states
    if (this.touchUpButton) {
      this.touchUpButton.style.transform = 'scale(1)';
    }
    if (this.touchDownButton) {
      this.touchDownButton.style.transform = 'scale(1)';
    }
    
    // Send reset input
    if (this.inputCallback) {
      this.inputCallback(this.currentInput);
    }
  }
}