#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const SKIP = new Set(["node_modules", ".git", "target", "dist", ".stellar"]);
const SECRET_PATTERNS = [
  [/ghp_[A-Za-z0-9]{36}/, "GitHub personal access token"],
  [/github_pat_[A-Za-z0-9_]{20,}/, "GitHub fine-grained token"],
  [/-----BEGIN (?:RSA |OPENSSH |EC |PGP )?PRIVATE KEY-----/, "private key"],
  [/\bS[A-Z2-7]{55}\b/, "Stellar secret key"],
];
const MAX_FILE_BYTES = 1_000_000;

const errors = [];
const files = [];

function isGitRepo() {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

if (isGitRepo()) {
  for (const file of execFileSync("git", ["ls-files", "-z"], { cwd: ROOT })
    .toString("utf8")
    .split("\0")) {
    if (file) files.push(join(ROOT, file));
  }
} else {
  walk(ROOT);
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}

for (const file of files) {
  const name = file.split("/").pop() ?? "";
  if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) {
    errors.push(`tracked environment file: ${file}`);
  }
  if (/\.(pem|key|p12|pfx)$/.test(extname(name))) {
    errors.push(`tracked key material: ${file}`);
  }
  if (!existsSync(file)) continue;
  const stat = statSync(file);
  if (stat.size > MAX_FILE_BYTES) {
    errors.push(`file larger than 1 MB: ${file} (${stat.size} bytes)`);
    continue;
  }
  if (stat.isFile()) {
    const text = readFileSync(file, "utf8");
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(text)) errors.push(`${label} pattern in ${file}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`repository hygiene check failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`repository hygiene ok (${files.length} tracked files)`);
