import {
  canonicalWorkspacePath,
  defineMemoryStrategyConfiguration,
  integer,
  memoryConfigurationDigest,
  migrationLineage,
  receipt,
  record,
  stringArray,
  text,
  truncate,
  withMemoryStorageLock,
  workspaceStorageId
} from "./chunk-5GK7KW54.js";
import {
  defineMemoryPlugin,
  defineMemorySource,
  defineMemoryStrategy,
  defineMemoryStrategyExtension
} from "./chunk-ORGDM7RZ.js";
import {
  ANY_MEMORY_STRATEGY,
  COMPOSABLE_MEMORY_API_VERSION,
  MEMORY_VIEW_EXTENSION_SLOTS
} from "./chunk-TSXFSIB7.js";
import "./chunk-FES2HEG7.js";

// ../../memory-provider-validation/mnemon/src/sdk/install.ts
function locatedEntryId(ctx) {
  const loader = ctx.get("loader", false);
  const located = loader?.locate(ctx.fiber)?.trim();
  return located === "" ? void 0 : located;
}
function stableEntryId(ctx, explicit) {
  const configured = explicit?.trim();
  if (configured !== void 0 && configured !== "") return configured;
  const located = locatedEntryId(ctx);
  if (located !== void 0) return located;
  throw new Error("installMemory requires a stable Loader Entry id; pass options.instanceId for direct ctx.plugin() mounts");
}
var MARKET_CLIENT_SHIM = /(?:^|:)mkt-client-[^:]*$/u;
function installMemory(ctx, contribution, options = {}) {
  if (MARKET_CLIENT_SHIM.test(locatedEntryId(ctx) ?? "")) return;
  const entryId = stableEntryId(ctx, options.instanceId);
  ctx.effect(() => ctx.mnemonMemory.installContributions(contribution, {
    ...options,
    instanceId: entryId
  }), `dsh-mnemon: install ${entryId}`);
}

// ../../memory-provider-validation/mnemon/src/sdk/view-extensions.ts
var SOURCE_KEY = /^source:[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,292}$/u;
var ACTION_ID = /^[a-z][a-z0-9-]{0,127}$/u;
var FIELDS = {
  selection: ["sourceKeys", "writableSourceKeys"],
  projection: ["maxProjectionCharacters"],
  capture: ["instruction", "actionIds", "sourceKeys"]
};
function sourceKeys(value, label) {
  if (!Array.isArray(value) || value.length > 32 || value.some((key) => typeof key !== "string" || !SOURCE_KEY.test(key))) {
    throw new Error(`${label} must contain at most 32 exact Source instance keys`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} contains duplicate Source keys`);
  return [...value];
}
function validateMemoryViewExtension(slot, value) {
  if (!MEMORY_VIEW_EXTENSION_SLOTS.includes(slot)) throw new Error(`unsupported View extension slot: ${String(slot)}`);
  const input = record(value, `View ${slot} contribution`);
  for (const key of Object.keys(input)) if (!FIELDS[slot].includes(key)) throw new Error(`unsupported View ${slot} field: ${key}`);
  let result;
  if (slot === "selection") {
    const selected = sourceKeys(input.sourceKeys, "sourceKeys");
    const writable = input.writableSourceKeys === void 0 ? void 0 : sourceKeys(input.writableSourceKeys, "writableSourceKeys");
    if (writable?.some((key) => !selected.includes(key))) throw new Error("writableSourceKeys must be within selected sourceKeys");
    result = { sourceKeys: selected, ...writable === void 0 ? {} : { writableSourceKeys: writable } };
  } else if (slot === "projection") {
    if (input.maxProjectionCharacters === void 0) throw new Error("maxProjectionCharacters is required");
    result = { maxProjectionCharacters: integer(input.maxProjectionCharacters, 4096, 1, 1e7) };
  } else {
    const actionIds = input.actionIds;
    if (!Array.isArray(actionIds) || actionIds.length === 0 || actionIds.length > 32 || actionIds.some((id) => typeof id !== "string" || !ACTION_ID.test(id)) || new Set(actionIds).size !== actionIds.length) throw new Error("capture actionIds must name 1..32 distinct Source-local recording actions");
    result = {
      instruction: text(input.instruction, "capture instruction", 4e3),
      actionIds: [...actionIds],
      ...input.sourceKeys === void 0 ? {} : { sourceKeys: sourceKeys(input.sourceKeys, "capture sourceKeys") }
    };
  }
  return result;
}
function memoryViewExtensionValues(contributions) {
  const output = {};
  for (const contribution of contributions) {
    const slot = contribution.slot;
    if (Object.hasOwn(output, slot)) throw new Error(`duplicate View extension slot: ${slot}`);
    Object.assign(output, { [slot]: validateMemoryViewExtension(slot, contribution.value) });
  }
  return output;
}
function defineMemoryViewExtension(definition) {
  return defineMemoryStrategyExtension({
    manifest: {
      apiVersion: COMPOSABLE_MEMORY_API_VERSION,
      kind: "strategy-extension",
      typeId: definition.typeId,
      packageName: definition.packageName,
      strategyTypeId: ANY_MEMORY_STRATEGY,
      slot: definition.slot,
      deterministic: true
    },
    contribute: (request, sources) => validateMemoryViewExtension(definition.slot, definition.contribute(request, sources))
  });
}
export {
  canonicalWorkspacePath,
  receipt as createMemoryMutationReceipt,
  defineMemoryPlugin,
  defineMemorySource,
  defineMemoryStrategy,
  defineMemoryStrategyConfiguration,
  defineMemoryStrategyExtension,
  defineMemoryViewExtension,
  installMemory,
  memoryConfigurationDigest,
  integer as memoryInputInteger,
  migrationLineage as memoryInputMigrationLineage,
  record as memoryInputRecord,
  stringArray as memoryInputStringArray,
  text as memoryInputText,
  memoryViewExtensionValues,
  truncate as truncateMemoryText,
  validateMemoryViewExtension,
  withMemoryStorageLock,
  workspaceStorageId
};
