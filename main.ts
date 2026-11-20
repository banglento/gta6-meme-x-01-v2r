#!/usr/bin/env node
// main.ts — entrypoint for this make.fun entry.
//
// Regenerates the entry image: renders candidate-a.html (the "My Patience"
// obituary page) to meme.png at exactly 1200x1200 with headless Chromium,
// then copies meme.png to candidate-a.png so the two stay in sync.
//
// No external dependencies — just Node (>= 22) and a Chromium binary.
// Usage: node main.ts

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(root, "candidate-a.html");
const memePath = join(root, "meme.png");
const copyPath = join(root, "candidate-a.png");

// Find a Chromium binary: PATH names first, then well-known install spots
// (system Chrome, /opt builds, Playwright's downloaded chromium).
function findChromium() {
  const names = ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"];
  for (const name of names) {
    const probe = spawnSync(name, ["--version"], { stdio: "ignore" });
    if (!probe.error) return name;
  }
  const fixed = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome"];
  for (const p of fixed) if (existsSync(p)) return p;
  // Playwright cache: ~/.cache/ms-playwright/chromium*/chrome-linux*/chrome
  const pwCache = join(process.env.HOME ?? "", ".cache", "ms-playwright");
  if (existsSync(pwCache)) {
    for (const dir of readdirSync(pwCache)) {
      if (!dir.startsWith("chromium")) continue;
      for (const sub of ["chrome-linux64/chrome", "chrome-linux/chrome"]) {
        const p = join(pwCache, dir, sub);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

function main() {
  if (!existsSync(htmlPath)) {
    console.error(`error: candidate-a.html not found next to main.ts (${htmlPath})`);
    process.exit(1);
  }
  const chromium = findChromium();
  if (!chromium) {
    console.error(
      "error: no Chromium binary found. Install chromium or google-chrome " +
        "(or run `npx playwright install chromium`) and try again."
    );
    process.exit(1);
  }
  console.log(`using chromium: ${chromium}`);

  // Render the page at exactly 1200x1200.
  const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-sandbox",
    "--force-device-scale-factor=1",
    "--window-size=1200,1200",
    `--screenshot=${memePath}`,
    pathToFileURL(htmlPath).href,
  ];
  const res = spawnSync(chromium, args, { stdio: "inherit" });
  if (res.error || res.status !== 0 || !existsSync(memePath)) {
    console.error(`error: chromium screenshot failed (status ${res.status ?? res.error})`);
    process.exit(1);
  }
  console.log(`wrote ${memePath} (${statSync(memePath).size} bytes, 1200x1200)`);

  // Keep candidate-a.png identical to the rendered meme.png.
  copyFileSync(memePath, copyPath);
  console.log(`wrote ${copyPath} (copy of meme.png)`);
}

main();
