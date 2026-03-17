"use client";

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_TARGET_BYTES = 900 * 1024;
const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5];

type Options = {
  maxDimension?: number;
  targetBytes?: number;
};

type LoadedImage = {
  width: number;
  height: number;
  source: CanvasImageSource;
  cleanup?: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      source: bitmap,
      cleanup: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo leer la imagen"));
      element.src = objectUrl;
    });

    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      source: image,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo procesar la imagen"));
        return;
      }
      resolve(blob);
    }, type, quality);
  });
}

export async function preprocessUploadImage(file: File, options?: Options) {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;

  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const targetBytes = options?.targetBytes ?? DEFAULT_TARGET_BYTES;
  const loaded = await loadImage(file);

  try {
    const largestSide = Math.max(loaded.width, loaded.height);
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la imagen");

    context.drawImage(loaded.source, 0, 0, width, height);

    let bestBlob: Blob | null = null;

    for (const quality of QUALITY_STEPS) {
      const candidate = await canvasToBlob(canvas, "image/webp", quality);

      if (!bestBlob || candidate.size < bestBlob.size) {
        bestBlob = candidate;
      }
      if (candidate.size <= targetBytes) {
        bestBlob = candidate;
        break;
      }
    }

    if (!bestBlob || bestBlob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
    return new File([bestBlob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    loaded.cleanup?.();
  }
}
