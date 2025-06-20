import { Vector2, Point2 } from "./Geometry";
import { Rectangle, Circle, Collision } from './Collision';
import { Input } from "./Input";

// unsure on how to store const variables'n'stuff

// IMPORTANT: (0, 0) coordinates are the top left of the arena.
const arenaSize = {
	width: 500,
	height: 200
};

const paddleSpeed = 20; // units / sec
const paddleSize = {
	width: 8,
	height: 30
};

const ballRadius = 5;
const ballSpeed = 50; // units / sec
const ballMaxBounceAngle = 75;

export class Paddle {
	public rect: Rectangle;
	private _hitCount: number = 0;

	public constructor(centerPos: Point2, private readonly parent: Pong) {
		this.rect = new Rectangle(centerPos, new Vector2(paddleSize.width, paddleSize.height));
	}
	
	public move(deltaTime: number, input: Input) {
		if (input.up)
			this.rect.pos.y -= paddleSpeed * deltaTime;
		if (input.down)
			this.rect.pos.y += paddleSpeed * deltaTime;
		
		if (this.rect.top < 0)
			this.rect.pos.y = 0;
		else if (this.rect.bottom > arenaSize.height)
			this.rect.pos.y = arenaSize.height - this.rect.size.y;
	}

	public increaseHitCount() { this._hitCount++ }
	public resetHitCount() { this._hitCount = 0; }

	public get pos() { return this.rect.pos; }
	public get size() { return this.rect.size; }
	public get hitCount() { return this._hitCount; }
}

export class Ball {
	public circle: Circle;
	private _direction: Vector2;

	public constructor(pos: Point2, initialDirection: Vector2, private readonly parent: Pong) {
		this.circle = new Circle(pos, ballRadius);
		this._direction = initialDirection;
	}

	public move(deltaTime: number) {
		this.circle.pos = this.circle.pos.add(this._direction.scale(deltaTime * ballSpeed));

		if (this.applyPaddleCollision(this.parent.leftPaddle, Vector2.one))
			this.parent.leftPaddle.increaseHitCount();
		else if (this.applyPaddleCollision(this.parent.rightPaddle, new Vector2(-1, 1)))
			this.parent.rightPaddle.increaseHitCount();

		if (this.circle.top < 0) {
			this.circle.pos.y = -this.circle.top + this.circle.radius;
			this._direction.y = -this._direction.y;
		}
		else if (this.circle.bottom > arenaSize.height) {
			this.circle.pos.y = 2 * arenaSize.height - this.circle.bottom - this.circle.radius;
			this._direction.y = -this._direction.y;
		}

		// the entire ball needs to pass the border to lose
		if (this.circle.right < 0) {
			console.log("left loses");
		}
		else if (this.circle.left > arenaSize.width) {
			console.log("right loses");
		}
	}

	private applyPaddleCollision(paddle: Paddle, directionMuliplier: Vector2) {
		if (Collision.rectVsCircle(paddle.rect, this.circle)) {
			const closestPoint = Collision.closestPoint(paddle.rect, this.circle);

			// bounds: [-paddleSize.height / 2, paddlesize.height / 2]
			const yDiff = closestPoint.y - paddle.rect.center.y;

			const normalized = yDiff / paddleSize.height / 2;
			const bounceAngle = normalized * ballMaxBounceAngle * Math.PI / 360;
			console.log(bounceAngle * 360 / Math.PI);
			this._direction.x = Math.cos(bounceAngle) * directionMuliplier.x;
			this._direction.y = Math.sin(bounceAngle) * directionMuliplier.y;
			return true;
		}
		return false;
	}

	public get pos() { return this.circle.pos; }
	public get radius() { return this.circle.radius; }
	public get direction() { return this._direction; }
}

export class Pong {
	public readonly leftPaddle: Paddle;
	public readonly rightPaddle: Paddle;
	public readonly ball: Ball;

	public constructor() {
		this.leftPaddle = new Paddle(new Point2(0, arenaSize.height / 2), this);
		this.rightPaddle = new Paddle(new Point2(arenaSize.width, arenaSize.height / 2), this);

		this.ball = new Ball(
			new Vector2(arenaSize.width / 2, arenaSize.height / 2), Vector2.up, this);
	}

	public update(deltaTime: number, leftInput: Input, rightInput: Input) {
		this.leftPaddle.move(deltaTime, leftInput);
		this.rightPaddle.move(deltaTime, rightInput);
		this.ball.move(deltaTime);
	}

	public json(): string {
		return JSON.stringify({
			leftPaddle: {
				pos: this.leftPaddle.pos,
				size: this.leftPaddle.size,
				hitCount: this.leftPaddle.hitCount
			},
			rightPaddle: {
				pos: this.rightPaddle.pos,
				size: this.rightPaddle.size,
				hitCount: this.rightPaddle.hitCount
			},
			ball: {
				pos: this.ball.pos,
				radius: this.ball.radius,
				direction: this.ball.direction
			}
		});
	}
}
