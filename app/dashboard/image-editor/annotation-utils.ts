import type {
  Annotation,
  CircleShapeAnnotation,
  EditorState,
  FreehandAnnotation,
  LabelAnnotation,
  Point,
  RectShapeAnnotation,
  TextAnnotation,
} from "../annotation-types";
import {
  HIT_TOLERANCE,
  LABEL_BOX_H,
  LABEL_BOX_MAX_W,
  LABEL_BOX_W,
  SEL_PAD,
} from "./constants";
import { clamp, distToSegment, n2px, type Viewport } from "./geometry";

export type Drawing =
  | { kind: "line" | "arrow"; p1: Point; p2: Point }
  | { kind: "freehand"; points: Point[] }
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "circle"; cx: number; cy: number; r: number };

type NormalizedBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const TEXT_LINE_HEIGHT_RATIO = 1.2;
const LABEL_TEXT_PADDING_X = 10;
const LABEL_TEXT_PADDING_Y = 8;

export function cloneAnnotation<T extends Annotation>(annotation: T): T {
  switch (annotation.type) {
    case "line":
    case "arrow":
      return {
        ...annotation,
        p1: { ...annotation.p1 },
        p2: { ...annotation.p2 },
      };
    case "freehand":
      return {
        ...annotation,
        points: annotation.points.map((point) => ({ ...point })),
      };
    case "text":
      return {
        ...annotation,
        position: { ...annotation.position },
      };
    case "label":
      return {
        ...annotation,
        anchor: { ...annotation.anchor },
        boxPosition: { ...annotation.boxPosition },
      };
    case "rect":
    case "circle":
      return { ...annotation };
  }
}

export function cloneEditorState(state: EditorState): EditorState {
  return {
    annotations: state.annotations.map(cloneAnnotation),
  };
}

export function getTextLines(text: string) {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function getApproxTextWidth(text: string, fontSize: number) {
  return Math.max(1, text.length) * fontSize * 0.6;
}

function getLineHeight(fontSize: number) {
  return Math.max(fontSize * TEXT_LINE_HEIGHT_RATIO, fontSize + 2);
}

export function getTextMetrics(text: string, fontSize: number) {
  const lines = getTextLines(text);
  const lineHeight = getLineHeight(fontSize);
  const width = Math.max(60, ...lines.map((line) => getApproxTextWidth(line, fontSize)));
  const textHeight = fontSize + Math.max(0, lines.length - 1) * lineHeight;
  return { lines, lineHeight, width, textHeight };
}

export function getTextBoundsFromValue(
  position: Point,
  value: string,
  fontSize: number,
  viewport: Viewport,
) {
  const [x, y] = n2px(position, viewport.width, viewport.height);
  const metrics = getTextMetrics(value, fontSize);
  return {
    x,
    y: y - fontSize - 2,
    width: metrics.width,
    height: metrics.textHeight + 8,
  };
}

export function getTextPixelWidth(annotation: TextAnnotation) {
  return getTextMetrics(annotation.text, annotation.fontSize).width;
}

export function getTextBounds(annotation: TextAnnotation, viewport: Viewport) {
  return getTextBoundsFromValue(annotation.position, annotation.text, annotation.fontSize, viewport);
}

function breakLongWord(word: string, maxWidth: number, fontSize: number) {
  const chunks: string[] = [];
  let current = "";
  for (const char of word) {
    const next = `${current}${char}`;
    if (current && getApproxTextWidth(next, fontSize) > maxWidth) {
      chunks.push(current);
      current = char;
      continue;
    }
    current = next;
  }
  if (current) chunks.push(current);
  return chunks;
}

function wrapTextToWidth(text: string, maxWidth: number, fontSize: number) {
  const wrapped: string[] = [];
  for (const paragraph of getTextLines(text)) {
    if (!paragraph.trim()) {
      wrapped.push("");
      continue;
    }

    let current = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      const candidate = current ? `${current} ${word}` : word;
      if (getApproxTextWidth(candidate, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        wrapped.push(current);
        current = "";
      }

      if (getApproxTextWidth(word, fontSize) <= maxWidth) {
        current = word;
        continue;
      }

      const chunks = breakLongWord(word, maxWidth, fontSize);
      wrapped.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? "";
    }

    wrapped.push(current);
  }

  return wrapped.length ? wrapped : [""];
}

export function getLabelLayoutFromValue(
  boxPosition: Point,
  text: string,
  fontSize: number,
  viewport: Viewport,
) {
  const [x, y] = n2px(boxPosition, viewport.width, viewport.height);
  const minWidth = LABEL_BOX_W * viewport.width;
  const maxWidth = LABEL_BOX_MAX_W * viewport.width;
  const longestLineWidth = Math.max(...getTextLines(text).map((line) => getApproxTextWidth(line, fontSize)));
  const width = clamp(longestLineWidth + LABEL_TEXT_PADDING_X * 2, minWidth, maxWidth);
  const contentWidth = Math.max(24, width - LABEL_TEXT_PADDING_X * 2);
  const lines = wrapTextToWidth(text, contentWidth, fontSize);
  const lineHeight = getLineHeight(fontSize);
  const textHeight = fontSize + Math.max(0, lines.length - 1) * lineHeight;
  const minHeight = LABEL_BOX_H * viewport.height;
  const height = Math.max(minHeight, textHeight + LABEL_TEXT_PADDING_Y * 2);

  return {
    x,
    y,
    width,
    height,
    lines,
    lineHeight,
    textHeight,
    paddingX: LABEL_TEXT_PADDING_X,
    paddingY: LABEL_TEXT_PADDING_Y,
    textTop: Math.max(LABEL_TEXT_PADDING_Y, (height - textHeight) / 2),
  };
}

export function getLabelLayout(annotation: LabelAnnotation, viewport: Viewport) {
  return getLabelLayoutFromValue(annotation.boxPosition, annotation.text, annotation.fontSize, viewport);
}

export function getLabelBounds(annotation: LabelAnnotation, viewport: Viewport) {
  const layout = getLabelLayout(annotation, viewport);
  return {
    x: layout.x,
    y: layout.y,
    width: layout.width,
    height: layout.height,
  };
}

function getNormalizedBounds(annotation: Annotation): NormalizedBounds {
  switch (annotation.type) {
    case "line":
    case "arrow":
      return {
        minX: Math.min(annotation.p1.x, annotation.p2.x),
        minY: Math.min(annotation.p1.y, annotation.p2.y),
        maxX: Math.max(annotation.p1.x, annotation.p2.x),
        maxY: Math.max(annotation.p1.y, annotation.p2.y),
      };
    case "freehand": {
      const xs = annotation.points.map((point) => point.x);
      const ys = annotation.points.map((point) => point.y);
      return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys),
      };
    }
    case "text":
      return {
        minX: annotation.position.x,
        minY: annotation.position.y,
        maxX: annotation.position.x,
        maxY: annotation.position.y,
      };
    case "label":
      return {
        minX: Math.min(annotation.anchor.x, annotation.boxPosition.x),
        minY: Math.min(annotation.anchor.y, annotation.boxPosition.y),
        maxX: Math.max(annotation.anchor.x, annotation.boxPosition.x + LABEL_BOX_W),
        maxY: Math.max(annotation.anchor.y, annotation.boxPosition.y + LABEL_BOX_H),
      };
    case "rect":
      return {
        minX: annotation.x,
        minY: annotation.y,
        maxX: annotation.x + annotation.width,
        maxY: annotation.y + annotation.height,
      };
    case "circle":
      return {
        minX: annotation.cx - annotation.r,
        minY: annotation.cy - annotation.r,
        maxX: annotation.cx + annotation.r,
        maxY: annotation.cy + annotation.r,
      };
  }
}

function getClampedDelta(annotation: Annotation, dx: number, dy: number) {
  const bounds = getNormalizedBounds(annotation);
  return {
    dx: clamp(dx, -bounds.minX, 1 - bounds.maxX),
    dy: clamp(dy, -bounds.minY, 1 - bounds.maxY),
  };
}

export function moveAnnotation(annotation: Annotation, dx: number, dy: number): Annotation {
  const delta = getClampedDelta(annotation, dx, dy);

  switch (annotation.type) {
    case "line":
    case "arrow":
      return {
        ...annotation,
        p1: { x: annotation.p1.x + delta.dx, y: annotation.p1.y + delta.dy },
        p2: { x: annotation.p2.x + delta.dx, y: annotation.p2.y + delta.dy },
      };
    case "freehand":
      return {
        ...annotation,
        points: annotation.points.map((point) => ({
          x: point.x + delta.dx,
          y: point.y + delta.dy,
        })),
      } satisfies FreehandAnnotation;
    case "text":
      return {
        ...annotation,
        position: {
          x: annotation.position.x + delta.dx,
          y: annotation.position.y + delta.dy,
        },
      } satisfies TextAnnotation;
    case "label":
      return {
        ...annotation,
        anchor: {
          x: annotation.anchor.x + delta.dx,
          y: annotation.anchor.y + delta.dy,
        },
        boxPosition: {
          x: annotation.boxPosition.x + delta.dx,
          y: annotation.boxPosition.y + delta.dy,
        },
      } satisfies LabelAnnotation;
    case "rect":
      return {
        ...annotation,
        x: annotation.x + delta.dx,
        y: annotation.y + delta.dy,
      } satisfies RectShapeAnnotation;
    case "circle":
      return {
        ...annotation,
        cx: annotation.cx + delta.dx,
        cy: annotation.cy + delta.dy,
      } satisfies CircleShapeAnnotation;
  }
}

export function hitTestAnnotation(annotations: Annotation[], point: Point, viewport: Viewport) {
  const [px, py] = n2px(point, viewport.width, viewport.height);

  for (let index = annotations.length - 1; index >= 0; index -= 1) {
    const annotation = annotations[index];

    switch (annotation.type) {
      case "line":
      case "arrow": {
        const [x1, y1] = n2px(annotation.p1, viewport.width, viewport.height);
        const [x2, y2] = n2px(annotation.p2, viewport.width, viewport.height);
        if (distToSegment(px, py, x1, y1, x2, y2) < HIT_TOLERANCE) return annotation;
        break;
      }
      case "freehand": {
        for (let segment = 0; segment < annotation.points.length - 1; segment += 1) {
          const [x1, y1] = n2px(annotation.points[segment], viewport.width, viewport.height);
          const [x2, y2] = n2px(annotation.points[segment + 1], viewport.width, viewport.height);
          if (distToSegment(px, py, x1, y1, x2, y2) < HIT_TOLERANCE) return annotation;
        }
        break;
      }
      case "text": {
        const bounds = getTextBounds(annotation, viewport);
        if (
          px >= bounds.x - 4 &&
          px <= bounds.x + bounds.width + 4 &&
          py >= bounds.y - 2 &&
          py <= bounds.y + bounds.height + 2
        ) {
          return annotation;
        }
        break;
      }
      case "label": {
        const bounds = getLabelBounds(annotation, viewport);
        if (
          px >= bounds.x &&
          px <= bounds.x + bounds.width &&
          py >= bounds.y &&
          py <= bounds.y + bounds.height
        ) {
          return annotation;
        }
        const [ax, ay] = n2px(annotation.anchor, viewport.width, viewport.height);
        if (Math.hypot(px - ax, py - ay) < 12) return annotation;
        break;
      }
      case "rect":
        if (
          px >= annotation.x * viewport.width &&
          px <= (annotation.x + annotation.width) * viewport.width &&
          py >= annotation.y * viewport.height &&
          py <= (annotation.y + annotation.height) * viewport.height
        ) {
          return annotation;
        }
        break;
      case "circle": {
        const [cx, cy] = n2px({ x: annotation.cx, y: annotation.cy }, viewport.width, viewport.height);
        if (Math.hypot(px - cx, py - cy) <= annotation.r * Math.min(viewport.width, viewport.height)) {
          return annotation;
        }
        break;
      }
    }
  }

  return null;
}

export function getSelectionBounds(annotation: Annotation, viewport: Viewport) {
  const pad = SEL_PAD;

  switch (annotation.type) {
    case "line":
    case "arrow": {
      const [x1, y1] = n2px(annotation.p1, viewport.width, viewport.height);
      const [x2, y2] = n2px(annotation.p2, viewport.width, viewport.height);
      return {
        x: Math.min(x1, x2) - pad,
        y: Math.min(y1, y2) - pad,
        width: Math.abs(x2 - x1) + pad * 2,
        height: Math.abs(y2 - y1) + pad * 2,
      };
    }
    case "freehand": {
      if (!annotation.points.length) return null;
      const xs = annotation.points.map((point) => point.x * viewport.width);
      const ys = annotation.points.map((point) => point.y * viewport.height);
      return {
        x: Math.min(...xs) - pad,
        y: Math.min(...ys) - pad,
        width: Math.max(...xs) - Math.min(...xs) + pad * 2,
        height: Math.max(...ys) - Math.min(...ys) + pad * 2,
      };
    }
    case "text": {
      const bounds = getTextBounds(annotation, viewport);
      return {
        x: bounds.x - pad,
        y: bounds.y - pad,
        width: bounds.width + pad * 2,
        height: bounds.height + pad * 2,
      };
    }
    case "label": {
      const bounds = getLabelBounds(annotation, viewport);
      const [ax, ay] = n2px(annotation.anchor, viewport.width, viewport.height);
      const minX = Math.min(bounds.x, ax);
      const minY = Math.min(bounds.y, ay);
      const maxX = Math.max(bounds.x + bounds.width, ax);
      const maxY = Math.max(bounds.y + bounds.height, ay);
      return {
        x: minX - pad,
        y: minY - pad,
        width: maxX - minX + pad * 2,
        height: maxY - minY + pad * 2,
      };
    }
    case "rect":
      return {
        x: annotation.x * viewport.width - pad,
        y: annotation.y * viewport.height - pad,
        width: annotation.width * viewport.width + pad * 2,
        height: annotation.height * viewport.height + pad * 2,
      };
    case "circle": {
      const radius = annotation.r * Math.min(viewport.width, viewport.height) + pad;
      return {
        x: annotation.cx * viewport.width - radius,
        y: annotation.cy * viewport.height - radius,
        width: radius * 2,
        height: radius * 2,
      };
    }
  }
}
