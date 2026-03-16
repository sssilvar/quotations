"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import type {
  Annotation,
  EditorState,
  LabelPreset,
  Point,
  Tool,
} from "../annotation-types";
import {
  DEFAULT_LABEL_COLOR,
  LABEL_OTHER,
  parseAnnotationData,
  serializeAnnotationData,
} from "../annotation-types";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LABEL_PRESET,
  LABEL_BOX_H,
  LABEL_BOX_OFFSET_X,
  LABEL_BOX_OFFSET_Y,
  LABEL_BOX_W,
  MIN_DRAW_DISTANCE,
  MIN_SHAPE_SIZE,
} from "./constants";
import {
  cloneAnnotation,
  cloneEditorState,
  getLabelLayoutFromValue,
  type Drawing,
  hitTestAnnotation,
  moveAnnotation,
} from "./annotation-utils";
import {
  clampBox,
  clampPoint,
  px2n,
  type Viewport,
  uid,
} from "./geometry";

type DragState =
  | { kind: "move-annotation"; id: string; origin: Point; snapshot: Annotation }
  | { kind: "move-label-box"; id: string; origin: Point; boxStart: Point }
  | { kind: "move-label-anchor"; id: string }
  | { kind: "handle"; id: string; which: "p1" | "p2" };

type TextEditorState = {
  id?: string;
  mode: "new" | "existing";
  position: Point;
  value: string;
  fill: string;
  fontSize: number;
};

type Args = {
  initialAnnotationData: string | null | undefined;
  quotationId: string;
  onSaved: () => void;
};

export function useImageEditorController({
  initialAnnotationData,
  quotationId,
  onSaved,
}: Args) {
  const [state, setState] = useState<EditorState>(() => parseAnnotationData(initialAnnotationData));
  const [history, setHistory] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const [tool, setToolState] = useState<Tool>("select");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [color, setColor] = useState("#000000");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedShapeTool, setSelectedShapeTool] = useState<"shape-rect" | "shape-circle">("shape-rect");
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const [selectedLabelPreset, setSelectedLabelPresetState] = useState<LabelPreset>(DEFAULT_LABEL_PRESET);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelFormText, setLabelFormText] = useState("");
  const [labelFormColor, setLabelFormColor] = useState("");
  const [pendingLabelAnchor, setPendingLabelAnchor] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const viewportRef = useRef<Viewport>({ left: 0, top: 0, width: 0, height: 0 });
  const toolRef = useRef<Tool>(tool);
  const selectedLabelPresetRef = useRef<LabelPreset>(selectedLabelPreset);
  const pendingToolRef = useRef<Tool | null>(null);
  const pendingLabelPresetRef = useRef<LabelPreset | null>(null);
  toolRef.current = tool;
  selectedLabelPresetRef.current = selectedLabelPreset;

  const setTool = useCallback((t: Tool) => {
    setToolState(t);
    pendingToolRef.current = t;
    if (t === "shape-rect" || t === "shape-circle") {
      setSelectedShapeTool(t);
    }
  }, []);
  const setSelectedLabelPreset = useCallback((preset: LabelPreset) => {
    setSelectedLabelPresetState(preset);
    pendingLabelPresetRef.current = preset;
  }, []);

  const annotations = state.annotations;
  const selectedAnnotation = useMemo(
    () => (selectedId ? annotations.find((annotation) => annotation.id === selectedId) ?? null : null),
    [annotations, selectedId],
  );

  const pushHistory = useCallback(() => {
    setHistory((current) => [...current.slice(-49), cloneEditorState(state)]);
    setFuture([]);
  }, [state]);

  const getLabelBoxSize = useCallback((text: string, fontSize: number) => {
    const viewport = viewportRef.current;
    if (viewport.width <= 0 || viewport.height <= 0) {
      return { width: LABEL_BOX_W, height: LABEL_BOX_H };
    }
    const layout = getLabelLayoutFromValue({ x: 0, y: 0 }, text, fontSize, viewport);
    return {
      width: layout.width / viewport.width,
      height: layout.height / viewport.height,
    };
  }, []);

  const addAnnotation = useCallback((annotation: Annotation) => {
    pushHistory();
    setState((current) => ({
      annotations: [...current.annotations, annotation],
    }));
    setSelectedId(annotation.id);
    setDrawing(null);
  }, [pushHistory]);

  const updateAnnotation = useCallback((id: string, updater: (annotation: Annotation) => Annotation) => {
    setState((current) => ({
      annotations: current.annotations.map((annotation) => (
        annotation.id === id ? updater(annotation) : annotation
      )),
    }));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    pushHistory();
    setState((current) => ({
      annotations: current.annotations.filter((annotation) => annotation.id !== selectedId),
    }));
    setSelectedId(null);
    setTextEditor((current) => (current?.id === selectedId ? null : current));
    toast.success("Eliminado");
  }, [pushHistory, selectedId]);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.at(-1);
      if (!previous) return current;
      setFuture((next) => [...next, cloneEditorState(state)]);
      setState(cloneEditorState(previous));
      setSelectedId(null);
      setTextEditor(null);
      return current.slice(0, -1);
    });
  }, [state]);

  const redo = useCallback(() => {
    setFuture((current) => {
      const next = current.at(-1);
      if (!next) return current;
      setHistory((previous) => [...previous.slice(-49), cloneEditorState(state)]);
      setState(cloneEditorState(next));
      setSelectedId(null);
      setTextEditor(null);
      return current.slice(0, -1);
    });
  }, [state]);

  const commitTextEditor = useCallback(() => {
    if (!textEditor) return;
    if (textEditor.mode === "new") {
      const nextValue = textEditor.value.trim();
      if (nextValue) {
        addAnnotation({
          id: uid(),
          type: "text",
          position: textEditor.position,
          text: nextValue,
          fontSize: textEditor.fontSize,
          fill: textEditor.fill,
        });
      }
      setTextEditor(null);
      return;
    }

    const annotation = annotations.find((item) => item.id === textEditor.id);
    if (!annotation || (annotation.type !== "text" && annotation.type !== "label")) {
      setTextEditor(null);
      return;
    }

    const nextValue = textEditor.value.trim();
    updateAnnotation(annotation.id, (current) => {
      if (current.type === "text") {
        return nextValue ? { ...current, text: nextValue } : current;
      }
      if (current.type === "label") {
        if (!nextValue) return current;
        const size = getLabelBoxSize(nextValue, current.fontSize);
        return {
          ...current,
          text: nextValue,
          boxPosition: clampBox(current.boxPosition.x, current.boxPosition.y, size.width, size.height),
        };
      }
      return current;
    });
    setTextEditor(null);
  }, [addAnnotation, annotations, getLabelBoxSize, textEditor, updateAnnotation]);

  const cancelTextEditor = useCallback(() => {
    setTextEditor(null);
  }, []);

  const startTextEditor = useCallback((annotation: Annotation) => {
    if (annotation.type !== "text" && annotation.type !== "label") return;
    setSelectedId(annotation.id);
    setTextEditor({
      mode: "existing",
      id: annotation.id,
      position: annotation.type === "text" ? annotation.position : annotation.boxPosition,
      value: annotation.text,
      fill: annotation.type === "text" ? annotation.fill : annotation.color,
      fontSize: annotation.fontSize,
    });
  }, []);

  const setViewport = useCallback((viewport: Viewport) => {
    viewportRef.current = viewport;
  }, []);

  const getPointFromClientPosition = useCallback((
    currentTarget: SVGSVGElement | SVGCircleElement,
    clientX: number,
    clientY: number,
  ) => {
    const svg =
      currentTarget instanceof SVGSVGElement
        ? currentTarget
        : currentTarget.ownerSVGElement;
    if (!svg) return null;

    const matrix = svg.getScreenCTM();
    const viewBoxWidth = svg.viewBox.baseVal.width || svg.clientWidth;
    const viewBoxHeight = svg.viewBox.baseVal.height || svg.clientHeight;
    if (!matrix || viewBoxWidth <= 0 || viewBoxHeight <= 0) return null;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return clampPoint(px2n(point.x, point.y, viewBoxWidth, viewBoxHeight));
  }, []);

  const getPointFromEvent = useCallback((event: ReactPointerEvent<SVGSVGElement | SVGCircleElement>) => {
    return getPointFromClientPosition(event.currentTarget, event.clientX, event.clientY);
  }, [getPointFromClientPosition]);

  const handleDoubleClick = useCallback((event: ReactMouseEvent<SVGSVGElement>) => {
    if (toolRef.current !== "select") return;

    const point = getPointFromClientPosition(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;

    const hit = hitTestAnnotation(annotations, point, viewportRef.current);
    if (!hit || (hit.type !== "text" && hit.type !== "label")) return;

    startTextEditor(hit);
  }, [annotations, getPointFromClientPosition, startTextEditor]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;

    const point = getPointFromEvent(event);
    if (!point) return;

    const effectiveTool = pendingToolRef.current ?? toolRef.current;
    const effectiveLabelPreset = pendingLabelPresetRef.current ?? selectedLabelPresetRef.current;
    if (effectiveTool !== "select") {
      pendingToolRef.current = null;
      pendingLabelPresetRef.current = null;
    }

    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (textEditor) commitTextEditor();

    if (effectiveTool === "select") {
      const hit = hitTestAnnotation(annotations, point, viewportRef.current);
      if (!hit) {
        setSelectedId(null);
        return;
      }

      setSelectedId(hit.id);

      if (hit.type === "label") {
        pushHistory();
        setDrag({
          kind: "move-label-box",
          id: hit.id,
          origin: point,
          boxStart: { ...hit.boxPosition },
        });
        return;
      }

      pushHistory();
      setDrag({
        kind: "move-annotation",
        id: hit.id,
        origin: point,
        snapshot: cloneAnnotation(hit),
      });
      return;
    }

    if (effectiveTool === "line" || effectiveTool === "arrow") {
      setDrawing({ kind: effectiveTool, p1: point, p2: point });
      return;
    }

    if (effectiveTool === "freehand") {
      setDrawing({ kind: "freehand", points: [point] });
      return;
    }

    if (effectiveTool === "shape-rect") {
      setDrawing({ kind: "rect", x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }

    if (effectiveTool === "shape-circle") {
      setDrawing({ kind: "circle", cx: point.x, cy: point.y, r: 0 });
      return;
    }

    if (effectiveTool === "text") {
      setSelectedId(null);
      setTextEditor({
        mode: "new",
        position: point,
        value: "",
        fontSize: DEFAULT_FONT_SIZE,
        fill: color,
      });
      return;
    }

    if (effectiveTool === "label") {
      if (effectiveLabelPreset.key === LABEL_OTHER.key) {
        setPendingLabelAnchor(point);
        setLabelFormText("");
        setLabelFormColor(LABEL_OTHER.color);
        setLabelDialogOpen(true);
      } else {
        const size = getLabelBoxSize(effectiveLabelPreset.label, DEFAULT_FONT_SIZE);
        addAnnotation({
          id: uid(),
          type: "label",
          anchor: point,
          boxPosition: clampBox(
            point.x + LABEL_BOX_OFFSET_X,
            point.y + LABEL_BOX_OFFSET_Y,
            size.width,
            size.height,
          ),
          text: effectiveLabelPreset.label,
          labelKey: effectiveLabelPreset.key,
          color: effectiveLabelPreset.color,
          strokeWidth,
          fontSize: DEFAULT_FONT_SIZE,
        });
      }
      return;
    }
  }, [
    addAnnotation,
    annotations,
    color,
    commitTextEditor,
    getLabelBoxSize,
    getPointFromEvent,
    getPointFromClientPosition,
    pushHistory,
    startTextEditor,
    textEditor,
  ]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    const point = getPointFromEvent(event);
    if (!point) return;

    if (tool === "label" && !drag && !drawing) setPreviewPoint(point);
    else setPreviewPoint(null);

    if (drag?.kind === "move-label-anchor") {
      updateAnnotation(drag.id, (annotation) => (
        annotation.type === "label" ? { ...annotation, anchor: point } : annotation
      ));
      return;
    }

    if (drag?.kind === "handle") {
      updateAnnotation(drag.id, (annotation) => (
        annotation.type === "line" || annotation.type === "arrow"
          ? { ...annotation, [drag.which]: point }
          : annotation
      ));
      return;
    }

    if (drag?.kind === "move-label-box") {
      const dx = point.x - drag.origin.x;
      const dy = point.y - drag.origin.y;
      updateAnnotation(drag.id, (annotation) => (
        annotation.type === "label" ? (() => {
          const size = getLabelBoxSize(annotation.text, annotation.fontSize);
          return {
            ...annotation,
            boxPosition: clampBox(
              drag.boxStart.x + dx,
              drag.boxStart.y + dy,
              size.width,
              size.height,
            ),
          };
        })() : annotation
      ));
      return;
    }

    if (drag?.kind === "move-annotation") {
      const dx = point.x - drag.origin.x;
      const dy = point.y - drag.origin.y;
      updateAnnotation(drag.id, (annotation) => (
        annotation.id === drag.snapshot.id ? moveAnnotation(drag.snapshot, dx, dy) : annotation
      ));
      return;
    }

    if (!drawing) return;

    if (drawing.kind === "line" || drawing.kind === "arrow") {
      setDrawing({ ...drawing, p2: point });
      return;
    }

    if (drawing.kind === "freehand") {
      setDrawing({ ...drawing, points: [...drawing.points, point] });
      return;
    }

    if (drawing.kind === "rect") {
      setDrawing({
        ...drawing,
        width: point.x - drawing.x,
        height: point.y - drawing.y,
      });
      return;
    }

    if (drawing.kind === "circle") {
      setDrawing({
        ...drawing,
        r: Math.hypot(point.x - drawing.cx, point.y - drawing.cy),
      });
    }
  }, [drag, drawing, getLabelBoxSize, getPointFromEvent, tool, updateAnnotation]);

  const finishInteraction = useCallback(() => {
    if (drag) {
      setDrag(null);
      return;
    }

    if (!drawing) return;

    if (drawing.kind === "line" || drawing.kind === "arrow") {
      if (Math.hypot(drawing.p2.x - drawing.p1.x, drawing.p2.y - drawing.p1.y) > MIN_DRAW_DISTANCE) {
        addAnnotation({
          id: uid(),
          type: drawing.kind,
          p1: drawing.p1,
          p2: drawing.p2,
          stroke: color,
          strokeWidth,
        });
      }
    } else if (drawing.kind === "freehand" && drawing.points.length >= 2) {
      addAnnotation({
        id: uid(),
        type: "freehand",
        points: drawing.points,
        stroke: color,
        strokeWidth,
      });
    } else if (
      drawing.kind === "rect" &&
      (Math.abs(drawing.width) > MIN_SHAPE_SIZE || Math.abs(drawing.height) > MIN_SHAPE_SIZE)
    ) {
      addAnnotation({
        id: uid(),
        type: "rect",
        x: Math.min(drawing.x, drawing.x + drawing.width),
        y: Math.min(drawing.y, drawing.y + drawing.height),
        width: Math.abs(drawing.width),
        height: Math.abs(drawing.height),
        stroke: color,
        strokeWidth,
      });
    } else if (drawing.kind === "circle" && drawing.r > MIN_SHAPE_SIZE) {
      addAnnotation({
        id: uid(),
        type: "circle",
        cx: drawing.cx,
        cy: drawing.cy,
        r: drawing.r,
        stroke: color,
        strokeWidth,
      });
    }

    setDrawing(null);
  }, [addAnnotation, color, drag, drawing, strokeWidth]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<SVGSVGElement>) => {
    if (pointerIdRef.current === event.pointerId && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerIdRef.current = null;
    finishInteraction();
  }, [finishInteraction]);

  const startLineHandleDrag = useCallback((
    event: ReactPointerEvent<SVGCircleElement>,
    which: "p1" | "p2",
  ) => {
    event.stopPropagation();
    const annotation = selectedAnnotation;
    if (!annotation || (annotation.type !== "line" && annotation.type !== "arrow")) return;
    const owner = event.currentTarget.ownerSVGElement;
    if (owner) {
      pointerIdRef.current = event.pointerId;
      owner.setPointerCapture(event.pointerId);
    }
    pushHistory();
    setDrag({ kind: "handle", id: annotation.id, which });
  }, [pushHistory, selectedAnnotation]);

  const startLabelAnchorDrag = useCallback((event: ReactPointerEvent<SVGCircleElement>) => {
    event.stopPropagation();
    if (selectedAnnotation?.type !== "label") return;
    const owner = event.currentTarget.ownerSVGElement;
    if (owner) {
      pointerIdRef.current = event.pointerId;
      owner.setPointerCapture(event.pointerId);
    }
    pushHistory();
    setDrag({ kind: "move-label-anchor", id: selectedAnnotation.id });
  }, [pushHistory, selectedAnnotation]);

  const changeStrokeWidth = useCallback((nextStrokeWidth: number) => {
    setStrokeWidth(nextStrokeWidth);
    if (!selectedAnnotation) return;
    if (
      selectedAnnotation.type === "line" ||
      selectedAnnotation.type === "arrow" ||
      selectedAnnotation.type === "rect" ||
      selectedAnnotation.type === "circle" ||
      selectedAnnotation.type === "freehand" ||
      selectedAnnotation.type === "label"
    ) {
      updateAnnotation(selectedAnnotation.id, (annotation) => ({
        ...annotation,
        strokeWidth: nextStrokeWidth,
      }));
    }
  }, [selectedAnnotation, updateAnnotation]);

  const changeColor = useCallback((nextColor: string) => {
    setColor(nextColor);
    if (!selectedAnnotation) return;

    if (
      selectedAnnotation.type === "line" ||
      selectedAnnotation.type === "arrow" ||
      selectedAnnotation.type === "rect" ||
      selectedAnnotation.type === "circle" ||
      selectedAnnotation.type === "freehand"
    ) {
      updateAnnotation(selectedAnnotation.id, (annotation) => ({
        ...annotation,
        stroke: nextColor,
      }));
      return;
    }

    if (selectedAnnotation.type === "text") {
      updateAnnotation(selectedAnnotation.id, (annotation) => ({
        ...annotation,
        fill: nextColor,
      }));
      return;
    }

    if (selectedAnnotation.type === "label") {
      updateAnnotation(selectedAnnotation.id, (annotation) => ({
        ...annotation,
        color: nextColor,
      }));
    }
  }, [selectedAnnotation, updateAnnotation]);

  const confirmCustomLabel = useCallback(() => {
    if (!pendingLabelAnchor) return;
    const text = labelFormText.trim() || "Etiqueta";
    const size = getLabelBoxSize(text, DEFAULT_FONT_SIZE);
    addAnnotation({
      id: uid(),
      type: "label",
      anchor: pendingLabelAnchor,
      boxPosition: clampBox(
        pendingLabelAnchor.x + LABEL_BOX_OFFSET_X,
        pendingLabelAnchor.y + LABEL_BOX_OFFSET_Y,
        size.width,
        size.height,
      ),
      text,
      labelKey: "other",
      color: labelFormColor || DEFAULT_LABEL_COLOR,
      strokeWidth,
      fontSize: DEFAULT_FONT_SIZE,
    });
    setLabelDialogOpen(false);
    setPendingLabelAnchor(null);
  }, [addAnnotation, getLabelBoxSize, labelFormColor, labelFormText, pendingLabelAnchor, strokeWidth]);

  const closeLabelDialog = useCallback(() => {
    setLabelDialogOpen(false);
    setPendingLabelAnchor(null);
    setTool("select");
  }, []);

  const save = useCallback(async () => {
    const payloadState = textEditor
      ? {
          annotations:
            textEditor.mode === "new"
              ? (
                  textEditor.value.trim()
                    ? [
                        ...state.annotations,
                        {
                          id: uid(),
                          type: "text" as const,
                          position: textEditor.position,
                          text: textEditor.value.trim(),
                          fontSize: textEditor.fontSize,
                          fill: textEditor.fill,
                        },
                      ]
                    : state.annotations
                )
              : state.annotations.map((annotation) => {
                  if (annotation.id !== textEditor.id) return annotation;
                  if (annotation.type === "text") {
                    return textEditor.value.trim() ? { ...annotation, text: textEditor.value.trim() } : annotation;
                  }
                  if (annotation.type === "label") {
                    if (!textEditor.value.trim()) return annotation;
                    const size = getLabelBoxSize(textEditor.value.trim(), annotation.fontSize);
                    return {
                      ...annotation,
                      text: textEditor.value.trim(),
                      boxPosition: clampBox(annotation.boxPosition.x, annotation.boxPosition.y, size.width, size.height),
                    };
                  }
                  return annotation;
                }),
        }
      : state;

    if (textEditor) {
      commitTextEditor();
    }
    const response = await fetch(`/api/quotations/${quotationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ annotationData: serializeAnnotationData(payloadState) }),
    });
    if (!response.ok) {
      toast.error("Error al guardar");
      return;
    }
    toast.success("Anotaciones guardadas");
    onSaved();
  }, [commitTextEditor, getLabelBoxSize, onSaved, quotationId, state, textEditor]);

  return {
    annotations,
    color,
    drawing,
    futureLength: future.length,
    historyLength: history.length,
    labelDialogOpen,
    labelFormColor,
    labelFormText,
    previewPoint,
    selectedAnnotation,
    selectedLabelPreset,
    selectedShapeTool,
    strokeWidth,
    textEditor,
    tool,
    changeColor,
    changeStrokeWidth,
    closeLabelDialog,
    commitTextEditor,
    confirmCustomLabel,
    deleteSelected,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    redo,
    save,
    setLabelDialogOpen,
    setLabelFormColor,
    setLabelFormText,
    setSelectedLabelPreset,
    setTextEditor,
    setTool,
    setViewport,
    startLabelAnchorDrag,
    startLineHandleDrag,
    undo,
    cancelTextEditor,
  };
}
