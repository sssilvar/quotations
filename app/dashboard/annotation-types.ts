/** Normalized point (0–1) in image space */
export type Point = { x: number; y: number };

export type Tool =
  | "select"
  | "freehand"
  | "line"
  | "arrow"
  | "text"
  | "label"
  | "shape-rect"
  | "shape-circle";

export interface LineAnnotation {
  id: string;
  type: "line" | "arrow";
  p1: Point;
  p2: Point;
  stroke: string;
  strokeWidth: number;
}

export interface FreehandAnnotation {
  id: string;
  type: "freehand";
  points: Point[];
  stroke: string;
  strokeWidth: number;
}

export interface TextAnnotation {
  id: string;
  type: "text";
  position: Point;
  text: string;
  fontSize: number;
  fill: string;
}

export interface LabelAnnotation {
  id: string;
  type: "label";
  anchor: Point;
  boxPosition: Point;
  text: string;
  labelKey: string;
  color: string;
  strokeWidth: number;
  fontSize: number;
}

export interface RectShapeAnnotation {
  id: string;
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  strokeWidth: number;
}

export interface CircleShapeAnnotation {
  id: string;
  type: "circle";
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  strokeWidth: number;
}

export type Annotation =
  | LineAnnotation
  | FreehandAnnotation
  | TextAnnotation
  | LabelAnnotation
  | RectShapeAnnotation
  | CircleShapeAnnotation;

export interface LabelPreset {
  key: string;
  label: string;
  color: string;
}

export const LABEL_PRESETS: LabelPreset[] = [
  { key: "acometida-dc", label: "Acometida DC", color: "#f97316" },
  { key: "acometida-ac", label: "Acometida AC", color: "#dc2626" },
  { key: "caja-paso", label: "Caja de paso", color: "#1d4ed8" },
  { key: "inversor", label: "Inversor", color: "#65a30d" },
  { key: "tablero-fv", label: "Tablero FV", color: "#0ea5e9" },
  { key: "punto-inyeccion", label: "Punto de inyección", color: "#0ea5e9" },
  { key: "paneles-techo", label: "Paneles en techo", color: "#d97706" },
  { key: "paneles-placa", label: "Paneles en placa", color: "#d97706" },
  { key: "paneles-suelo", label: "Paneles en suelo", color: "#d97706" },
  { key: "transformador", label: "Transformador", color: "#64748b" },
];

export const DEFAULT_LABEL_COLOR = "#3B82F6";
export const LABEL_OTHER: LabelPreset = { key: "other", label: "Otro…", color: DEFAULT_LABEL_COLOR };

export interface EditorState {
  annotations: Annotation[];
}

export function parseAnnotationData(json: string | null | undefined): EditorState {
  if (!json?.trim()) return { annotations: [] };
  try {
    const parsed = JSON.parse(json) as EditorState;
    return {
      annotations: Array.isArray(parsed?.annotations)
        ? parsed.annotations.map((annotation) => {
            if (annotation?.type !== "label") return annotation;
            return {
              ...annotation,
              strokeWidth:
                typeof annotation.strokeWidth === "number" && Number.isFinite(annotation.strokeWidth)
                  ? annotation.strokeWidth
                  : 2,
            };
          })
        : [],
    };
  } catch {
    return { annotations: [] };
  }
}

export function serializeAnnotationData(state: EditorState): string {
  return JSON.stringify(state);
}
