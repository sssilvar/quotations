import { ImageResponse } from "next/og";
import { PwaIcon } from "@/lib/pwa-icon";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export function GET() {
  return new ImageResponse(<PwaIcon size={192} />, size);
}
