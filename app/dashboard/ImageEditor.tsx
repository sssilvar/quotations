"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Tool } from "./annotation-types";
import { ImageEditorCanvas } from "./image-editor/ImageEditorCanvas";
import { LabelDialog } from "./image-editor/LabelDialog";
import { ImageEditorToolbar } from "./image-editor/ImageEditorToolbar";
import { useImageEditorController } from "./image-editor/useImageEditorController";
import type { Viewport } from "./image-editor/geometry";

type Props = {
  imageUrl: string;
  initialAnnotationData: string | null | undefined;
  quotationId: string;
  onSaved: () => void;
};

export type ImageEditorRef = { save: () => Promise<void> };

function useMeasuredViewport(imageUrl: string) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewportState] = useState<Viewport>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const measure = useCallback(() => {
    const wrapper = wrapperRef.current;
    const image = wrapper?.querySelector("img");
    if (!wrapper || !image) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const naturalWidth = (image as HTMLImageElement).naturalWidth || imageRect.width;
    const naturalHeight = (image as HTMLImageElement).naturalHeight || imageRect.height;
    if (naturalWidth <= 0 || naturalHeight <= 0) return;
    const scale = Math.min(imageRect.width / naturalWidth, imageRect.height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const offsetX = (imageRect.width - renderedWidth) / 2;
    const offsetY = (imageRect.height - renderedHeight) / 2;

    setViewportState({
      left: imageRect.left - wrapperRect.left + offsetX,
      top: imageRect.top - wrapperRect.top + offsetY,
      width: renderedWidth,
      height: renderedHeight,
    });
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    const image = wrapper.querySelector("img");
    if (image) observer.observe(image);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [imageUrl, measure]);

  return { wrapperRef, viewport, measure };
}

export const ImageEditor = forwardRef<ImageEditorRef, Props>(function ImageEditor(
  { imageUrl, initialAnnotationData, quotationId, onSaved },
  ref,
) {
  const inlineSurface = useMeasuredViewport(imageUrl);
  const expandedSurface = useMeasuredViewport(imageUrl);
  const [expandedOpen, setExpandedOpen] = useState(false);
  const controller = useImageEditorController({
    initialAnnotationData,
    quotationId,
    onSaved,
  });
  const setViewport = controller.setViewport;
  const save = controller.save;
  const activeSurface = expandedOpen ? expandedSurface : inlineSurface;

  useEffect(() => {
    setViewport(activeSurface.viewport);
  }, [activeSurface.viewport, setViewport]);

  const setTool = useCallback((tool: Tool) => {
    controller.setTool(tool);
  }, [controller]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (!controller.selectedAnnotation || controller.textEditor || controller.labelDialogOpen) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      controller.deleteSelected();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controller]);

  const renderEditorSurface = useCallback((
    surface: ReturnType<typeof useMeasuredViewport>,
    options?: { expanded?: boolean },
  ) => {
    const expanded = options?.expanded ?? false;
    return (
      <div className={expanded ? "flex h-full min-h-0 flex-col gap-2 overflow-hidden" : "space-y-2"}>
        <ImageEditorToolbar
          tool={controller.tool}
          selectedAnnotation={controller.selectedAnnotation}
          selectedLabelPreset={controller.selectedLabelPreset}
          selectedShapeTool={controller.selectedShapeTool}
          strokeWidth={controller.strokeWidth}
          color={controller.color}
          historyLength={controller.historyLength}
          futureLength={controller.futureLength}
          onToolChange={setTool}
          onLabelPresetChange={controller.setSelectedLabelPreset}
          onStrokeWidthChange={controller.changeStrokeWidth}
          onColorChange={controller.changeColor}
          onUndo={controller.undo}
          onRedo={controller.redo}
          onExpandEditor={() => setExpandedOpen(true)}
          showExpandButton={!expanded}
          onDeleteSelected={controller.deleteSelected}
        />

        <div
          ref={surface.wrapperRef}
          className={expanded ? "min-h-0 flex-1 overflow-hidden rounded-xl bg-muted/30 p-3" : undefined}
        >
          <ImageEditorCanvas
            imageUrl={imageUrl}
            onImageLoad={surface.measure}
            viewport={surface.viewport}
            annotations={controller.annotations}
            selectedAnnotation={controller.selectedAnnotation}
            drawing={controller.drawing}
            previewPoint={controller.previewPoint}
            textEditor={controller.textEditor}
            tool={controller.tool}
            color={controller.color}
            strokeWidth={controller.strokeWidth}
            previewLabelColor={controller.selectedLabelPreset.color}
            previewLabelText={controller.selectedLabelPreset.label}
            previewLabelStrokeWidth={controller.strokeWidth}
            imageClassName={expanded ? "max-h-[calc(100vh-6.5rem)]" : undefined}
            onPointerDown={controller.handlePointerDown}
            onPointerMove={controller.handlePointerMove}
            onPointerUp={controller.handlePointerUp}
            onDoubleClick={controller.handleDoubleClick}
            onLineHandlePointerDown={controller.startLineHandleDrag}
            onLabelAnchorPointerDown={controller.startLabelAnchorDrag}
            onTextEditorChange={(value) => controller.setTextEditor((current) => current ? { ...current, value } : current)}
            onTextEditorCommit={controller.commitTextEditor}
            onTextEditorCancel={controller.cancelTextEditor}
          />
        </div>
      </div>
    );
  }, [controller, imageUrl, setTool]);

  return (
    <div className="space-y-2">
      {!expandedOpen && renderEditorSurface(inlineSurface)}

      <Dialog open={expandedOpen} onOpenChange={setExpandedOpen}>
        <DialogContent
          showCloseButton={false}
          className="h-[calc(100vh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] overflow-hidden gap-0 p-0 sm:max-w-[calc(100vw-0.75rem)]"
        >
          <div className="relative flex items-center justify-between border-b px-4 py-3 pr-12">
            <DialogHeader>
              <DialogTitle>Editor ampliado</DialogTitle>
            </DialogHeader>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2"
              onClick={() => setExpandedOpen(false)}
              title="Cerrar"
            >
              <XIcon />
            </Button>
          </div>

          <div className="min-h-0 flex-1 p-3">
            {renderEditorSurface(expandedSurface, { expanded: true })}
          </div>
        </DialogContent>
      </Dialog>

      <LabelDialog
        open={controller.labelDialogOpen}
        text={controller.labelFormText}
        color={controller.labelFormColor}
        onTextChange={controller.setLabelFormText}
        onColorChange={controller.setLabelFormColor}
        onOpenChange={(open) => {
          if (open) controller.setLabelDialogOpen(true);
          else controller.closeLabelDialog();
        }}
        onConfirm={controller.confirmCustomLabel}
        onCancel={controller.closeLabelDialog}
      />
    </div>
  );
});
