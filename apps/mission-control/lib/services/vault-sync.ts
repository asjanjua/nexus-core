import { promises as fs } from "node:fs";
import path from "node:path";
import type { FSWatcher } from "chokidar";
import type { KnowledgeNote, KnowledgeSyncMode } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import {
  extractKnowledge,
  markdownForNote,
  parseFrontmatter,
  sensitivityFromFrontmatter,
  titleFromPath
} from "@/lib/knowledge/markdown";

const MAX_MARKDOWN_BYTES = 1024 * 1024;
const VAULT_DIRS = ["_Inbox", "Daily", "Projects", "Workflows", "Entities", "Sources", ".nexus", ".conflicts"];

let watcher: FSWatcher | null = null;

export function getVaultSyncMode(): KnowledgeSyncMode {
  const mode = process.env.NEXUS_VAULT_SYNC;
  return mode === "readonly" || mode === "bidirectional" ? mode : "disabled";
}

export function getVaultPath(): string | null {
  const raw = process.env.NEXUS_LOCAL_VAULT_PATH;
  return raw && path.isAbsolute(raw) ? path.resolve(raw) : null;
}

export async function ensureVaultLayout(vaultPath: string): Promise<void> {
  for (const dir of VAULT_DIRS) {
    await fs.mkdir(path.join(vaultPath, dir), { recursive: true });
  }
}

export async function safeVaultRelativePath(vaultPath: string, candidate: string): Promise<string> {
  const resolvedVault = path.resolve(vaultPath);
  const resolved = path.resolve(resolvedVault, candidate);
  if (!resolved.startsWith(resolvedVault + path.sep)) throw new Error("vault_path_traversal");
  const relative = path.relative(resolvedVault, resolved);
  if (!relative || relative.startsWith("..")) throw new Error("vault_path_outside_root");
  if (relative.split(path.sep).some((part) => part.startsWith(".") && part !== ".nexus" && part !== ".conflicts")) {
    throw new Error("vault_hidden_path_rejected");
  }
  if (!relative.toLowerCase().endsWith(".md")) throw new Error("vault_unsupported_extension");
  const stat = await fs.lstat(resolved).catch(() => null);
  if (stat?.isSymbolicLink()) {
    const target = await fs.realpath(resolved);
    if (!target.startsWith(resolvedVault + path.sep)) throw new Error("vault_external_symlink_rejected");
  }
  return relative.split(path.sep).join("/");
}

async function collectMarkdownFiles(vaultPath: string, dir = ""): Promise<string[]> {
  const abs = path.join(vaultPath, dir);
  const entries = await fs.readdir(abs, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".nexus" && entry.name !== ".conflicts") continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".nexus" || entry.name === ".conflicts") continue;
      files.push(...await collectMarkdownFiles(vaultPath, rel));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(rel.split(path.sep).join("/"));
    }
  }
  return files;
}

async function importFile(workspaceId: string, actor: string, vaultPath: string, relPath: string) {
  const safePath = await safeVaultRelativePath(vaultPath, relPath);
  const abs = path.join(vaultPath, safePath);
  const stat = await fs.stat(abs);
  if (stat.size > MAX_MARKDOWN_BYTES) throw new Error("vault_file_too_large");
  const markdown = await fs.readFile(abs, "utf8");
  const parsed = parseFrontmatter(markdown);
  const extracted = extractKnowledge(parsed.body, parsed.frontmatter);
  return repository.upsertKnowledgeNote(workspaceId, {
    title: String(parsed.frontmatter.title ?? titleFromPath(safePath)),
    path: safePath,
    body: parsed.body,
    tags: extracted.tags,
    sensitivity: sensitivityFromFrontmatter(parsed.frontmatter.sensitivity),
    status: "active",
    sourceKind: "sync",
    frontmatter: parsed.frontmatter,
    evidenceRefs: extracted.evidenceRefs,
    entityRefs: extracted.entityRefs,
    workflowRefs: extracted.workflowRefs,
    decisionRefs: extracted.decisionRefs,
    recommendationRefs: extracted.recommendationRefs
  }, actor);
}

export async function syncVaultNow(workspaceId: string, actor = "vault-sync") {
  const mode = getVaultSyncMode();
  const vaultPath = getVaultPath();
  if (mode === "disabled" || !vaultPath) {
    return { mode, enabled: false, imported: 0, exported: 0, events: await repository.listKnowledgeSyncEvents(workspaceId, 10) };
  }

  await ensureVaultLayout(vaultPath);
  const files = await collectMarkdownFiles(vaultPath);
  let imported = 0;
  for (const file of files) {
    await importFile(workspaceId, actor, vaultPath, file);
    imported++;
  }

  let exported = 0;
  if (mode === "bidirectional") {
    const notes = await repository.listKnowledgeNotes(workspaceId, { limit: 500 });
    for (const note of notes) {
      await writeNoteToVault(note);
      exported++;
    }
  }

  await repository.recordKnowledgeSyncEvent({
    workspaceId,
    type: "sync_now",
    status: "success",
    message: `Imported ${imported}; exported ${exported}.`,
    path: vaultPath,
    noteId: null
  });
  return { mode, enabled: true, imported, exported, events: await repository.listKnowledgeSyncEvents(workspaceId, 10) };
}

export async function writeNoteToVault(note: KnowledgeNote): Promise<void> {
  if (getVaultSyncMode() !== "bidirectional") return;
  const vaultPath = getVaultPath();
  if (!vaultPath) return;
  await ensureVaultLayout(vaultPath);
  const safePath = await safeVaultRelativePath(vaultPath, note.path);
  const abs = path.join(vaultPath, safePath);
  const existing = await fs.readFile(abs, "utf8").catch(() => null);
  const next = markdownForNote(note);
  if (existing && existing !== next) {
    await fs.mkdir(path.join(vaultPath, ".conflicts"), { recursive: true });
    const conflictName = `${Date.now()}-${safePath.replace(/[\\/]/g, "__")}`;
    await fs.writeFile(path.join(vaultPath, ".conflicts", conflictName), existing, "utf8");
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, next, "utf8");
}

export async function vaultStatus(workspaceId: string) {
  const mode = getVaultSyncMode();
  const vaultPath = getVaultPath();
  return {
    mode,
    enabled: mode !== "disabled" && Boolean(vaultPath),
    vaultPath,
    watcherActive: Boolean(watcher),
    events: await repository.listKnowledgeSyncEvents(workspaceId, 10)
  };
}

export async function startVaultWatcher(workspaceId: string, actor = "vault-watch") {
  const mode = getVaultSyncMode();
  const vaultPath = getVaultPath();
  if (watcher || mode === "disabled" || !vaultPath) return vaultStatus(workspaceId);
  await ensureVaultLayout(vaultPath);
  const chokidar = await import("chokidar");
  watcher = chokidar.watch("**/*.md", {
    cwd: vaultPath,
    ignored: [".nexus/**", ".conflicts/**", "**/.*/**"],
    ignoreInitial: true
  });
  watcher.on("add", (file) => {
    void importFile(workspaceId, actor, vaultPath, file).catch((error) =>
      repository.recordKnowledgeSyncEvent({ workspaceId, type: "watch_add", status: "failed", path: file, noteId: null, message: String(error) })
    );
  });
  watcher.on("change", (file) => {
    void importFile(workspaceId, actor, vaultPath, file).catch((error) =>
      repository.recordKnowledgeSyncEvent({ workspaceId, type: "watch_change", status: "failed", path: file, noteId: null, message: String(error) })
    );
  });
  return vaultStatus(workspaceId);
}
