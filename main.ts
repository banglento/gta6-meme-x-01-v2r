#!/usr/bin/env node
// main.ts — entrypoint for this make.fun entry (gta6-meme-x-01, "My Patience").
//
// The grader runs this file with `node /bot/main.ts` in a bare Node 22 image:
// no network, no Chromium, and a read-only repository filesystem (only
// /output and /tmp are writable). So instead of re-rendering the meme, this
// entrypoint verifies that the committed artifact set is complete and
// internally consistent, prints one line per check, optionally writes a JSON
// report, and exits 0 only when every check passes. It also copies POST.json
// from the repository to the output directory, where the gate reads it.
//
// Pure Node.js builtins (fs, path, crypto) — zero dependencies, and it never
// writes into the repository directory.
//
// Environment:
//   MAKEFUN_BOT_DIR    repo directory (defaults to this script's directory)
//   MAKEFUN_OUTPUT_DIR the output directory (defaults to /output): POST.json
//                      is copied there, where the gate reads it, and a JSON
//                      report is written to $MAKEFUN_OUTPUT_DIR/report.json

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.env.MAKEFUN_BOT_DIR
  ? process.env.MAKEFUN_BOT_DIR
  : dirname(fileURLToPath(import.meta.url));

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

// Parse a PNG buffer's signature and IHDR dimensions.
// Returns { signatureOk, width, height } or null if the buffer is too short.
function pngInfo(buf) {
  if (buf.length < 24) return null;
  const signatureOk = buf.subarray(0, 8).equals(PNG_SIGNATURE);
  const ihdrOk = buf.toString("ascii", 12, 16) === "IHDR";
  return {
    signatureOk: signatureOk && ihdrOk,
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function readRepoFile(name) {
  const p = join(root, name);
  return existsSync(p) ? readFileSync(p) : null;
}

// 1. meme.png: exists, valid PNG, exactly 1200x1200.
const memeBuf = readRepoFile("meme.png");
if (!memeBuf) {
  record("meme.png", false, "file is missing");
} else {
  const info = pngInfo(memeBuf);
  if (!info) {
    record("meme.png", false, "file too short to contain a PNG header");
  } else if (!info.signatureOk) {
    record("meme.png", false, "invalid PNG signature or missing IHDR chunk");
  } else if (info.width !== 1200 || info.height !== 1200) {
    record("meme.png", false, `dimensions are ${info.width}x${info.height}, expected 1200x1200`);
  } else {
    record("meme.png", true, `valid PNG, 1200x1200, ${memeBuf.length} bytes, sha256 ${sha256(memeBuf)}`);
  }
}

// 2. candidate-a.png: byte-identical to meme.png (same sha256).
const candidateBuf = readRepoFile("candidate-a.png");
if (!candidateBuf) {
  record("candidate-a.png", false, "file is missing");
} else if (!memeBuf) {
  record("candidate-a.png", false, "cannot compare: meme.png is missing");
} else {
  const memeHash = sha256(memeBuf);
  const candidateHash = sha256(candidateBuf);
  if (memeHash === candidateHash) {
    record("candidate-a.png", true, `byte-identical to meme.png (sha256 ${candidateHash})`);
  } else {
    record(
      "candidate-a.png",
      false,
      `sha256 ${candidateHash} differs from meme.png sha256 ${memeHash}`
    );
  }
}

// 3. candidate-a-512.png: exists, valid PNG, exactly 512x512.
const smallBuf = readRepoFile("candidate-a-512.png");
if (!smallBuf) {
  record("candidate-a-512.png", false, "file is missing");
} else {
  const info = pngInfo(smallBuf);
  if (!info || !info.signatureOk) {
    record("candidate-a-512.png", false, "invalid PNG signature or missing IHDR chunk");
  } else if (info.width !== 512 || info.height !== 512) {
    record("candidate-a-512.png", false, `dimensions are ${info.width}x${info.height}, expected 512x512`);
  } else {
    record("candidate-a-512.png", true, "valid PNG, 512x512");
  }
}

// 4. candidate-a.html: contains the obituary headline and the stamp text.
const htmlBuf = readRepoFile("candidate-a.html");
if (!htmlBuf) {
  record("candidate-a.html", false, "file is missing");
} else {
  const html = htmlBuf.toString("utf8");
  const missing = ["MY PATIENCE", "FUNERAL PAID IN FULL"].filter((s) => !html.includes(s));
  if (missing.length === 0) {
    record("candidate-a.html", true, 'contains "MY PATIENCE" and "FUNERAL PAID IN FULL"');
  } else {
    record("candidate-a.html", false, `missing required string(s): ${missing.join(", ")}`);
  }
}

// 5. post-text.txt: mentions @makefunai and carries a make.fun play code.
const postBuf = readRepoFile("post-text.txt");
if (!postBuf) {
  record("post-text.txt", false, "file is missing");
} else {
  const text = postBuf.toString("utf8");
  const problems = [];
  if (!text.includes("@makefunai")) problems.push('missing "@makefunai"');
  const codeMatch = text.match(/makefun-[a-z]+-[a-z]+-[a-z]+/);
  if (!codeMatch) problems.push("no play code matching makefun-<word>-<word>-<word>");
  if (problems.length === 0) {
    record("post-text.txt", true, `mentions @makefunai, play code ${codeMatch[0]}`);
  } else {
    record("post-text.txt", false, problems.join("; "));
  }
}

// 6. POST.json: parses as JSON and its url is an x.com status URL.
const postJsonBuf = readRepoFile("POST.json");
if (!postJsonBuf) {
  record("POST.json", false, "file is missing");
} else {
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(postJsonBuf.toString("utf8"));
  } catch (err) {
    parseError = err;
  }
  if (parseError) {
    record("POST.json", false, `invalid JSON: ${parseError.message}`);
  } else if (
    typeof parsed.url !== "string" ||
    !parsed.url.includes("x.com/") ||
    !parsed.url.includes("/status/")
  ) {
    record("POST.json", false, `url is not an x.com status URL: ${JSON.stringify(parsed.url)}`);
  } else {
    record("POST.json", true, `url is ${parsed.url}`);
  }
}

// 7. POST.json copy to output: the gate scorer reads POST.json from the
// output directory, so copy the repository's POST.json there.
if (!postJsonBuf) {
  record("POST.json copy to output", false, "cannot copy: POST.json is missing");
} else {
  const dest = join(outputDir, "POST.json");
  try {
    mkdirSync(outputDir, { recursive: true });
    copyFileSync(join(root, "POST.json"), dest);
    record("POST.json copy to output", true, `copied to ${dest}`);
  } catch (err) {
    record("POST.json copy to output", false, err.message);
  }
}

const failed = checks.filter((c) => !c.ok);
const ok = failed.length === 0;

console.log(
  ok
    ? `OK all ${checks.length} checks passed`
    : `FAILED ${failed.length}/${checks.length} checks failed: ${failed.map((c) => c.name).join(", ")}`
);

if (process.env.MAKEFUN_OUTPUT_DIR) {
  const report = { ok, checks };
  if (memeBuf) report.meme = { sha256: sha256(memeBuf), bytes: memeBuf.length };
  writeFileSync(join(process.env.MAKEFUN_OUTPUT_DIR, "report.json"), JSON.stringify(report, null, 2) + "\n");
}

process.exit(ok ? 0 : 1);
