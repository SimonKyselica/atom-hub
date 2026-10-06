import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Atom Hub — Habits & Todos",
    short_name: "Atom Hub",
    description: "A gamified habit tracker and todo list with GitHub-style contribution graphs.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1117",
    theme_color: "#0d1117",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Today", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Todos", url: "/todos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Habits", url: "/habits", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
