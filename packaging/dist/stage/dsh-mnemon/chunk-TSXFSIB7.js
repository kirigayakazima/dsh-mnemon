// ../../memory-provider-validation/mnemon/src/core/contracts/plugin.ts
var MEMORY_PLUGIN_API_VERSION = "dsh-mnemon/plugin/v1";

// ../../memory-provider-validation/mnemon/src/core/contracts/view.ts
var COMPOSABLE_MEMORY_API_VERSION = "dsh-mnemon/v1";
var MEMORY_STRATEGY_WORKFLOWS = ["idle-review", "runtime-capacity"];
var ANY_MEMORY_STRATEGY = "*";
var ANY_MEMORY_SOURCE_ROLE = "*";
var MEMORY_VIEW_EXTENSION_SLOTS = ["selection", "projection", "capture"];
var DEFAULT_MEMORY_VIEW_BUDGET = Object.freeze({
  maxProjectionCharacters: 64 * 1024,
  maxRoutes: 16,
  maxActions: 16,
  maxEvidenceResults: 16,
  maxEvidenceCharacters: 16 * 1024
});

// ../../memory-provider-validation/mnemon/src/core/contracts/index.ts
var MEMORY_CAPABILITIES = [
  "status",
  "project",
  "recall",
  "search",
  "read",
  "browse",
  "write",
  "archive",
  "graph",
  "related",
  "link",
  "forget",
  "maintain",
  "export",
  "import"
];
var MEMORY_SOURCE_MODES = ["eager", "routed"];

export {
  MEMORY_PLUGIN_API_VERSION,
  COMPOSABLE_MEMORY_API_VERSION,
  MEMORY_STRATEGY_WORKFLOWS,
  ANY_MEMORY_STRATEGY,
  ANY_MEMORY_SOURCE_ROLE,
  MEMORY_VIEW_EXTENSION_SLOTS,
  DEFAULT_MEMORY_VIEW_BUDGET,
  MEMORY_CAPABILITIES,
  MEMORY_SOURCE_MODES
};
