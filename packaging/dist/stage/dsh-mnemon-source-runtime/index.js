import {
  DEFAULT_RUNTIME_MEMORY_LIMIT_BYTES,
  DEFAULT_RUNTIME_USER_LIMIT_BYTES,
  MAX_RUNTIME_MEMORY_LIMIT_BYTES,
  RUNTIME_ARCHIVE_DIRECTORY,
  RUNTIME_BRANCH_NAME_MAX,
  RUNTIME_BRANCH_NAME_PATTERN,
  RUNTIME_DIRECTORY,
  RUNTIME_ENTRY_DELIMITER,
  RUNTIME_ENTRY_MAX_BYTES,
  RUNTIME_LOCK_FILE,
  RUNTIME_LOCK_STALE_MS,
  RUNTIME_MEMORIES_FILE,
  RUNTIME_MEMORY_LIMITS,
  RUNTIME_MEMORY_VERSION,
  RUNTIME_PROJECTION_FILES,
  parseRuntimeBranches,
  runtimeBytes,
  runtimeProjection
} from "./chunk-K73RF42Q.js";

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/index.ts
import { defineMemoryPlugin, installMemory, memoryConfigurationDigest } from "dsh-mnemon/extension-sdk";

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/config.ts
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import z from "@deepseek-ai/schemastery";
var Config = z.object({
  dataDir: z.string(),
  userDataDir: z.string(),
  memoryLimitBytes: z.number().step(1).min(1).max(MAX_RUNTIME_MEMORY_LIMIT_BYTES),
  userLimitBytes: z.number().step(1).min(1).max(MAX_RUNTIME_MEMORY_LIMIT_BYTES)
});
function runtimeSourceConfig(value, instanceKey) {
  const config = Config(value);
  const dataDir = config.dataDir ?? join(homedir(), ".mnemon", "sources", encodeURIComponent(instanceKey));
  const userDataDir = config.userDataDir ?? dataDir;
  if (!isAbsolute(dataDir) || !isAbsolute(userDataDir)) throw new Error("Runtime Source dataDir and userDataDir must be absolute");
  return {
    dataDir,
    userDataDir,
    memoryLimitBytes: config.memoryLimitBytes ?? DEFAULT_RUNTIME_MEMORY_LIMIT_BYTES,
    userLimitBytes: config.userLimitBytes ?? DEFAULT_RUNTIME_USER_LIMIT_BYTES
  };
}

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/source.ts
import { COMPOSABLE_MEMORY_API_VERSION } from "dsh-mnemon/contracts";
import { defineMemorySource, createMemoryMutationReceipt as receipt, memoryInputRecord as record, memoryInputStringArray as stringArray, memoryInputText as text, truncateMemoryText as truncate } from "dsh-mnemon/extension-sdk";

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/git-branch.ts
import { execFileSync } from "node:child_process";
var GIT_BRANCH_TIMEOUT_MS = 2e3;
function gitEnvironment(environment = process.env) {
  const sanitized = {};
  for (const [name2, value] of Object.entries(environment)) {
    if (value === void 0 || name2.toUpperCase().startsWith("GIT_")) continue;
    sanitized[name2] = value;
  }
  return sanitized;
}
function resolveGitBranch(cwd) {
  const root = cwd?.trim();
  if (root === void 0 || root === "") return void 0;
  try {
    const output = execFileSync("git", ["-C", root, "branch", "--show-current"], {
      encoding: "utf8",
      timeout: GIT_BRANCH_TIMEOUT_MS,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
      env: gitEnvironment()
    });
    const branch = output.trim();
    return branch === "" ? void 0 : branch;
  } catch {
    return void 0;
  }
}

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/controller.ts
import {
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync
} from "node:fs";
import { createHash } from "node:crypto";
import { basename, join as join2 } from "node:path";
var LOCK_TIMEOUT_MS = 5e3;
var LOCK_RETRY_MS = 20;
function appendWithoutLinks(path, text2) {
  const descriptor = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | (constants.O_NOFOLLOW ?? 0), 384);
  try {
    const bytes = Buffer.from(text2, "utf8");
    for (let offset = 0; offset < bytes.length; ) offset += writeSync(descriptor, bytes, offset, bytes.length - offset);
  } finally {
    closeSync(descriptor);
  }
}
var RuntimeMemoryCapacityError = class extends Error {
  constructor(target, used, projected, limit) {
    super(`Would exceed ${target} runtime memory capacity: ${projected} bytes (current ${used}, limit ${limit}). Archive and compact runtime memory before retrying.`);
    this.target = target;
    this.used = used;
    this.projected = projected;
    this.limit = limit;
    this.name = "RuntimeMemoryCapacityError";
  }
  code = "runtime-capacity";
};
var RuntimeMemoryConflictError = class extends Error {
  code = "revision-conflict";
  constructor() {
    super("runtime memory changed while archival was running; no compacted data was applied");
    this.name = "RuntimeMemoryConflictError";
  }
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isTarget(value) {
  return value === "memory" || value === "user";
}
function isImportance(value) {
  return value === "critical" || value === "normal" || value === "low";
}
var RUNTIME_BRANCHES_PER_ENTRY_MAX = 16;
function normalizeRuntimeBranches(value, field = "branches") {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array of git branch names`);
  const branches = [];
  const seen = /* @__PURE__ */ new Set();
  for (const item of value) {
    if (typeof item !== "string") throw new Error(`${field} must contain only git branch names`);
    const branch = item.trim();
    if (branch === "" || branch.length > RUNTIME_BRANCH_NAME_MAX || !RUNTIME_BRANCH_NAME_PATTERN.test(branch) || branch === "-" || branch.startsWith("/") || branch.startsWith("-") || branch.endsWith("/") || branch.endsWith(".") || branch.includes("..") || branch.includes("//") || branch.includes("@{")) {
      throw new Error(`${field} must contain git branch names (letters, numbers, dot, underscore, slash, dash)`);
    }
    if (seen.has(branch)) throw new Error(`${field} must not repeat a branch name`);
    seen.add(branch);
    branches.push(branch);
  }
  if (branches.length > RUNTIME_BRANCHES_PER_ENTRY_MAX) {
    throw new Error(`${field} supports at most ${RUNTIME_BRANCHES_PER_ENTRY_MAX} branch names`);
  }
  return branches;
}
function entryMatchesBranch(entry, branch) {
  return entry.branches === void 0 || entry.branches.length === 0 || entry.branches.includes(branch);
}
function scopeBranch(branch) {
  const value = branch?.trim();
  return value === void 0 || value === "" ? void 0 : value;
}
function normalizeContent(value, field) {
  const content = value?.trim().replace(/\s+/gu, " ") ?? "";
  if (content === "") throw new Error(`${field} is required`);
  if (content.includes("\xA7")) throw new Error(`${field} must not contain the reserved \xA7 entry delimiter`);
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > RUNTIME_ENTRY_MAX_BYTES) throw new Error(`${field} is too large (${bytes} bytes; max ${RUNTIME_ENTRY_MAX_BYTES})`);
  return content;
}
function parseOrigin(value) {
  if (!isRecord(value)) return void 0;
  if (typeof value.machine !== "string" || typeof value.label !== "string" || typeof value.at !== "string") return void 0;
  return { machine: value.machine, label: value.label, at: value.at };
}
function parseEntry(value) {
  if (!isRecord(value) || typeof value.content !== "string" || !isTarget(value.target) || !isImportance(value.importance)) return void 0;
  if (typeof value.created_at !== "string" || typeof value.updated_at !== "string") return void 0;
  const content = value.content.trim().replace(/\s+/gu, " ");
  if (content === "" || content.includes("\xA7")) return void 0;
  if (value.target === "user" && value.branches !== void 0) return void 0;
  const branches = parseRuntimeBranches(value.branches);
  const origin = parseOrigin(value.origin);
  return {
    content,
    created_at: value.created_at,
    updated_at: value.updated_at,
    target: value.target,
    importance: value.importance,
    ...branches === void 0 ? {} : { branches },
    ...origin === void 0 ? {} : { origin }
  };
}
function age(timestamp, projectedAt) {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time)) return "unknown";
  if (time > projectedAt) return "future";
  return `${Math.floor((projectedAt - time) / 864e5)}d`;
}
function contextMarkdown(entries, target, projectedAt) {
  return entries.filter((entry) => entry.target === target).map((entry) => {
    const annotations = [];
    if (entry.importance !== "normal") annotations.push(`importance=${entry.importance}`);
    for (const [name2, timestamp] of [["created", entry.created_at], ["updated", entry.updated_at]]) {
      const elapsed = age(timestamp, projectedAt);
      if (elapsed !== "0d") annotations.push(`${name2}=${elapsed}`);
    }
    return `${annotations.length === 0 ? "" : `[${annotations.join("; ")}]
`}${entry.content}`;
  }).join(RUNTIME_ENTRY_DELIMITER);
}
function revision(file) {
  return createHash("sha256").update(JSON.stringify(file)).digest("hex");
}
function prepareMutation(before, request, now, preserveImportance = false) {
  if (!isTarget(request.target)) throw new Error("target must be memory or user");
  if (!["add", "replace", "remove"].includes(request.action)) throw new Error("action must be add, replace, or remove");
  if (request.importance !== void 0 && !isImportance(request.importance)) throw new Error("importance must be critical, normal, or low");
  if (request.target === "user" && request.branches !== void 0) throw new Error("branches applies to target=memory only");
  const branchScope = request.branches === void 0 ? void 0 : normalizeRuntimeBranches(request.branches);
  const entries = before.map((entry) => ({ ...entry }));
  if (request.action === "add") {
    const content = normalizeContent(request.content, "content");
    const duplicate = entries.find((entry) => entry.target === request.target && entry.content === content);
    if (duplicate !== void 0) {
      return {
        changed: false,
        projectedEntries: entries,
        compactableEntries: entries.filter((entry) => entry.target === request.target),
        fields: { message: "Entry already exists (no duplicate added).", added: duplicate.content }
      };
    }
    const pendingEntry = {
      content,
      created_at: now,
      updated_at: now,
      target: request.target,
      importance: request.importance ?? "normal",
      ...branchScope !== void 0 && branchScope.length > 0 ? { branches: branchScope } : {}
    };
    return {
      changed: true,
      projectedEntries: [...entries, pendingEntry],
      compactableEntries: entries.filter((entry) => entry.target === request.target),
      pendingEntry,
      fields: { message: "Entry added.", added: content }
    };
  }
  const oldText = normalizeContent(request.oldText, "oldText");
  const substringMatches = entries.map((entry, index2) => entry.target === request.target && entry.content.includes(oldText) ? index2 : -1).filter((index2) => index2 >= 0);
  const exactMatches = substringMatches.filter((index2) => entries[index2].content === oldText);
  const matches = exactMatches.length > 0 ? exactMatches : substringMatches;
  if (matches.length === 0) throw new Error(`No ${request.target} entry contains ${JSON.stringify(oldText)}.`);
  if (matches.length > 1) throw new Error(`Multiple ${request.target} entries contain ${JSON.stringify(oldText)}; use a unique substring.`);
  const index = matches[0];
  const previous = entries[index];
  const compactableEntries = entries.filter((entry, entryIndex) => entry.target === request.target && entryIndex !== index);
  if (request.action === "replace") {
    const ranks = { low: 0, normal: 1, critical: 2 };
    const requested = request.importance ?? previous.importance;
    const importance = preserveImportance && ranks[requested] < ranks[previous.importance] ? previous.importance : requested;
    const content = normalizeContent(request.content, "content");
    const pendingEntry = {
      ...previous,
      content,
      updated_at: now,
      importance
    };
    if (branchScope !== void 0) {
      if (branchScope.length === 0) delete pendingEntry.branches;
      else pendingEntry.branches = branchScope;
    }
    entries[index] = pendingEntry;
    return {
      changed: true,
      projectedEntries: entries,
      compactableEntries,
      pendingEntry,
      excludedEntry: previous,
      fields: { message: importance === requested ? "Entry replaced." : "Entry replaced; original importance preserved.", replaced: { from: previous.content, to: content } }
    };
  }
  return {
    changed: true,
    projectedEntries: entries.filter((_, entryIndex) => entryIndex !== index),
    compactableEntries,
    excludedEntry: previous,
    fields: { message: "Entry removed.", removed: previous.content }
  };
}
function compactionCandidates(compacted, existing, target, now) {
  const seen = /* @__PURE__ */ new Set();
  const existingByContent = /* @__PURE__ */ new Map();
  for (const entry of existing) if (!existingByContent.has(entry.content)) existingByContent.set(entry.content, entry);
  return compacted.map((entry) => {
    const content = normalizeContent(entry.content, "compacted content");
    if (!isImportance(entry.importance)) throw new Error("compacted importance must be critical, normal, or low");
    if (seen.has(content)) throw new Error("compacted runtime memory contains duplicate entries");
    seen.add(content);
    const unchanged = existingByContent.get(content);
    const inheritedBranches = entry.branches ?? unchanged?.branches;
    return {
      content,
      created_at: unchanged?.created_at ?? now,
      updated_at: unchanged?.updated_at ?? now,
      target,
      importance: entry.importance,
      ...inheritedBranches === void 0 ? {} : { branches: inheritedBranches }
    };
  });
}
function packCompactionCandidates(replacements, target, maxBytes) {
  const ranked = { critical: [], normal: [], low: [] };
  replacements.forEach((entry, index) => ranked[entry.importance].push(index));
  const selected = /* @__PURE__ */ new Set();
  const delimiterBytes = Buffer.byteLength(RUNTIME_ENTRY_DELIMITER, "utf8");
  let used = 0;
  let count = 0;
  for (const importance of ["critical", "normal", "low"]) for (const index of ranked[importance]) {
    const entry = replacements[index];
    const matchesTarget = entry.target === target;
    const added = matchesTarget ? Buffer.byteLength(entry.content, "utf8") + (count === 0 ? 0 : delimiterBytes) : 0;
    if (used + added > maxBytes) continue;
    used += added;
    if (matchesTarget) count += 1;
    selected.add(index);
  }
  return replacements.filter((_, index) => selected.has(index));
}
function sleepSync(milliseconds) {
  const buffer = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(buffer, 0, 0, milliseconds);
}
var RuntimeMemoryController = class _RuntimeMemoryController {
  constructor(runner, now = () => /* @__PURE__ */ new Date(), limits = RUNTIME_MEMORY_LIMITS, userRunner) {
    this.now = now;
    for (const [target, limit] of Object.entries(limits)) {
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RUNTIME_MEMORY_LIMIT_BYTES) {
        throw new Error(`runtime ${target} memory limit must be an integer within 1..${MAX_RUNTIME_MEMORY_LIMIT_BYTES} bytes`);
      }
    }
    this.limits = { memory: limits.memory, user: limits.user };
    this.directory = join2(runner.effectiveDataDir(), RUNTIME_DIRECTORY);
    this.sourcePath = join2(this.directory, RUNTIME_MEMORIES_FILE);
    this.memoryPath = join2(this.directory, RUNTIME_PROJECTION_FILES.memory);
    this.localUserPath = join2(this.directory, RUNTIME_PROJECTION_FILES.user);
    this.lockPath = join2(this.directory, RUNTIME_LOCK_FILE);
    this.archivePath = join2(this.directory, RUNTIME_ARCHIVE_DIRECTORY, "MEMORY.md");
    this.archiveSourcePath = join2(this.directory, RUNTIME_ARCHIVE_DIRECTORY, "memories.jsonl");
    const userDirectory = userRunner === void 0 ? this.directory : join2(userRunner.effectiveDataDir(), RUNTIME_DIRECTORY);
    this.userController = userDirectory === this.directory || userRunner === void 0 ? void 0 : new _RuntimeMemoryController(userRunner, now, this.limits);
    this.userPath = this.userController?.userPath ?? this.localUserPath;
    this.userSourcePath = this.userController?.sourcePath ?? this.sourcePath;
    this.initialize();
  }
  directory;
  sourcePath;
  userSourcePath;
  memoryPath;
  userPath;
  lockPath;
  /** Where MEMORY.md entries go when compaction leaves them out and no Memory Space can take them. */
  archivePath;
  archiveSourcePath;
  limits;
  queue = Promise.resolve();
  localUserPath;
  userController;
  snapshot() {
    const local = this.readSource();
    if (this.userController === void 0) return this.snapshotUnlocked(local);
    const global = this.userController.readSource();
    return this.snapshotUnlocked({
      version: RUNTIME_MEMORY_VERSION,
      entries: [
        ...global.entries.filter((entry) => entry.target === "user"),
        ...local.entries.filter((entry) => entry.target === "memory")
      ]
    });
  }
  /**
   * Read the exact Runtime revision and its prompt projection from each
   * configured authority root.
   * When a git branch is supplied, target=memory entries scoped to other
   * branches are hidden from the projection; the on-disk Markdown files and
   * the source JSON always remain complete.
   */
  contextProjection(branch) {
    const branchScope = scopeBranch(branch);
    const projectedAt = this.now().getTime();
    const local = this.localContextProjection(projectedAt, branchScope);
    const global = this.userController?.localContextProjection(projectedAt);
    const user = global?.user ?? local.user;
    const memory = local.memory;
    const entries = global === void 0 ? local.snapshot.entries : [
      ...global.snapshot.entries.filter((entry) => entry.target === "user"),
      ...local.snapshot.entries.filter((entry) => entry.target === "memory")
    ];
    const visibleMemory = local.snapshot.targets.memory;
    const visibleUser = global?.snapshot.targets.user ?? local.snapshot.targets.user;
    const snapshot = global === void 0 ? local.snapshot : {
      directory: this.directory,
      sourcePath: this.sourcePath,
      revision: revision({ version: RUNTIME_MEMORY_VERSION, entries }),
      generatedAt: new Date(projectedAt).toISOString(),
      entries,
      targets: {
        memory: { ...visibleMemory, markdownPath: this.memoryPath },
        user: { ...visibleUser, markdownPath: this.userPath }
      }
    };
    const visibleEntries = branchScope === void 0 ? entries : entries.filter((entry) => entry.target === "user" || entryMatchesBranch(entry, branchScope));
    const branchLine = branchScope === void 0 ? "" : `
Git branch: ${branchScope}${local.hidden > 0 ? ` (${local.hidden} branch-scoped entr${local.hidden === 1 ? "y" : "ies"} hidden)` : ""}`;
    return {
      revision: snapshot.revision,
      entries: visibleEntries.map((entry) => ({ ...entry, ...entry.branches === void 0 ? {} : { branches: [...entry.branches] } })),
      totalEntries: entries.length,
      text: `MNEMON RUNTIME MEMORY SNAPSHOT
Entry annotations default to importance=normal and ages=0d (whole days at projection; future/unknown for future/invalid timestamps). Current instructions win. For old_text/oldText, use entry content only.${branchLine}

USER.md (user profile)
<runtime-memory-file name="USER.md">
${user || "(empty)"}
</runtime-memory-file>

MEMORY.md (working reference)
<runtime-memory-file name="MEMORY.md">
${memory || "(empty)"}
</runtime-memory-file>`
    };
  }
  localContextProjection(projectedAt, branch) {
    const branchScope = scopeBranch(branch);
    return this.withLock(() => {
      const file = this.readSource();
      this.repairProjections(file);
      const entries = file.entries.map((entry) => ({ ...entry }));
      const visible = branchScope === void 0 ? entries : entries.filter((entry) => entry.target === "user" || entryMatchesBranch(entry, branchScope));
      return {
        snapshot: {
          directory: this.directory,
          sourcePath: this.sourcePath,
          revision: revision(file),
          generatedAt: new Date(projectedAt).toISOString(),
          entries,
          targets: {
            memory: this.targetView(visible, "memory"),
            user: this.targetView(visible, "user")
          }
        },
        user: contextMarkdown(visible, "user", projectedAt),
        memory: contextMarkdown(visible, "memory", projectedAt),
        hidden: branchScope === void 0 ? 0 : entries.length - visible.length
      };
    });
  }
  mutate(request, options = {}) {
    if (request.target === "user" && this.userController !== void 0) return this.userController.mutate(request, options);
    const operation = this.queue.then(() => this.withLock(() => this.mutateLocked(request, options.preserveImportance)));
    this.queue = operation.catch(() => void 0);
    return operation;
  }
  /** Resolve exactly which committed entries survive a blocked mutation and are safe to compact. */
  planMaintenance(request, options = {}) {
    if (request.target === "user" && this.userController !== void 0) return this.userController.planMaintenance(request, options);
    const operation = this.queue.then(() => this.withLock(() => {
      const file = this.readSource();
      const prepared = prepareMutation(file.entries, request, this.now().toISOString(), options.preserveImportance);
      const used = runtimeBytes(file.entries, request.target);
      const projected = runtimeBytes(prepared.projectedEntries, request.target);
      const limit = this.limits[request.target];
      return {
        revision: revision(file),
        action: request.action,
        target: request.target,
        entries: prepared.compactableEntries.map((entry) => ({ ...entry })),
        ...prepared.pendingEntry === void 0 ? {} : {
          pending: { content: prepared.pendingEntry.content, importance: prepared.pendingEntry.importance }
        },
        ...prepared.excludedEntry === void 0 ? {} : { excluded: { ...prepared.excludedEntry } },
        used,
        projected,
        limit,
        requiresMaintenance: prepared.changed && projected > limit,
        localArchive: true
      };
    }));
    this.queue = operation.catch(() => void 0);
    return operation;
  }
  /**
   * Commit semantic compaction and the original mutation together, or leave every local file unchanged.
   * With `archive: 'local'`, committed MEMORY.md entries that compaction leaves out are appended to the
   * local archive first, so a limit with no Memory Space to archive into never loses memory.
   */
  compactAndMutate(expectedRevision, request, compacted, maxCompactedBytes, options = {}) {
    if (request.target === "user" && this.userController !== void 0) {
      return this.userController.compactAndMutate(expectedRevision, request, compacted, maxCompactedBytes, options);
    }
    const operation = this.queue.then(() => this.withLock(() => {
      const file = this.readSource();
      const beforeRevision = revision(file);
      if (beforeRevision !== expectedRevision) throw new RuntimeMemoryConflictError();
      const now = this.now().toISOString();
      const prepared = prepareMutation(file.entries, request, now, options.preserveImportance);
      const compactedByteBudget = maxCompactedBytes ?? this.limits[request.target];
      if (!Number.isInteger(compactedByteBudget) || compactedByteBudget < 0 || compactedByteBudget > this.limits[request.target]) {
        throw new Error("compaction byte budget is invalid");
      }
      if (!prepared.changed) {
        return this.result(request.target, prepared.projectedEntries, prepared.fields);
      }
      const replacements = compactionCandidates(compacted, prepared.compactableEntries, request.target, now);
      if (prepared.pendingEntry !== void 0 && replacements.some((entry) => entry.content === prepared.pendingEntry.content)) {
        throw new Error("compacted runtime memory duplicates the pending mutation");
      }
      if (prepared.excludedEntry !== void 0 && replacements.some((entry) => entry.content === prepared.excludedEntry.content)) {
        throw new Error("compacted runtime memory reintroduces the replaced or removed entry");
      }
      const fitted = packCompactionCandidates(replacements, request.target, compactedByteBudget);
      const targetEntries = [...fitted, ...prepared.pendingEntry === void 0 ? [] : [prepared.pendingEntry]];
      const entries = [...file.entries.filter((entry) => entry.target !== request.target), ...targetEntries];
      const used = runtimeBytes(entries, request.target);
      const limit = this.limits[request.target];
      if (used > limit) throw new RuntimeMemoryCapacityError(request.target, runtimeBytes(file.entries, request.target), used, limit);
      const next = { version: RUNTIME_MEMORY_VERSION, entries };
      const kept = new Set(fitted.map((entry) => entry.content));
      const archived = options.archive === "local" && request.target === "memory" ? prepared.compactableEntries.filter((entry) => !kept.has(entry.content)) : void 0;
      if (archived !== void 0 && archived.length > 0) this.archiveLocally(archived, beforeRevision, now);
      this.persist(next);
      return {
        ...this.result(request.target, entries, prepared.fields),
        ...archived === void 0 ? {} : { archived: { entries: archived.length, path: this.archivePath } }
      };
    }));
    this.queue = operation.catch(() => void 0);
    return operation;
  }
  /** Append entries to the local archive: JSON Lines to restore from, and Markdown to read. */
  archiveLocally(entries, fromRevision, archivedAt) {
    const directory = join2(this.directory, RUNTIME_ARCHIVE_DIRECTORY);
    mkdirSync(directory, { recursive: true, mode: 448 });
    const stat = lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Runtime Memory archive is not a directory: ${directory}`);
    for (const path of [this.archiveSourcePath, this.archivePath]) {
      let file;
      try {
        file = lstatSync(path);
      } catch {
        continue;
      }
      if (!file.isFile()) throw new Error(`Runtime Memory archive file is not a regular file: ${path}`);
    }
    appendWithoutLinks(this.archiveSourcePath, entries.map((entry) => `${JSON.stringify({ archivedAt, fromRevision, ...entry })}
`).join(""));
    const header = existsSync(this.archivePath) ? "" : "# MEMORY.md archive\n\nEntries that left MEMORY.md at its limit while no Memory Space could take them, oldest first.\n";
    appendWithoutLinks(this.archivePath, `${header}
## ${archivedAt}

${entries.map((entry) => entry.content).join(RUNTIME_ENTRY_DELIMITER)}
`);
  }
  initialize() {
    mkdirSync(this.directory, { recursive: true, mode: 448 });
    this.withLock(() => {
      const file = this.readSource();
      this.persist(file);
    });
  }
  mutateLocked(request, preserveImportance = false) {
    const file = this.readSource();
    const prepared = prepareMutation(file.entries, request, this.now().toISOString(), preserveImportance);
    if (!prepared.changed) return this.result(request.target, prepared.projectedEntries, prepared.fields);
    const used = runtimeBytes(prepared.projectedEntries, request.target);
    const limit = this.limits[request.target];
    if (used > limit) throw new RuntimeMemoryCapacityError(request.target, runtimeBytes(file.entries, request.target), used, limit);
    this.persist({ version: RUNTIME_MEMORY_VERSION, entries: prepared.projectedEntries });
    return this.result(request.target, prepared.projectedEntries, prepared.fields);
  }
  result(target, entries, fields) {
    return {
      success: true,
      message: fields.message,
      target,
      entryCount: entries.filter((entry) => entry.target === target).length,
      usage: { used: runtimeBytes(entries, target), limit: this.limits[target] },
      ...fields.added === void 0 ? {} : { added: fields.added },
      ...fields.replaced === void 0 ? {} : { replaced: fields.replaced },
      ...fields.removed === void 0 ? {} : { removed: fields.removed }
    };
  }
  targetView(entries, target) {
    return {
      target,
      entryCount: entries.filter((entry) => entry.target === target).length,
      used: runtimeBytes(entries, target),
      limit: this.limits[target],
      markdownPath: target === "memory" ? this.memoryPath : this.userPath
    };
  }
  snapshotUnlocked(file) {
    const entries = file.entries.map((entry) => ({ ...entry }));
    return {
      directory: this.directory,
      sourcePath: this.sourcePath,
      revision: revision(file),
      generatedAt: this.now().toISOString(),
      entries,
      targets: {
        memory: this.targetView(entries, "memory"),
        user: this.targetView(entries, "user")
      }
    };
  }
  readSource() {
    if (!existsSync(this.sourcePath)) return { version: RUNTIME_MEMORY_VERSION, entries: [] };
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(this.sourcePath, "utf8"));
    } catch (error) {
      throw new Error(`runtime memories.json is unreadable: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (!isRecord(parsed) || parsed.version !== RUNTIME_MEMORY_VERSION || !Array.isArray(parsed.entries)) {
      throw new Error(`runtime memories.json must use version ${RUNTIME_MEMORY_VERSION}`);
    }
    const entries = parsed.entries.map(parseEntry);
    if (entries.some((entry) => entry === void 0)) throw new Error("runtime memories.json contains an invalid entry");
    return { version: RUNTIME_MEMORY_VERSION, entries };
  }
  persist(file) {
    mkdirSync(this.directory, { recursive: true, mode: 448 });
    const nonce = `${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
    const writes = [
      [this.localUserPath, runtimeProjection(file.entries, "user")],
      [this.memoryPath, runtimeProjection(file.entries, "memory")],
      [this.sourcePath, `${JSON.stringify(file, null, 2)}
`]
    ];
    const temporaries = writes.map(([path]) => join2(this.directory, `.${basename(path)}.${nonce}.tmp`));
    try {
      writes.forEach(([, content], index) => writeFileSync(temporaries[index], content, { encoding: "utf8", mode: 384 }));
      writes.forEach(([path], index) => renameSync(temporaries[index], path));
    } finally {
      for (const temporary of temporaries) rmSync(temporary, { force: true });
    }
  }
  repairProjections(file) {
    for (const [path, target] of [[this.localUserPath, "user"], [this.memoryPath, "memory"]]) {
      const expected = runtimeProjection(file.entries, target);
      let current;
      try {
        current = readFileSync(path, "utf8");
      } catch {
        current = void 0;
      }
      if (current === expected) continue;
      const temporary = join2(this.directory, `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
      try {
        writeFileSync(temporary, expected, { encoding: "utf8", mode: 384 });
        renameSync(temporary, path);
      } finally {
        rmSync(temporary, { force: true });
      }
    }
  }
  withLock(callback) {
    const started = Date.now();
    let descriptor;
    while (descriptor === void 0) {
      try {
        descriptor = openSync(this.lockPath, "wx", 384);
      } catch (error) {
        const code = isRecord(error) && typeof error.code === "string" ? error.code : void 0;
        if (code !== "EEXIST") throw error;
        try {
          if (Date.now() - statSync(this.lockPath).mtimeMs > RUNTIME_LOCK_STALE_MS) {
            rmSync(this.lockPath, { force: true });
            continue;
          }
        } catch {
          continue;
        }
        if (Date.now() - started >= LOCK_TIMEOUT_MS) throw new Error("timed out waiting for the runtime memory controller lock");
        sleepSync(LOCK_RETRY_MS);
      }
    }
    try {
      return callback();
    } finally {
      closeSync(descriptor);
      rmSync(this.lockPath, { force: true });
    }
  }
};

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/source.ts
var ACTIONS = /* @__PURE__ */ new Set(["add", "replace", "remove"]);
var TARGETS = /* @__PURE__ */ new Set(["memory", "user"]);
var IMPORTANCE = /* @__PURE__ */ new Set(["critical", "normal", "low"]);
function runtimeMutation(value) {
  const input = record(value, "Runtime Memory mutation");
  const action = text(input.action, "action", 20);
  const target = text(input.target, "target", 20);
  if (!ACTIONS.has(action)) throw new Error(`unsupported Runtime Memory action: ${action}`);
  if (!TARGETS.has(target)) throw new Error(`unsupported Runtime Memory target: ${target}`);
  const importance = text(input.importance, "importance", 20, false);
  if (importance !== void 0 && !IMPORTANCE.has(importance)) throw new Error(`unsupported Runtime Memory importance: ${importance}`);
  return {
    action,
    target,
    ...text(input.content, "content", 1e5, false) === void 0 ? {} : { content: text(input.content, "content", 1e5, false) },
    ...text(input.oldText ?? input.old_text, "oldText", 1e5, false) === void 0 ? {} : { oldText: text(input.oldText ?? input.old_text, "oldText", 1e5, false) },
    ...importance === void 0 ? {} : { importance },
    ...input.branches === void 0 ? {} : { branches: stringArray(input.branches, "branches", 100) ?? [] }
  };
}
function createRuntimeMemorySource(config = {}) {
  const configured = Object.freeze({ ...config });
  return defineMemorySource({
    manifest: {
      apiVersion: COMPOSABLE_MEMORY_API_VERSION,
      kind: "source",
      typeId: "runtime",
      packageName: "dsh-mnemon-source-runtime",
      role: "working-context",
      capabilities: ["status", "project", "write"],
      consistency: "exact-snapshot",
      actions: [{
        id: "mutate",
        description: "Add, replace, or remove an entry in Runtime Memory.",
        capability: "write",
        inputSchema: {
          type: "object",
          required: ["action", "target"],
          additionalProperties: false,
          properties: {
            action: { type: "string", enum: ["add", "replace", "remove"] },
            target: { type: "string", enum: ["memory", "user"] },
            content: { type: "string" },
            oldText: { type: "string", description: "Full content of the existing entry, or a unique substring, excluding the generated metadata line. A unique full-content match takes precedence within the selected target. Required for replace and remove." },
            importance: { type: "string", enum: ["critical", "normal", "low"] },
            branches: { type: "array" }
          }
        }
      }],
      management: {
        label: "Runtime Memory",
        description: "Exact, bounded working context and user profile projection."
      }
    },
    create(context) {
      const effective = runtimeSourceConfig({ ...context.configuration, ...configured }, context.sourceInstanceKey);
      const controller = new RuntimeMemoryController(
        { effectiveDataDir: () => effective.dataDir },
        void 0,
        { memory: effective.memoryLimitBytes, user: effective.userLimitBytes },
        { effectiveDataDir: () => effective.userDataDir }
      );
      const projection = (workspaceId) => controller.contextProjection(resolveGitBranch(workspaceId));
      const prepared = /* @__PURE__ */ new WeakMap();
      return {
        facts(request) {
          if (request.scenario.startsWith("management.")) return {
            sourceInstanceKey: context.sourceInstanceKey,
            sourceTypeId: "runtime",
            role: "working-context",
            availability: "ready",
            revision: controller.snapshot().revision,
            capabilities: ["status", "project", "write"],
            routeIds: [],
            actionIds: ["mutate"]
          };
          const current = projection(request.scope.workspaceId);
          prepared.set(request.scope, current);
          return {
            sourceInstanceKey: context.sourceInstanceKey,
            sourceTypeId: "runtime",
            role: "working-context",
            availability: "ready",
            revision: current.revision,
            capabilities: ["status", "project", "write"],
            routeIds: [],
            actionIds: ["mutate"]
          };
        },
        project(request) {
          if (!request.includeProjection) return { fragments: [] };
          const current = prepared.get(request.scope) ?? projection(request.scope.workspaceId);
          prepared.delete(request.scope);
          if (current.revision !== request.expectedRevision) throw new Error("Runtime projection revision changed during composition");
          return {
            fragments: [{
              id: `${context.sourceInstanceKey}/projection`,
              sourceInstanceKey: context.sourceInstanceKey,
              mode: request.mode,
              text: truncate(current.text, request.maxCharacters),
              revision: current.revision,
              provenance: { sourceTypeId: "runtime" }
            }],
            presentation: {
              visibleItems: current.entries.length,
              totalItems: current.totalEntries,
              items: current.entries.slice(0, 24).map((entry, index) => ({
                id: `${entry.target}:${entry.created_at}:${index}`,
                title: truncate(entry.content, 160)
              }))
            }
          };
        },
        async manage(request) {
          const input = request.input === null ? {} : record(request.input, "Runtime Memory management");
          if (request.mode === "read") {
            let value;
            if (request.operation === "snapshot") value = controller.snapshot();
            else if (request.operation === "maintenance-plan") value = await controller.planMaintenance(runtimeMutation(request.input), { preserveImportance: input.preserveImportance === true });
            else throw new Error("unsupported Runtime management read operation: " + request.operation);
            return { revision: controller.snapshot().revision, value };
          }
          if (!request.confirmed) throw new Error("Runtime management mutation requires explicit confirmation");
          let result;
          if (request.operation === "mutate") result = await controller.mutate(runtimeMutation(request.input), { preserveImportance: input.preserveImportance === true });
          else if (request.operation === "compact-and-mutate") {
            if (!Array.isArray(input.compacted)) throw new Error("compacted must be an array");
            const compacted = input.compacted.map((value) => {
              const entry = record(value, "compacted entry");
              const importance = text(entry.importance, "importance", 20);
              if (!IMPORTANCE.has(importance)) throw new Error("invalid compacted importance");
              return {
                content: text(entry.content, "content", 1e5),
                importance,
                ...entry.branches === void 0 ? {} : { branches: stringArray(entry.branches, "branches", 100) ?? [] }
              };
            });
            if (input.archive !== void 0 && input.archive !== "local") throw new Error('archive must be "local" when given');
            result = await controller.compactAndMutate(
              text(input.revision, "revision", 300),
              runtimeMutation(input.mutation),
              compacted,
              typeof input.maxBytes === "number" ? input.maxBytes : void 0,
              { ...input.archive === "local" ? { archive: "local" } : {}, preserveImportance: input.preserveImportance === true }
            );
          } else throw new Error("unsupported Runtime management mutation operation: " + request.operation);
          return { revision: controller.snapshot().revision, value: result };
        },
        async mutate(request) {
          const result = await controller.mutate(runtimeMutation(request.input), { preserveImportance: true });
          const revision2 = controller.snapshot().revision;
          return receipt(request.view.id, request.offer.id, context.sourceInstanceKey, revision2, result, "committed");
        }
      };
    }
  });
}
var RUNTIME_MEMORY_SOURCE = createRuntimeMemorySource();

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/index.ts
var name = "dsh-mnemon-source-runtime";
var inject = ["mnemonMemory"];
var memoryPlugin = defineMemoryPlugin({
  packageName: name,
  label: { en: "Runtime memory", "zh-CN": "\u8FD0\u884C\u65F6\u8BB0\u5FC6" },
  description: { en: "Bounded, deterministic hot memory injected directly into every eligible turn.", "zh-CN": "\u6709\u754C\u4E14\u786E\u5B9A\u7684\u70ED\u8BB0\u5FC6\uFF0C\u5728\u6BCF\u4E2A\u7B26\u5408\u6761\u4EF6\u7684\u56DE\u5408\u4E2D\u76F4\u63A5\u6CE8\u5165\u3002" },
  roles: ["source"],
  provides: [{ id: "source" }, { id: "source.working-context" }]
});
function apply(ctx, config = {}) {
  installMemory(ctx, { plugin: memoryPlugin, sources: [createRuntimeMemorySource(config)] }, { effectiveDigest: memoryConfigurationDigest(config) });
}
export {
  Config,
  RUNTIME_MEMORY_SOURCE,
  apply,
  createRuntimeMemorySource,
  inject,
  memoryPlugin,
  name
};
