"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  text: string;
  color: string;
  onTextChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LabelDialog({
  open,
  text,
  color,
  onTextChange,
  onColorChange,
  onOpenChange,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>Nueva etiqueta</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label htmlFor="lbl-text">Texto</Label>
            <Input
              id="lbl-text"
              name="labelText"
              autoComplete="off"
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              placeholder="Texto de la etiqueta"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="lbl-color">Color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="lbl-color"
                name="labelColor"
                type="color"
                autoComplete="off"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="h-8 w-14 cursor-pointer rounded border"
              />
              <Input
                id="lbl-color-value"
                name="labelColorValue"
                autoComplete="off"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="w-24 font-mono text-sm"
              />
            </div>
          </div>
        </div>
        <DialogFooter showCloseButton={false}>
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="button" onClick={onConfirm}>Colocar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
