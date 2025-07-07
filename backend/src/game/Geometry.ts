
export class Vector2 {
	public constructor(public x: number, public y: number) {}

	public clone() {
		return new Vector2(this.x, this.y);
	}

	public add(o: Vector2) {
		return new Vector2(this.x + o.x, this.y + o.y);
	}

	public sub(o: Vector2) {
		return new Vector2(this.x - o.x, this.y - o.y);
	}

	public mul(o: Vector2) {
		return new Vector2(this.x * o.x, this.y * o.y);
	}

	public scale(n: number) {
		return new Vector2(this.x * n, this.y * n);
	}

	public dot(o: Vector2) {
		return this.x * o.x + this.y * o.y;
	}

	public det(o: Vector2) {
		return this.x * o.y - this.y * o.x;
	}

	public normalize() {
		const length = this.length;
		this.x /= length;
		this.y /= length;
	}

	public angle(o: Vector2) {
		const dot = this.dot(o);
		const det = this.det(o);
		return (Math.atan2(dot, det));
	}

	public get length() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}

	public get normalized() {
		const length = this.length;
		return new Vector2(this.x / length, this.y / length);
	}

	public static readonly one = new Vector2(1, 1);
	public static readonly zero = new Vector2(0, 0);
	public static readonly right = new Vector2(1, 0);
	public static readonly left = new Vector2(-1, 0);
	public static readonly up = new Vector2(0, -1);
	public static readonly down = new Vector2(0, 1);
}

// alias to differentiate a vector from a point in space
export class Point2 extends Vector2 {}
