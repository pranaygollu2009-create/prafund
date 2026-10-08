#!/usr/bin/env node
/**
 * Builds a GitHub Pages-ready bundle in dist/client:
 *   1. Runs `npm run build` with STATIC_BUILD=1 (TanStack Start SPA mode, no nitro server).
 *   2. Copies the prerendered shell `_shell.html` to `index.html` (Pages landing page)
 *      and `404.html` (so deep links like /markets fall back to the SPA router).
 *   3. Adds `.nojekyll` (skip Jekyll processing).
 *   4. Optionally writes a `CNAME` file when PAGES_CNAME is set (e.g. PAGES_CNAME=prafund.co).
 *
 * Usage: npm run build:pages
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const clientDir = path.join(root, "dist", "client");

// 1. SPA build (STATIC_BUILD=1 is read by vite.config.ts).
const result = spawnSync("npm", ["run", "build"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, STATIC_BUILD: "1" },
  shell: process.platform === "win32",
});
if (result.status !== 0) {
  console.error(`[build-pages] build failed with exit code ${result.status}`);
  process.exit(result.status ?? 1);
}

const shell = path.join(clientDir, "_shell.html");
if (!existsSync(shell)) {
  console.error(`[build-pages] missing ${path.relative(root, shell)} — did the SPA build run?`);
  process.exit(1);
}

// 2. Pages glue files.
copyFileSync(shell, path.join(clientDir, "index.html"));
copyFileSync(shell, path.join(clientDir, "404.html"));
writeFileSync(path.join(clientDir, ".nojekyll"), "");

// 3. Optional custom domain (GitHub Pages reads CNAME from the deploy root).
if (process.env.PAGES_CNAME) {
  writeFileSync(path.join(clientDir, "CNAME"), `${process.env.PAGES_CNAME.trim()}\n`);
  console.log(`[build-pages] wrote CNAME: ${process.env.PAGES_CNAME.trim()}`);
}

// The shell no longer needs to exist under its build-time name.
rmSync(shell);

console.log("[build-pages] dist/client is ready to deploy:");
console.log("  index.html  ← SPA landing page");
console.log("  404.html    ← SPA fallback for deep links");
console.log("  .nojekyll   ← skip Jekyll processing");
