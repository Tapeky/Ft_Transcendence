import { Vector2, Point2 } from './Geometry';

export class Rectangle {
  public pos: Point2;
  public size: Vector2;

  public constructor(pos: Point2, size: Vector2, fromCenter: boolean = true) {
    if (size.x <= 0 || size.y <= 0)
      throw Error(`negative negative or null rectange size (${size.x}, ${size.y})`);
    this.size = size;
    if (fromCenter) this.pos = new Vector2(pos.x - size.x / 2, pos.y - size.y / 2);
    else this.pos = pos;
  }

  public get top() {
    return this.pos.y;
  }

  public get bottom() {
    return this.pos.y + this.size.y;
  }

  public get left() {
    return this.pos.x;
  }

  public get right() {
    return this.pos.x + this.size.x;
  }

  public get center() {
    return new Point2(this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2);
  }
}

export class Circle {
  public constructor(
    public pos: Point2,
    public radius: number
  ) {
    if (radius <= 0) throw Error(`negative or null radius ${radius}`);
  }

  public get left() {
    return this.pos.x - this.radius;
  }

  public get right() {
    return this.pos.x + this.radius;
  }

  public get top() {
    return this.pos.y - this.radius;
  }

  public get bottom() {
    return this.pos.y + this.radius;
  }
}

export class Collision {
  public static rectVsRect(rect1: Rectangle, rect2: Rectangle) {
    return (
      rect1.left < rect2.right &&
      rect1.right > rect2.left &&
      rect1.top < rect2.bottom &&
      rect1.bottom > rect2.top
    );
  }

  public static closestPoint(rect: Rectangle, circle: Circle) {
    const center = rect.center;
    const diff = circle.pos.sub(center);

    const halfSize = new Vector2(rect.size.x / 2, rect.size.y / 2);
    const clamped = new Point2(
      Math.max(-halfSize.x, Math.min(halfSize.x, diff.x)),
      Math.max(-halfSize.y, Math.min(halfSize.y, diff.y))
    );
    return center.add(clamped);
  }

  public static rectVsCircle(rect: Rectangle, circle: Circle) {
    return Collision.closestPoint(rect, circle).sub(circle.pos).length < circle.radius;
  }

  public static circleVsCircle(circle1: Circle, circle2: Circle) {
    const diff = circle1.pos.sub(circle2.pos);
    const lengthSquared = diff.x * diff.x + diff.y * diff.y;
    return lengthSquared <= (circle1.radius + circle2.radius) ** 2;
  }
}
