import {
  canonicalMemoryJson,
  deepFreeze
} from "./chunk-ORGDM7RZ.js";

// ../../memory-provider-validation/mnemon/src/sdk/storage-lock.ts
import { resolve } from "node:path";
var queues = /* @__PURE__ */ new Map();
function withMemoryStorageLock(directory, operation) {
  const key = resolve(directory);
  const result = (queues.get(key) ?? Promise.resolve()).then(operation);
  const settled = result.then(() => {
  }, () => {
  });
  queues.set(key, settled);
  void settled.then(() => {
    if (queues.get(key) === settled) queues.delete(key);
  });
  return result;
}

// ../../memory-provider-validation/mnemon/src/sdk/workspace-storage.ts
import { createHash } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve as resolve2 } from "node:path";
function canonicalWorkspacePath(workspacePath) {
  if (!isAbsolute(workspacePath) || workspacePath.includes("\0")) throw new Error("Workspace path must be absolute");
  let parent = resolve2(workspacePath);
  const suffix = [];
  for (; ; ) {
    let real;
    try {
      real = realpathSync.native(parent);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const next = dirname(parent);
      if (next === parent) throw error;
      suffix.unshift(parent.slice(next.length).replace(/^[/\\]+/u, ""));
      parent = next;
      continue;
    }
    if (suffix.length > 0 && !statSync(real).isDirectory()) {
      throw Object.assign(new Error(`ENOTDIR: not a directory, realpath '${parent}'`), { code: "ENOTDIR", path: parent, syscall: "realpath" });
    }
    return join(real, ...suffix);
  }
}
function workspaceStorageId(workspacePath) {
  return createHash("sha256").update(canonicalWorkspacePath(workspacePath)).digest("hex");
}

// ../../memory-provider-validation/mnemon/src/sdk/input.ts
import { createHash as createHash2, randomUUID } from "node:crypto";
function memoryConfigurationDigest(value) {
  return `config:${createHash2("sha256").update(canonicalMemoryJson(value, "memory configuration")).digest("hex")}`;
}
function record(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}
function text(value, label, maximum, required = true) {
  if (value === void 0 && !required) return void 0;
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  const normalized = value.trim();
  if (required && normalized === "") throw new Error(`${label} is required`);
  if (normalized.length > maximum) throw new Error(`${label} is too long (max ${maximum} characters)`);
  return normalized === "" ? void 0 : normalized;
}
function integer(value, fallback, minimum, maximum) {
  if (value === void 0) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`value must be an integer within ${minimum}..${maximum}`);
  }
  return value;
}
function stringArray(value, label, maximum = 50) {
  if (value === void 0) return void 0;
  if (!Array.isArray(value) || value.length > maximum || value.some((item) => typeof item !== "string")) throw new Error(`${label} must be a string array`);
  return value.map((item) => item.trim()).filter(Boolean);
}
function truncate(value, maximum) {
  if (maximum <= 0) return "";
  if (value.length <= maximum) return value;
  let end = maximum - 1;
  if (end > 0 && /[\uD800-\uDBFF]/u.test(value[end - 1])) end--;
  return `${value.slice(0, end)}\u2026`;
}
function receipt(viewId, offerId, sourceInstanceKey, revision, details, completion = "unknown") {
  return {
    id: `receipt:${randomUUID()}`,
    viewId,
    offerId,
    sourceInstanceKey,
    status: completion === "failed" ? "failed" : completion === "partial" || completion === "unknown" ? "partial" : "succeeded",
    completion,
    ...completion === "committed" ? { committedAt: (/* @__PURE__ */ new Date()).toISOString() } : {},
    ...revision === void 0 ? {} : { revision },
    details
  };
}
function migrationLineage(value) {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.length > 1e3) throw new Error("lineage must be an array of at most 1000 entries");
  return value.map((item) => {
    const entry = record(item, "lineage");
    const endpoint = (value2) => {
      const fields = record(value2, "lineage endpoint");
      return {
        layerId: text(fields.layerId, "lineage layerId", 300),
        reference: text(fields.reference, "lineage reference", 2e3),
        digest: text(fields.digest, "lineage digest", 300)
      };
    };
    return { source: endpoint(entry.source), destination: endpoint(entry.destination) };
  });
}

// ../../memory-provider-validation/mnemon/src/sdk/strategy-configuration.ts
function defineMemoryStrategyConfiguration(value) {
  return readMemoryStrategyConfiguration({ ...value, apiVersion: "dsh-mnemon/strategy-configuration/v1" });
}
function readMemoryStrategyConfiguration(value) {
  const text2 = (input) => typeof input === "object" && input !== null && ["en", "zh-CN"].every((key) => {
    const item = input[key];
    return typeof item === "string" && item.trim() !== "" && item.length <= 4e3;
  });
  if (!value || value.apiVersion !== "dsh-mnemon/strategy-configuration/v1" || typeof value.create !== "function" || !["strategy", "strategy-extension"].includes(value.kind) || !/^[a-z][a-z0-9-]{0,127}$/u.test(value.typeId) || !Array.isArray(value.fields) || value.fields.length > 16 || value.fields.some((field) => !field || !/^[a-zA-Z][a-zA-Z0-9]{0,99}$/u.test(field.key) || !["number", "text", "textarea", "string-list", "source-list"].includes(field.input) || !text2(field.label) || field.description !== void 0 && !text2(field.description) || [field.minimum, field.maximum].some((bound) => bound !== void 0 && (typeof bound !== "number" || !Number.isFinite(bound))) || field.sourceRoles !== void 0 && (!Array.isArray(field.sourceRoles) || field.sourceRoles.length > 32 || field.sourceRoles.some((role) => typeof role !== "string" || !role || role.length > 128))) || new Set(value.fields.map((field) => field.key)).size !== value.fields.length || !text2(value.label) || !text2(value.description)) throw new Error("Invalid plugin configuration descriptor");
  const json = canonicalMemoryJson({ label: value.label, description: value.description, fields: value.fields }, "Plugin editor metadata");
  if (json.length > 64 * 1024) throw new Error("Plugin editor metadata exceeds 64 KiB");
  const metadata = deepFreeze(JSON.parse(json));
  const factory = value.create;
  const definition = Object.freeze({
    apiVersion: value.apiVersion,
    kind: value.kind,
    typeId: value.typeId,
    ...metadata,
    create(input) {
      const contribution = factory(memoryStrategyConfigurationValues(definition, input));
      if (!contribution || !Array.isArray(contribution.strategies ?? []) || !Array.isArray(contribution.strategyExtensions ?? [])) {
        throw new Error("Plugin factory must return a Strategy contribution");
      }
      const values = [...contribution.strategies ?? [], ...contribution.strategyExtensions ?? []];
      if ((contribution.sources?.length ?? 0) !== 0 || values.length !== 1 || values[0]?.manifest?.typeId !== definition.typeId || values[0]?.manifest?.kind !== definition.kind || contribution.plugin !== void 0 && contribution.plugin.packageName !== values[0].manifest.packageName) {
        throw new Error("Plugin factory does not match its declared contribution");
      }
      return contribution;
    }
  });
  for (const field of definition.fields) if (field.defaultValue !== void 0) memoryStrategyConfigurationValues(definition, { [field.key]: field.defaultValue });
  return definition;
}
function memoryStrategyConfigurationValues(definition, input) {
  const value = input ?? {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Plugin configuration must be an object");
  const json = JSON.stringify(value);
  if (json.length > 64 * 1024) throw new Error("Plugin configuration exceeds 64 KiB");
  const config = JSON.parse(json);
  const fields = new Map(definition.fields.map((field) => [field.key, field]));
  for (const [key, value2] of Object.entries(config)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Unsafe plugin configuration key");
    const field = fields.get(key);
    if (!field) throw new Error(`Plugin field is not declared for management: ${key}`);
    if (field.input === "number") {
      if (typeof value2 !== "number" || !Number.isFinite(value2) || !Number.isInteger(value2) || field.minimum !== void 0 && value2 < field.minimum || field.maximum !== void 0 && value2 > field.maximum) throw new Error(`Invalid numeric plugin field: ${key}`);
    } else if (field.input === "source-list" || field.input === "string-list") {
      if (!Array.isArray(value2) || value2.length > 32 || value2.some((item) => typeof item !== "string" || !item.trim() || item.length > 500) || new Set(value2).size !== value2.length) throw new Error(`Invalid plugin list: ${key}`);
    } else if (typeof value2 !== "string" || value2.length > (field.maximum ?? 4e3)) throw new Error(`Invalid plugin text: ${key}`);
  }
  return config;
}

export {
  withMemoryStorageLock,
  canonicalWorkspacePath,
  workspaceStorageId,
  memoryConfigurationDigest,
  record,
  text,
  integer,
  stringArray,
  truncate,
  receipt,
  migrationLineage,
  defineMemoryStrategyConfiguration,
  readMemoryStrategyConfiguration,
  memoryStrategyConfigurationValues
};
