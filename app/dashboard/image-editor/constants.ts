import { LABEL_PRESETS } from "../annotation-types";

export const LABEL_BOX_W = 0.24;
export const LABEL_BOX_MAX_W = 0.42;
export const LABEL_BOX_H = 0.06;
export const LABEL_BOX_OFFSET_X = 0.03;
export const LABEL_BOX_OFFSET_Y = -0.06;
export const DEFAULT_FONT_SIZE = 14;
export const STROKE_WIDTHS = [1, 2, 3, 4, 5] as const;
export const COLORS = ["#000000", "#DC2626", "#2563EB", "#16A34A", "#CA8A04", "#7C3AED"] as const;
export const LABEL_NOTCH_HALF = 8;
export const LABEL_RADIUS = 6;
export const HIT_TOLERANCE = 8;
export const SEL_PAD = 6;
export const MIN_DRAW_DISTANCE = 0.005;
export const MIN_SHAPE_SIZE = 0.01;
export const DEFAULT_LABEL_PRESET = LABEL_PRESETS[0];
