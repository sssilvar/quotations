import type { Point } from "../annotation-types";

export type Viewport = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function uid() {
  return Math.random().toString(36).slice(2, 11);
}

export function n2px(point: Point, width: number, height: number): [number, number] {
  return [point.x * width, point.y * height];
}

export function px2n(x: number, y: number, width: number, height: number): Point {
  return {
    x: width <= 0 ? 0 : x / width,
    y: height <= 0 ? 0 : y / height,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampPoint(point: Point): Point {
  return {
    x: clamp(point.x, 0, 1),
    y: clamp(point.y, 0, 1),
  };
}

export function clampBox(x: number, y: number, width: number, height: number): Point {
  return {
    x: clamp(x, 0, 1 - width),
    y: clamp(y, 0, 1 - height),
  };
}

export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function lineRectIntersection(
  ax: number,
  ay: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): [number, number] {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = cx - ax;
  const dy = cy - ay;
  let bestT = 1;
  const eps = 1e-6;

  for (const [edge, min, max, isX] of [
    [rx, ry, ry + rh, true],
    [rx + rw, ry, ry + rh, true],
    [ry, rx, rx + rw, false],
    [ry + rh, rx, rx + rw, false],
  ] as const) {
    const dv = isX ? dx : dy;
    if (Math.abs(dv) < eps) continue;
    const t = (edge - (isX ? ax : ay)) / dv;
    if (t <= 0 || t >= bestT) continue;
    const cross = (isX ? ay : ax) + t * (isX ? dy : dx);
    if (cross >= min && cross <= max) bestT = t;
  }

  return [ax + bestT * dx, ay + bestT * dy];
}

export function calloutPath(
  bx: number,
  by: number,
  bw: number,
  bh: number,
  ax: number,
  ay: number,
  radius: number,
  notchHalf: number,
) {
  const [ix, iy] = lineRectIntersection(ax, ay, bx, by, bw, bh);
  const left = bx;
  const right = bx + bw;
  const top = by;
  const bottom = by + bh;
  const eps = 1e-3;

  let side: "top" | "bottom" | "left" | "right" = "top";
  if (Math.abs(ix - left) < eps) side = "left";
  else if (Math.abs(ix - right) < eps) side = "right";
  else if (Math.abs(iy - top) < eps) side = "top";
  else if (Math.abs(iy - bottom) < eps) side = "bottom";

  if (side === "top") {
    const x1 = clamp(ix - notchHalf, left + radius, right - radius);
    const x2 = clamp(ix + notchHalf, left + radius, right - radius);
    return `M ${left + radius} ${top} H ${x1} L ${ax} ${ay} L ${x2} ${top} H ${right - radius} Q ${right} ${top} ${right} ${top + radius} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${left + radius} Q ${left} ${bottom} ${left} ${bottom - radius} V ${top + radius} Q ${left} ${top} ${left + radius} ${top} Z`;
  }

  if (side === "right") {
    const y1 = clamp(iy - notchHalf, top + radius, bottom - radius);
    const y2 = clamp(iy + notchHalf, top + radius, bottom - radius);
    return `M ${left + radius} ${top} H ${right - radius} Q ${right} ${top} ${right} ${top + radius} V ${y1} L ${ax} ${ay} L ${right} ${y2} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${left + radius} Q ${left} ${bottom} ${left} ${bottom - radius} V ${top + radius} Q ${left} ${top} ${left + radius} ${top} Z`;
  }

  if (side === "bottom") {
    const x1 = clamp(ix + notchHalf, left + radius, right - radius);
    const x2 = clamp(ix - notchHalf, left + radius, right - radius);
    return `M ${left + radius} ${top} H ${right - radius} Q ${right} ${top} ${right} ${top + radius} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${x1} L ${ax} ${ay} L ${x2} ${bottom} H ${left + radius} Q ${left} ${bottom} ${left} ${bottom - radius} V ${top + radius} Q ${left} ${top} ${left + radius} ${top} Z`;
  }

  const y1 = clamp(iy + notchHalf, top + radius, bottom - radius);
  const y2 = clamp(iy - notchHalf, top + radius, bottom - radius);
  return `M ${left + radius} ${top} H ${right - radius} Q ${right} ${top} ${right} ${top + radius} V ${bottom - radius} Q ${right} ${bottom} ${right - radius} ${bottom} H ${left + radius} Q ${left} ${bottom} ${left} ${bottom - radius} V ${y1} L ${ax} ${ay} L ${left} ${y2} V ${top + radius} Q ${left} ${top} ${left + radius} ${top} Z`;
}
