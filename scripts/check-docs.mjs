#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SKIP = new Set(["node_modules", ".git", "target", "dist", ".stellar"]);
const LINK_RE = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const errors = [];
const files = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (extname(entry.name) === ".md") {
      files.push(full);
    }
  }
}

walk(ROOT);

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(LINK_RE)) {
    const target = match[1];
    if (
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }
    const clean = target.split("#")[0];
    if (!clean) continue;
    const resolved = resolve(dirname(file), decodeURIComponent(clean));
    if (!resolved.startsWith(ROOT)) {
      errors.push(`${relative(ROOT, file)}: link escapes repository (${target})`);
      continue;
    }
    if (!existsSync(resolved)) {
      errors.push(`${relative(ROOT, file)}: missing link target ${target}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`documentation link check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`documentation links ok (${files.length} markdown files)`);
