"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight,
  ChevronDown,
  Circle as CircleIcon,
  Expand,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  Tag,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import type { Annotation, LabelPreset, Tool } from "../annotation-types";
import { LABEL_OTHER, LABEL_PRESETS } from "../annotation-types";
import { COLORS, STROKE_WIDTHS } from "./constants";

type Props = {
  tool: Tool;
  selectedAnnotation: Annotation | null;
  selectedLabelPreset: LabelPreset;
  selectedShapeTool: "shape-rect" | "shape-circle";
  strokeWidth: number;
  color: string;
  historyLength: number;
  futureLength: number;
  onToolChange: (tool: Tool) => void;
  onLabelPresetChange: (preset: LabelPreset) => void;
  onStrokeWidthChange: (width: number) => void;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onExpandEditor: () => void;
  showExpandButton?: boolean;
  onDeleteSelected: () => void;
};

const TOOL_BUTTONS: { tool: Tool; icon: typeof MousePointer2; tip: string }[] = [
  { tool: "select", icon: MousePointer2, tip: "Seleccionar" },
  { tool: "freehand", icon: Pencil, tip: "Dibujo libre" },
  { tool: "line", icon: MinusIcon as typeof MousePointer2, tip: "Línea" },
  { tool: "arrow", icon: ArrowRight, tip: "Flecha" },
  { tool: "text", icon: Type, tip: "Texto" },
];

export function ImageEditorToolbar({
  tool,
  selectedAnnotation,
  selectedLabelPreset,
  selectedShapeTool,
  strokeWidth,
  color,
  historyLength,
  futureLength,
  onToolChange,
  onLabelPresetChange,
  onStrokeWidthChange,
  onColorChange,
  onUndo,
  onRedo,
  onExpandEditor,
  showExpandButton = true,
  onDeleteSelected,
}: Props) {
  const selectedStrokeWidth =
    selectedAnnotation &&
    (selectedAnnotation.type === "line" ||
      selectedAnnotation.type === "arrow" ||
      selectedAnnotation.type === "rect" ||
      selectedAnnotation.type === "circle" ||
      selectedAnnotation.type === "freehand" ||
      selectedAnnotation.type === "label")
      ? selectedAnnotation.strokeWidth
      : strokeWidth;

  const selectedColor =
    selectedAnnotation?.type === "line" ||
    selectedAnnotation?.type === "arrow" ||
    selectedAnnotation?.type === "rect" ||
    selectedAnnotation?.type === "circle" ||
    selectedAnnotation?.type === "freehand"
      ? selectedAnnotation.stroke
      : selectedAnnotation?.type === "text"
        ? selectedAnnotation.fill
        : selectedAnnotation?.type === "label"
          ? selectedAnnotation.color
          : color;
  const ShapeIcon = selectedShapeTool === "shape-circle" ? CircleIcon : Square;
  const shapeTitle = selectedShapeTool === "shape-circle" ? "Círculo" : "Rectángulo";

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 px-1.5 py-1">
      {TOOL_BUTTONS.map(({ tool: itemTool, icon: Icon, tip }) => (
        <Button
          key={itemTool}
          type="button"
          variant={tool === itemTool ? "secondary" : "ghost"}
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onToolChange(itemTool)}
          title={tip}
        >
          <Icon className="size-3.5" />
        </Button>
      ))}

      <div className="mx-0.5 h-5 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant={tool === "label" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-0.5 px-1.5 text-xs"
              title={`Etiqueta: ${selectedLabelPreset.label}`}
            >
              <Tag className="size-3.5" />
              <ChevronDown className="size-2.5" />
            </Button>
          }
        />
        <DropdownMenuContent>
          {LABEL_PRESETS.map((preset) => (
            <DropdownMenuItem
              key={preset.key}
              onClick={() => {
                onLabelPresetChange(preset);
                onToolChange("label");
              }}
            >
              {preset.key !== LABEL_OTHER.key && (
                <span className="size-2.5 rounded-full" style={{ backgroundColor: preset.color }} />
              )}
              {preset.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              onLabelPresetChange(LABEL_OTHER);
              onToolChange("label");
            }}
          >
            {LABEL_OTHER.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant={tool === "shape-rect" || tool === "shape-circle" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-0.5 px-1.5 text-xs"
              title={shapeTitle}
            >
              <ShapeIcon className="size-3.5" />
              <ChevronDown className="size-2.5" />
            </Button>
          }
        />
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onToolChange("shape-rect")}>
            <Square className="size-3.5" /> Rectángulo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToolChange("shape-circle")}>
            <CircleIcon className="size-3.5" /> Círculo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-0.5 px-1.5 text-xs"
              title="Grosor"
            >
              <StrokeWidthMenuIcon />
              <ChevronDown className="size-2.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="min-w-36">
          {STROKE_WIDTHS.map((value) => (
            <DropdownMenuItem key={value} onClick={() => onStrokeWidthChange(value)} className="gap-2">
              <StrokePreview width={value} />
              <span>{value}px</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-0.5 px-1.5 text-xs"
              title="Color"
            >
              <span className="size-3 rounded-full border" style={{ backgroundColor: selectedColor }} />
              <ChevronDown className="size-2.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-32">
          <div className="grid grid-cols-3 gap-2 p-2">
            {COLORS.map((swatch) => {
              const isSelected = selectedColor.toLowerCase() === swatch.toLowerCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  className={`size-6 rounded-full border transition ${isSelected ? "scale-110 ring-2 ring-foreground/30" : ""}`}
                  style={{ backgroundColor: swatch }}
                  onClick={() => onColorChange(swatch)}
                  title={swatch}
                />
              );
            })}
            <label
              className={`relative flex size-6 cursor-pointer items-center justify-center rounded-full border ${
                !COLORS.some((swatch) => swatch.toLowerCase() === selectedColor.toLowerCase())
                  ? "scale-110 ring-2 ring-foreground/30"
                  : ""
              }`}
              style={{ backgroundColor: selectedColor }}
              title="Color personalizado"
            >
              <input
                type="color"
                value={selectedColor}
                onChange={(event) => onColorChange(event.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Color personalizado"
              />
              <span className="pointer-events-none text-[9px] font-bold text-white mix-blend-difference">+</span>
            </label>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-0.5 h-5 w-px bg-border" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onUndo}
        disabled={!historyLength}
        title="Deshacer"
      >
        <Undo2 className="size-3.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onRedo}
        disabled={!futureLength}
        title="Rehacer"
      >
        <Redo2 className="size-3.5" />
      </Button>

      {showExpandButton && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onExpandEditor}
          title="Editor ampliado"
        >
          <Expand className="size-3.5" />
        </Button>
      )}

      {selectedAnnotation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          onClick={onDeleteSelected}
          title="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </Button>
      )}

      {selectedLabelPreset.key !== LABEL_OTHER.key && tool === "label" && (
        <span className="ml-auto text-xs text-muted-foreground">{selectedLabelPreset.label}</span>
      )}

    </div>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function StrokeWidthMenuIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="5" y1="7" x2="19" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5" y1="17" x2="19" y2="17" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function StrokePreview({ width }: { width: number }) {
  return (
    <svg className="h-4 w-14" viewBox="0 0 56 16" fill="none" aria-hidden="true">
      <line x1="4" y1="8" x2="52" y2="8" stroke="currentColor" strokeWidth={width} strokeLinecap="round" />
    </svg>
  );
}
