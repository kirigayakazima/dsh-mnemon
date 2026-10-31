// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/defaults.ts
var DEFAULT_RUNTIME_MEMORY_LIMIT_BYTES = 10 * 1024;
var DEFAULT_RUNTIME_USER_LIMIT_BYTES = 4 * 1024;
var MAX_RUNTIME_MEMORY_LIMIT_BYTES = 1024 * 1024;

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-runtime/src/contracts.ts
var RUNTIME_MEMORY_VERSION = 1;
var RUNTIME_ENTRY_DELIMITER = "\n\xA7\n";
var RUNTIME_MEMORY_LIMITS = {
  memory: DEFAULT_RUNTIME_MEMORY_LIMIT_BYTES,
  user: DEFAULT_RUNTIME_USER_LIMIT_BYTES
};
var RUNTIME_MEMORY_LIMIT_MAX_BYTES = MAX_RUNTIME_MEMORY_LIMIT_BYTES;
var RUNTIME_BRANCH_NAME_MAX = 128;
var RUNTIME_BRANCH_NAME_PATTERN = /^[A-Za-z0-9._/-]+$/u;
function parseRuntimeBranches(value) {
  if (!Array.isArray(value)) return void 0;
  const branches = [];
  for (const item of value) {
    if (typeof item !== "string" || item === "" || item.length > RUNTIME_BRANCH_NAME_MAX || !RUNTIME_BRANCH_NAME_PATTERN.test(item)) return void 0;
    branches.push(item);
  }
  return branches;
}
var RUNTIME_DIRECTORY = "runtime";
var RUNTIME_MEMORIES_FILE = "memories.json";
var RUNTIME_PROJECTION_FILES = { user: "USER.md", memory: "MEMORY.md" };
var RUNTIME_LOCK_FILE = ".memories.lock";
var RUNTIME_LOCK_STALE_MS = 3e4;
var RUNTIME_ARCHIVE_DIRECTORY = "archived";
var RUNTIME_ENTRY_MAX_BYTES = 8 * 1024;
var utf8;
function joinedContent(entries, target) {
  return entries.filter((entry) => entry.target === target).map((entry) => entry.content).join(RUNTIME_ENTRY_DELIMITER);
}
function runtimeBytes(entries, target) {
  utf8 ??= new TextEncoder();
  return utf8.encode(joinedContent(entries, target)).byteLength;
}
function runtimeProjection(entries, target) {
  const content = joinedContent(entries, target);
  return content === "" ? "" : `${content}
`;
}
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function summarizeRuntimeMemories(value) {
  const entries = isObject(value) && Array.isArray(value.entries) ? value.entries.filter(isObject) : [];
  return {
    valid: isObject(value) && Array.isArray(value.entries),
    entries: entries.length,
    user: entries.filter((entry) => entry.target === "user").length,
    memory: entries.filter((entry) => entry.target === "memory").length
  };
}

export {
  DEFAULT_RUNTIME_MEMORY_LIMIT_BYTES,
  DEFAULT_RUNTIME_USER_LIMIT_BYTES,
  MAX_RUNTIME_MEMORY_LIMIT_BYTES,
  RUNTIME_MEMORY_VERSION,
  RUNTIME_ENTRY_DELIMITER,
  RUNTIME_MEMORY_LIMITS,
  RUNTIME_MEMORY_LIMIT_MAX_BYTES,
  RUNTIME_BRANCH_NAME_MAX,
  RUNTIME_BRANCH_NAME_PATTERN,
  parseRuntimeBranches,
  RUNTIME_DIRECTORY,
  RUNTIME_MEMORIES_FILE,
  RUNTIME_PROJECTION_FILES,
  RUNTIME_LOCK_FILE,
  RUNTIME_LOCK_STALE_MS,
  RUNTIME_ARCHIVE_DIRECTORY,
  RUNTIME_ENTRY_MAX_BYTES,
  runtimeBytes,
  runtimeProjection,
  summarizeRuntimeMemories
};
