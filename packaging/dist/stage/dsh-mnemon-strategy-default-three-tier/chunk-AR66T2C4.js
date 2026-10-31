// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-strategy-default-three-tier/src/extension-sdk.ts
import { defineMemoryStrategyExtension, memoryViewExtensionValues, validateMemoryViewExtension } from "dsh-mnemon/extension-sdk";
import { COMPOSABLE_MEMORY_API_VERSION } from "dsh-mnemon/contracts";
function threeTierActionWorkflow(strategyTypeId, sourceTypeId, actionId) {
  return strategyTypeId === "default-three-tier" && sourceTypeId === "runtime" && actionId === "mutate" ? "runtime-capacity" : void 0;
}
function validateThreeTierExtension(slot, value) {
  return validateMemoryViewExtension(slot, value);
}
function defineThreeTierExtension(definition) {
  return defineMemoryStrategyExtension({
    manifest: {
      apiVersion: COMPOSABLE_MEMORY_API_VERSION,
      kind: "strategy-extension",
      typeId: definition.typeId,
      packageName: definition.packageName,
      strategyTypeId: "default-three-tier",
      slot: definition.slot,
      deterministic: true
    },
    contribute: (request, sources) => validateMemoryViewExtension(definition.slot, definition.contribute(request, sources))
  });
}
function threeTierContributions(values) {
  return memoryViewExtensionValues(values);
}

export {
  threeTierActionWorkflow,
  validateThreeTierExtension,
  defineThreeTierExtension,
  threeTierContributions
};
