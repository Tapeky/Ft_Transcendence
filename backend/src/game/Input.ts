export class Input {
  public up: boolean = false;
  public down: boolean = false;

  public reset() {
    this.up = false;
    this.down = false;
  }

  public copy(input: Input) {
    this.up = input.up;
    this.down = input.down;
  }
}
