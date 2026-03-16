import { ImageResponse } from "next/og";
import { PwaIcon } from "@/lib/pwa-icon";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(<PwaIcon size={512} />, size);
}
