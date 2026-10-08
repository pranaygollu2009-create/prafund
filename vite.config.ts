// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// STATIC_BUILD=1 produces a pure client-side SPA in dist/client for static hosts
// (GitHub Pages, Cloudflare Pages assets, S3, ...). Default builds keep the nitro server.
const staticBuild = process.env["STATIC_BUILD"] === "1";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // SPA mode: prerender a static shell that client-renders every path.
    ...(staticBuild ? { spa: { enabled: true } } : {}),
  },
  // Pure client build: no nitro server bundle in static mode.
  ...(staticBuild ? { nitro: false as const } : {}),
});
