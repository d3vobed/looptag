#!/usr/bin/env node
/**
 * Create the LOOPTAG labels and issue backlog on GitHub.
 *
 * Usage:
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=d3vobed/looptag node scripts/seed-github.mjs
 *
 * The script is idempotent: existing labels are left alone and issues with the
 * same title are skipped. It never prints the token.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY || "d3vobed/looptag";
const [owner, repo] = repository.split("/");

if (!token) {
  console.error("Set GITHUB_TOKEN (or GH_TOKEN) before running this script.");
  process.exit(1);
}
if (!owner || !repo) {
  console.error("GITHUB_REPOSITORY must look like owner/repo.");
  process.exit(1);
}

const api = "https://api.github.com";
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "looptag-seed-script",
};

const labels = [
  { name: "Stellar Wave", color: "7B61FF", description: "Scoped work for the Stellar Wave program" },
  { name: "help wanted", color: "008672", description: "Open for community contribution" },
  { name: "good first issue", color: "7057FF", description: "Small, self-contained starter task" },
  { name: "priority: high", color: "D73A4A", description: "Needed before a pilot" },
  { name: "priority: medium", color: "FBCA04", description: "Important but not blocking" },
  { name: "priority: low", color: "0E8A16", description: "Nice to have" },
  { name: "complexity: trivial", color: "C5DEF5", description: "Under an hour for a new contributor" },
  { name: "complexity: medium", color: "BFD4F2", description: "A focused day or two" },
  { name: "complexity: high", color: "1D76DB", description: "Multi-file design and test work" },
  { name: "contract", color: "5319E7", description: "Soroban contract" },
  { name: "sdk", color: "0075CA", description: "TypeScript SDK" },
  { name: "indexer", color: "0052CC", description: "Read-only indexer" },
  { name: "demo", color: "F9D0C4", description: "Static demo and wallet UX" },
  { name: "docs", color: "0075CA", description: "Documentation" },
  { name: "ci", color: "EDEDED", description: "Build and automation" },
  { name: "security", color: "B60205", description: "Security-sensitive" },
  { name: "bug", color: "D73A4A", description: "Something is not working" },
  { name: "enhancement", color: "A2EEEF", description: "New feature or improvement" },
];

const issues = JSON.parse(
  readFileSync(resolve(process.cwd(), "scripts/issues.json"), "utf8"),
);

async function request(path, init = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(
      `${init.method ?? "GET"} ${path} failed: ${response.status} ${data?.message ?? text}`,
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function ensureLabels() {
  for (const label of labels) {
    try {
      await request(`/repos/${owner}/${repo}/labels`, {
        method: "POST",
        body: JSON.stringify(label),
      });
      console.log(`created label: ${label.name}`);
    } catch (error) {
      if (error.status === 422) {
        console.log(`label exists: ${label.name}`);
      } else {
        throw error;
      }
    }
  }
}

async function existingTitles() {
  const titles = new Set();
  for (let page = 1; page <= 10; page += 1) {
    const batch = await request(
      `/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}`,
    );
    for (const issue of batch) {
      if (!issue.pull_request) titles.add(issue.title);
    }
    if (batch.length < 100) break;
  }
  return titles;
}

async function createIssues() {
  const seen = await existingTitles();
  let created = 0;
  let skipped = 0;

  for (const issue of issues) {
    if (seen.has(issue.title)) {
      console.log(`skip existing: ${issue.title}`);
      skipped += 1;
      continue;
    }

    const labelNames = [...new Set(["Stellar Wave", "help wanted", ...issue.labels])];
    const createdIssue = await request(`/repos/${owner}/${repo}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: issue.title,
        body: issue.body,
        labels: labelNames,
      }),
    });
    console.log(`created #${createdIssue.number}: ${createdIssue.title}`);
    created += 1;
  }

  console.log(`\ndone: ${created} created, ${skipped} skipped`);
}

await ensureLabels();
await createIssues();
