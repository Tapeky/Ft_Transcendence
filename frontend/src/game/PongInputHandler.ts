interface InputState {
  up: boolean;
  down: boolean;
}

export class PongInputHandler {
  private keys: InputState = { up: false, down: false };
  private onInputChange?: (input: InputState) => void;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.keyDownHandler = this.handleKeyDown.bind(this);
    this.keyUpHandler = this.handleKeyUp.bind(this);
  }

  setInputChangeCallback(callback: (input: InputState) => void): void {
    this.onInputChange = callback;
  }

  startListening(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  stopListening(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const prevState = { ...this.keys };

    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      this.keys.up = true;
    }
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      event.preventDefault();
      this.keys.down = true;
    }

    if (this.hasInputChanged(prevState) && this.onInputChange) {
      this.onInputChange(this.keys);
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const prevState = { ...this.keys };

    if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
      event.preventDefault();
      this.keys.up = false;
    }
    if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
      event.preventDefault();
      this.keys.down = false;
    }

    if (this.hasInputChanged(prevState) && this.onInputChange) {
      this.onInputChange(this.keys);
    }
  }

  private hasInputChanged(prevState: InputState): boolean {
    return prevState.up !== this.keys.up || prevState.down !== this.keys.down;
  }

  getCurrentInput(): InputState {
    return { ...this.keys };
  }

  reset(): void {
    this.keys = { up: false, down: false };
  }
}