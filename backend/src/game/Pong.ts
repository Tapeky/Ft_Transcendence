import { Vector2, Point2 } from './Geometry';
import { Rectangle, Circle, Collision } from './Collision';
import { Input } from './Input';

const arenaSize = {
  width: 500,
  height: 200,
};

const paddleSpeed = 200; // units / sec
const paddleSize = {
  width: 8,
  height: 30,
};

const ballRadius = 5;
const ballSpeed = 300; // units / sec
const ballMaxBounceAngle = 75;
const winningScore = 3; // First to 3 points wins

export class Paddle {
  public rect: Rectangle;
  private _hitCount: number = 0;

  public constructor(
    centerPos: Point2,
    private readonly _parent: Pong
  ) {
    this.rect = new Rectangle(centerPos, new Vector2(paddleSize.width, paddleSize.height));
  }

  public move(deltaTime: number, input: Input) {
    if (input.up) this.rect.pos.y -= paddleSpeed * deltaTime;
    if (input.down) this.rect.pos.y += paddleSpeed * deltaTime;

    if (this.rect.top < 0) this.rect.pos.y = 0;
    else if (this.rect.bottom > arenaSize.height)
      this.rect.pos.y = arenaSize.height - this.rect.size.y;
  }

  public increaseHitCount() {
    this._hitCount++;
  }
  public resetHitCount() {
    this._hitCount = 0;
  }

  public get pos() {
    return this.rect.pos;
  }
  public get size() {
    return this.rect.size;
  }
  public get hitCount() {
    return this._hitCount;
  }
}

export class Ball {
  public circle: Circle;
  private _direction: Vector2;

  public constructor(
    pos: Point2,
    initialDirection: Vector2,
    private readonly _parent: Pong
  ) {
    this.circle = new Circle(pos, ballRadius);
    this._direction = initialDirection;
  }

  public move(deltaTime: number) {
    this.circle.pos = this.circle.pos.add(this._direction.scale(deltaTime * ballSpeed));

    if (this.applyPaddleCollision(this._parent.leftPaddle, Vector2.one))
      this._parent.leftPaddle.increaseHitCount();
    else if (this.applyPaddleCollision(this._parent.rightPaddle, new Vector2(-1, 1)))
      this._parent.rightPaddle.increaseHitCount();

    if (this.circle.top < 0) {
      this.circle.pos.y = -this.circle.top + this.circle.radius;
      this._direction.y = -this._direction.y;
    } else if (this.circle.bottom > arenaSize.height) {
      this.circle.pos.y = 2 * arenaSize.height - this.circle.bottom - this.circle.radius;
      this._direction.y = -this._direction.y;
    }

    if (this.circle.right < 0) {
      return 1; // right player scores
    } else if (this.circle.left > arenaSize.width) {
      return 2; // left player scores
    }
    return 0;
  }

  private applyPaddleCollision(paddle: Paddle, directionMuliplier: Vector2) {
    if (Collision.rectVsCircle(paddle.rect, this.circle)) {
      const closestPoint = Collision.closestPoint(paddle.rect, this.circle);

      const yDiff = closestPoint.y - paddle.rect.center.y;

      const normalized = yDiff / paddleSize.height / 2;
      const bounceAngle = (normalized * ballMaxBounceAngle * Math.PI) / 360;
      this._direction.x = Math.cos(bounceAngle) * directionMuliplier.x;
      this._direction.y = Math.sin(bounceAngle) * directionMuliplier.y;
      return true;
    }
    return false;
  }

  public get pos() {
    return this.circle.pos;
  }
  public get radius() {
    return this.circle.radius;
  }
  public get direction() {
    return this._direction;
  }

  public setDirection(direction: Vector2) {
    this._direction = direction;
  }
}

export enum PongState {
  Running,
  Aborted,
  LeftWins,
  RightWins,
}

export class Pong {
  public readonly leftPaddle: Paddle;
  public readonly rightPaddle: Paddle;
  public readonly ball: Ball;
  private _state: PongState = PongState.Running;
  private _leftScore: number = 0;
  private _rightScore: number = 0;

  public constructor() {
    this.leftPaddle = new Paddle(new Point2(10 + paddleSize.width / 2, arenaSize.height / 2), this); // Centre à x=8
    this.rightPaddle = new Paddle(
      new Point2(arenaSize.width - 2 - paddleSize.width / 2, arenaSize.height / 2),
      this
    ); // Centre à x=492

    const randomAngle = ((Math.random() - 0.5) * Math.PI) / 3; // angle entre -60° et +60°
    const horizontalDirection = Math.random() < 0.5 ? 1 : -1; // gauche ou droite
    const initialDirection = new Vector2(
      Math.cos(randomAngle) * horizontalDirection,
      Math.sin(randomAngle)
    ).normalized;

    this.ball = new Ball(
      new Vector2(arenaSize.width / 2, arenaSize.height / 2),
      initialDirection,
      this
    );
  }

  public update(deltaTime: number, leftInput: Input, rightInput: Input) {
    if (this._state == PongState.Running) {
      this.leftPaddle.move(deltaTime, leftInput);
      this.rightPaddle.move(deltaTime, rightInput);
      const ballResult = this.ball.move(deltaTime);

      if (ballResult == 1) {
        this._rightScore++; // right player scores
        this.resetBall();
      } else if (ballResult == 2) {
        this._leftScore++; // left player scores
        this.resetBall();
      }

      if (this._leftScore >= winningScore) {
        this._state = PongState.LeftWins;
      } else if (this._rightScore >= winningScore) {
        this._state = PongState.RightWins;
      }
    }
  }

  public abort() {
    this._state = PongState.Aborted;
  }

  private resetBall() {
    this.ball.circle.pos.x = arenaSize.width / 2;
    this.ball.circle.pos.y = arenaSize.height / 2;

    const randomAngle = ((Math.random() - 0.5) * Math.PI) / 3; // angle between -60° and +60°
    const horizontalDirection = Math.random() < 0.5 ? 1 : -1; // left or right
    const initialDirection = new Vector2(
      Math.cos(randomAngle) * horizontalDirection,
      Math.sin(randomAngle)
    ).normalized;
    this.ball.setDirection(initialDirection);
  }

  public get state() {
    return this._state;
  }

  public get leftScore() {
    return this._leftScore;
  }

  public get rightScore() {
    return this._rightScore;
  }

  public repr(): { [k: string]: any } {
    return {
      leftPaddle: {
        pos: this.leftPaddle.pos,
        hitCount: this.leftPaddle.hitCount,
      },
      rightPaddle: {
        pos: this.rightPaddle.pos,
        hitCount: this.rightPaddle.hitCount,
      },
      ball: {
        pos: this.ball.pos,
        direction: this.ball.direction,
      },
      state: this._state,
      leftScore: this._leftScore,
      rightScore: this._rightScore,
    };
  }
}
