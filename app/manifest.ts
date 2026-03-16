import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Soinsolar",
    short_name: "Soinsolar",
    description: "Cotización y gestión comercial de sistemas solares fotovoltaicos.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6faf7",
    theme_color: "#0f766e",
    lang: "es-CO",
    icons: [
      {
        src: "/pwa/icon-192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa/icon-maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
