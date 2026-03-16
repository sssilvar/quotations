"use client";

import Image from "next/image";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Annotation, Tool } from "../annotation-types";
import {
  DEFAULT_FONT_SIZE,
  LABEL_BOX_OFFSET_X,
  LABEL_BOX_OFFSET_Y,
  LABEL_NOTCH_HALF,
  LABEL_RADIUS,
} from "./constants";
import {
  calloutPath,
  clampBox,
  n2px,
  type Viewport,
} from "./geometry";
import {
  type Drawing,
  getLabelLayout,
  getLabelLayoutFromValue,
  getLabelBounds,
  getSelectionBounds,
  getTextBoundsFromValue,
  getTextBounds,
  getTextMetrics,
} from "./annotation-utils";

type TextEditorState = {
  id?: string;
  mode: "new" | "existing";
  position: { x: number; y: number };
  value: string;
  fill: string;
  fontSize: number;
};

type Props = {
  imageUrl: string;
  onImageLoad: () => void;
  viewport: Viewport;
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  drawing: Drawing | null;
  previewPoint: { x: number; y: number } | null;
  textEditor: TextEditorState | null;
  tool: Tool;
  color: string;
  strokeWidth: number;
  previewLabelColor: string;
  previewLabelText: string;
  previewLabelStrokeWidth: number;
  interactive?: boolean;
  className?: string;
  imageClassName?: string;
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onDoubleClick: (event: ReactMouseEvent<SVGSVGElement>) => void;
  onLineHandlePointerDown: (event: ReactPointerEvent<SVGCircleElement>, which: "p1" | "p2") => void;
  onLabelAnchorPointerDown: (event: ReactPointerEvent<SVGCircleElement>) => void;
  onTextEditorChange: (value: string) => void;
  onTextEditorCommit: () => void;
  onTextEditorCancel: () => void;
};

export function ImageEditorCanvas({
  imageUrl,
  onImageLoad,
  viewport,
  annotations,
  selectedAnnotation,
  drawing,
  previewPoint,
  textEditor,
  tool,
  color,
  strokeWidth,
  previewLabelColor,
  previewLabelText,
  previewLabelStrokeWidth,
  interactive = true,
  className,
  imageClassName,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDoubleClick,
  onLineHandlePointerDown,
  onLabelAnchorPointerDown,
  onTextEditorChange,
  onTextEditorCommit,
  onTextEditorCancel,
}: Props) {
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const focusedEditorKeyRef = useRef<string | null>(null);
  const editingAnnotation =
    textEditor?.mode === "existing" && textEditor.id
      ? annotations.find((annotation) => annotation.id === textEditor.id) ?? null : null;
  const draftTextInputBounds =
    textEditor?.mode === "new"
      ? getTextBoundsFromValue(textEditor.position, textEditor.value || " ", textEditor.fontSize, viewport)
      : null;
  const editorKey = textEditor
    ? `${textEditor.mode}:${textEditor.id ?? "new"}:${textEditor.position.x}:${textEditor.position.y}`
    : null;

  useEffect(() => {
    if (!textEditor || !editorKey) return;
    const input = textInputRef.current;
    if (!input) return;
    if (focusedEditorKeyRef.current === editorKey) return;
    const frame = window.requestAnimationFrame(() => {
      focusedEditorKeyRef.current = editorKey;
      input.focus();
      const length = input.value.length;
      input.setSelectionRange(length, length);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editorKey, textEditor]);

  useEffect(() => {
    if (!textEditor) {
      focusedEditorKeyRef.current = null;
    }
  }, [textEditor]);

  function handleWheelCapture(event: ReactWheelEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (target && ["TEXTAREA", "INPUT", "SELECT"].includes(target.tagName)) {
      return;
    }

    let parent = event.currentTarget.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const canScrollY =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        parent.scrollHeight > parent.clientHeight;
      const canScrollX =
        (style.overflowX === "auto" || style.overflowX === "scroll") &&
        parent.scrollWidth > parent.clientWidth;

      if (canScrollY || canScrollX) {
        parent.scrollBy({
          top: event.deltaY,
          left: event.deltaX,
          behavior: "auto",
        });
        event.preventDefault();
        return;
      }

      parent = parent.parentElement;
    }
  }

  return (
    <div
      className={cn("relative overflow-hidden overscroll-none rounded-lg border bg-muted/20", className)}
      onWheelCapture={handleWheelCapture}
    >
      <Image
        src={imageUrl}
        alt="Visita técnica"
        width={1600}
        height={1200}
        unoptimized
        sizes="(max-width: 768px) 100vw, 900px"
        className={cn(
          "pointer-events-none block h-auto max-h-[420px] w-full object-contain",
          imageClassName,
        )}
        draggable={false}
        onLoad={onImageLoad}
      />

      {viewport.width > 0 && viewport.height > 0 && (
        <>
          <svg
            className="absolute"
            style={{
              left: viewport.left,
              top: viewport.top,
              width: viewport.width,
              height: viewport.height,
              touchAction: interactive ? "none" : "auto",
              pointerEvents: interactive ? "auto" : "none",
              cursor: interactive ? (tool === "select" ? "default" : "crosshair") : "default",
            }}
            viewBox={`0 0 ${viewport.width} ${viewport.height}`}
            onPointerDown={interactive ? onPointerDown : undefined}
            onPointerMove={interactive ? onPointerMove : undefined}
            onPointerUp={interactive ? onPointerUp : undefined}
            onPointerCancel={interactive ? onPointerUp : undefined}
            onDoubleClick={interactive ? onDoubleClick : undefined}
          >
            <defs>
              {annotations
                .map((annotation) => {
                  if (annotation.type !== "arrow") return null;
                  return (
                    <marker
                      key={annotation.id}
                      id={`ah-${annotation.id}`}
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill={annotation.stroke} />
                    </marker>
                  );
                })}
              <marker id="ah-draw" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill={color} />
              </marker>
            </defs>

            {annotations.map((annotation) => {
              switch (annotation.type) {
                case "line":
                case "arrow": {
                  const [x1, y1] = n2px(annotation.p1, viewport.width, viewport.height);
                  const [x2, y2] = n2px(annotation.p2, viewport.width, viewport.height);
                  return (
                    <line
                      key={annotation.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={annotation.stroke}
                      strokeWidth={annotation.strokeWidth}
                      markerEnd={annotation.type === "arrow" ? `url(#ah-${annotation.id})` : undefined}
                    />
                  );
                }
                case "freehand": {
                  const path = annotation.points
                    .map((point, index) => {
                      const [x, y] = n2px(point, viewport.width, viewport.height);
                      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                    })
                    .join(" ");

                  return (
                    <path
                      key={annotation.id}
                      d={path}
                      fill="none"
                      stroke={annotation.stroke}
                      strokeWidth={annotation.strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }
                case "text": {
                  if (editingAnnotation?.id === annotation.id) return null;
                  const metrics = getTextMetrics(annotation.text, annotation.fontSize);
                  const [x, y] = n2px(annotation.position, viewport.width, viewport.height);
                  return (
                    <text
                      key={annotation.id}
                      x={x}
                      y={y}
                      fill={annotation.fill}
                      fontSize={annotation.fontSize}
                      fontWeight="bold"
                    >
                      {metrics.lines.map((line, index) => (
                        <tspan key={`${annotation.id}-${index}`} x={x} dy={index === 0 ? 0 : metrics.lineHeight}>
                          {line || " "}
                        </tspan>
                      ))}
                    </text>
                  );
                }
                case "label": {
                  const [ax, ay] = n2px(annotation.anchor, viewport.width, viewport.height);
                  const layout = getLabelLayout(annotation, viewport);
                  const bounds = getLabelBounds(annotation, viewport);
                  return (
                    <g key={annotation.id}>
                      <path
                        d={calloutPath(
                          bounds.x,
                          bounds.y,
                          bounds.width,
                          bounds.height,
                          ax,
                          ay,
                          LABEL_RADIUS,
                          LABEL_NOTCH_HALF,
                        )}
                        fill="white"
                        stroke={annotation.color}
                        strokeWidth={annotation.strokeWidth}
                      />
                      {editingAnnotation?.id !== annotation.id && (
                        <text
                          x={bounds.x + bounds.width / 2}
                          y={bounds.y + layout.textTop + annotation.fontSize * 0.82}
                          fill={annotation.color}
                          fontSize={annotation.fontSize}
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {layout.lines.map((line, index) => (
                            <tspan
                              key={`${annotation.id}-${index}`}
                              x={bounds.x + bounds.width / 2}
                              dy={index === 0 ? 0 : layout.lineHeight}
                            >
                              {line || " "}
                            </tspan>
                          ))}
                        </text>
                      )}
                    </g>
                  );
                }
                case "rect":
                  return (
                    <rect
                      key={annotation.id}
                      x={annotation.x * viewport.width}
                      y={annotation.y * viewport.height}
                      width={annotation.width * viewport.width}
                      height={annotation.height * viewport.height}
                      fill="none"
                      stroke={annotation.stroke}
                      strokeWidth={annotation.strokeWidth}
                    />
                  );
                case "circle":
                  return (
                    <circle
                      key={annotation.id}
                      cx={annotation.cx * viewport.width}
                      cy={annotation.cy * viewport.height}
                      r={annotation.r * Math.min(viewport.width, viewport.height)}
                      fill="none"
                      stroke={annotation.stroke}
                      strokeWidth={annotation.strokeWidth}
                    />
                  );
              }
            })}

            {drawing && (drawing.kind === "line" || drawing.kind === "arrow") && (
              <line
                x1={n2px(drawing.p1, viewport.width, viewport.height)[0]}
                y1={n2px(drawing.p1, viewport.width, viewport.height)[1]}
                x2={n2px(drawing.p2, viewport.width, viewport.height)[0]}
                y2={n2px(drawing.p2, viewport.width, viewport.height)[1]}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray="4"
                markerEnd={drawing.kind === "arrow" ? "url(#ah-draw)" : undefined}
              />
            )}

            {drawing?.kind === "freehand" && drawing.points.length >= 2 && (
              <path
                d={drawing.points
                  .map((point, index) => {
                    const [x, y] = n2px(point, viewport.width, viewport.height);
                    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray="4"
                strokeLinecap="round"
              />
            )}

            {drawing?.kind === "rect" && (
              <rect
                x={Math.min(drawing.x, drawing.x + drawing.width) * viewport.width}
                y={Math.min(drawing.y, drawing.y + drawing.height) * viewport.height}
                width={Math.abs(drawing.width) * viewport.width}
                height={Math.abs(drawing.height) * viewport.height}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray="4"
              />
            )}

            {drawing?.kind === "circle" && drawing.r > 0 && (
              <circle
                cx={drawing.cx * viewport.width}
                cy={drawing.cy * viewport.height}
                r={drawing.r * Math.min(viewport.width, viewport.height)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray="4"
              />
            )}

            {interactive && previewPoint && tool === "label" && (() => {
              const previewLayout = getLabelLayoutFromValue(
                { x: 0, y: 0 },
                previewLabelText || "Etiqueta",
                DEFAULT_FONT_SIZE,
                viewport,
              );
              const box = clampBox(
                previewPoint.x + LABEL_BOX_OFFSET_X,
                previewPoint.y + LABEL_BOX_OFFSET_Y,
                previewLayout.width / viewport.width,
                previewLayout.height / viewport.height,
              );
              const bx = box.x * viewport.width;
              const by = box.y * viewport.height;
              const bw = previewLayout.width;
              const bh = previewLayout.height;
              const ax = previewPoint.x * viewport.width;
              const ay = previewPoint.y * viewport.height;
              return (
                <path
                  d={calloutPath(bx, by, bw, bh, ax, ay, LABEL_RADIUS, LABEL_NOTCH_HALF)}
                  fill="rgba(255,255,255,0.4)"
                  stroke={previewLabelColor}
                  strokeWidth={previewLabelStrokeWidth}
                  strokeDasharray="4"
                  opacity={0.7}
                />
              );
            })()}

            {interactive && selectedAnnotation && (() => {
              const bounds = getSelectionBounds(selectedAnnotation, viewport);
              if (!bounds) return null;
              return (
                <rect
                  x={bounds.x}
                  y={bounds.y}
                  width={bounds.width}
                  height={bounds.height}
                  fill="none"
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  rx={2}
                />
              );
            })()}

            {interactive && selectedAnnotation && (selectedAnnotation.type === "line" || selectedAnnotation.type === "arrow") && (
              <>
                {(["p1", "p2"] as const).map((which) => {
                  const point = selectedAnnotation[which];
                  const [x, y] = n2px(point, viewport.width, viewport.height);
                  return (
                    <circle
                      key={which}
                      cx={x}
                      cy={y}
                      r={4}
                      fill="white"
                      stroke="hsl(221, 83%, 53%)"
                      strokeWidth={2}
                      style={{ cursor: "move" }}
                      onPointerDown={(event) => onLineHandlePointerDown(event, which)}
                    />
                  );
                })}
              </>
            )}

            {interactive && selectedAnnotation?.type === "label" && (() => {
              const [x, y] = n2px(selectedAnnotation.anchor, viewport.width, viewport.height);
              return (
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill="white"
                  stroke={selectedAnnotation.color}
                  strokeWidth={2}
                  style={{ cursor: "move" }}
                  onPointerDown={onLabelAnchorPointerDown}
                />
              );
            })()}
          </svg>

          {interactive && editingAnnotation?.type === "text" && (
            <textarea
              id={`annotation-text-${editingAnnotation.id}`}
              name={`annotation-text-${editingAnnotation.id}`}
              autoComplete="off"
              placeholder="Texto"
              value={textEditor?.value ?? ""}
              onChange={(event) => onTextEditorChange(event.target.value)}
              onBlur={onTextEditorCommit}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onTextEditorCommit();
                }
                if (event.key === "Escape") onTextEditorCancel();
              }}
              ref={textInputRef}
              className="absolute z-10 resize-none overflow-hidden rounded border border-border bg-background/95 px-2 py-1 font-semibold whitespace-pre-wrap outline-none ring-1 ring-border/50"
              style={{
                left: viewport.left + getTextBounds(editingAnnotation, viewport).x - 4,
                top: viewport.top + getTextBounds(editingAnnotation, viewport).y - 2,
                width: Math.max(140, getTextBounds(editingAnnotation, viewport).width + 16),
                height: getTextBounds(editingAnnotation, viewport).height + 4,
                color: editingAnnotation.fill,
                fontSize: editingAnnotation.fontSize,
              }}
            />
          )}

          {interactive && editingAnnotation?.type === "label" && (() => {
            const bounds = getLabelBounds(editingAnnotation, viewport);
            const layout = getLabelLayout(editingAnnotation, viewport);
            return (
            <textarea
              id={`annotation-label-${editingAnnotation.id}`}
              name={`annotation-label-${editingAnnotation.id}`}
              autoComplete="off"
              placeholder="Etiqueta"
              value={textEditor?.value ?? ""}
              onChange={(event) => onTextEditorChange(event.target.value)}
              onBlur={onTextEditorCommit}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onTextEditorCommit();
                }
                if (event.key === "Escape") onTextEditorCancel();
              }}
              ref={textInputRef}
              className="absolute z-10 resize-none overflow-hidden rounded border-none bg-transparent px-2 font-semibold whitespace-pre-wrap outline-none ring-1 ring-border/40"
              style={{
                left: viewport.left + bounds.x + 4,
                top: viewport.top + bounds.y + Math.max(4, layout.textTop - 2),
                width: bounds.width - 8,
                height: Math.max(28, bounds.height - Math.max(8, layout.textTop)),
                color: editingAnnotation.color,
                fontSize: editingAnnotation.fontSize,
              }}
            />
          )})()}

          {interactive && textEditor?.mode === "new" && draftTextInputBounds && (
            <textarea
              id="annotation-text-new"
              name="annotation-text-new"
              autoComplete="off"
              placeholder="Texto"
              value={textEditor.value}
              onChange={(event) => onTextEditorChange(event.target.value)}
              onBlur={onTextEditorCommit}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onTextEditorCommit();
                }
                if (event.key === "Escape") onTextEditorCancel();
              }}
              ref={textInputRef}
              className="absolute z-10 resize-none overflow-hidden rounded border border-border bg-background/95 px-2 py-1 font-semibold whitespace-pre-wrap outline-none ring-1 ring-border/50"
              style={{
                left: viewport.left + draftTextInputBounds.x - 4,
                top: viewport.top + draftTextInputBounds.y - 2,
                width: Math.max(140, draftTextInputBounds.width + 24),
                height: draftTextInputBounds.height + 4,
                color: textEditor.fill,
                fontSize: textEditor.fontSize,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
