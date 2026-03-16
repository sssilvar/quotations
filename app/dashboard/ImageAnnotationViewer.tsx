"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseAnnotationData } from "./annotation-types";
import { ImageEditorCanvas } from "./image-editor/ImageEditorCanvas";
import type { Viewport } from "./image-editor/geometry";

type Props = {
  imageUrl: string;
  annotationData: string | null | undefined;
};

export function ImageAnnotationViewer({ imageUrl, annotationData }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const annotations = parseAnnotationData(annotationData).annotations;

  const measure = useCallback(() => {
    const wrapper = wrapperRef.current;
    const image = wrapper?.querySelector("img");
    if (!wrapper || !image) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    const naturalWidth = image.naturalWidth || imageRect.width;
    const naturalHeight = image.naturalHeight || imageRect.height;
    const scale = Math.min(imageRect.width / naturalWidth, imageRect.height / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const offsetX = (imageRect.width - renderedWidth) / 2;
    const offsetY = (imageRect.height - renderedHeight) / 2;

    setViewport({
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

  return (
    <div ref={wrapperRef}>
      <ImageEditorCanvas
        imageUrl={imageUrl}
        onImageLoad={measure}
        viewport={viewport}
        annotations={annotations}
        selectedAnnotation={null}
        drawing={null}
        previewPoint={null}
        textEditor={null}
        tool="select"
        color="#000000"
        strokeWidth={2}
        previewLabelColor="#000000"
        previewLabelText="Etiqueta"
        previewLabelStrokeWidth={2}
        interactive={false}
        onPointerDown={() => {}}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
        onDoubleClick={() => {}}
        onLineHandlePointerDown={() => {}}
        onLabelAnchorPointerDown={() => {}}
        onTextEditorChange={() => {}}
        onTextEditorCommit={() => {}}
        onTextEditorCancel={() => {}}
      />
    </div>
  );
}
