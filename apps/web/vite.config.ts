import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { seoStaticBlogPlugin } from "./vite.seo";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "PDF Changer",
        short_name: "PDF Changer",
        description: "Privacy-first PDF tools. No uploads. No trackers.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Cache the app shell so the scrubber can run offline after first load.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/blog(\/|$)/, /^\/faq(\/|$)/, /^\/sandbox\.html$/],
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
      },
    }),
    seoStaticBlogPlugin(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: ["../.."],
    },
  },
  build: {
    target: "es2022",
  },
});
