export type Vec2 = { x: number; y: number };

export const ZERO: Vec2 = { x: 0, y: 0 };

export function vec(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec2, amount: number): Vec2 {
  return { x: a.x * amount, y: a.y * amount };
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function normalize(a: Vec2): Vec2 {
  const magnitude = length(a);
  return magnitude > 0.0001 ? scale(a, 1 / magnitude) : { x: 1, y: 0 };
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(a, b));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function clampMagnitude(a: Vec2, maximum: number): Vec2 {
  const magnitude = length(a);
  return magnitude > maximum ? scale(a, maximum / magnitude) : { ...a };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function circleOverlapsCircle(
  a: Vec2,
  aRadius: number,
  b: Vec2,
  bRadius: number,
): boolean {
  return distance(a, b) <= aRadius + bRadius;
}

export function closestPointOnAabb(point: Vec2, min: Vec2, max: Vec2): Vec2 {
  return {
    x: clamp(point.x, min.x, max.x),
    y: clamp(point.y, min.y, max.y),
  };
}

export function circleOverlapsAabb(
  center: Vec2,
  radius: number,
  min: Vec2,
  max: Vec2,
): boolean {
  return distance(center, closestPointOnAabb(center, min, max)) <= radius;
}

export function reflect(velocity: Vec2, normal: Vec2, restitution = 1): Vec2 {
  const projection = dot(velocity, normal);
  return sub(velocity, scale(normal, (1 + restitution) * projection));
}

export function segmentPoint(start: Vec2, direction: Vec2, distanceAlong: number): Vec2 {
  return add(start, scale(normalize(direction), distanceAlong));
}

export type Aabb = { min: Vec2; max: Vec2 };

export type PhysicsAdapter = {
  circleOverlapsAabb: typeof circleOverlapsAabb;
  circleOverlapsCircle: typeof circleOverlapsCircle;
  closestPointOnAabb: typeof closestPointOnAabb;
  reflect: typeof reflect;
};

export const deterministicPhysics: PhysicsAdapter = {
  circleOverlapsAabb,
  circleOverlapsCircle,
  closestPointOnAabb,
  reflect,
};
