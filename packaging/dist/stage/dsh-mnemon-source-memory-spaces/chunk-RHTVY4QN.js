// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-memory-spaces/src/contracts.ts
var NATIVE_PROVIDER_ID = "mnemon-native";
function isNativeProvider(provider) {
  return (provider.typeId ?? provider.id) === NATIVE_PROVIDER_ID;
}
var MEMORY_PLACEMENT_CAPABILITIES = ["graph", "entities", "related", "exact-write", "link", "forget"];
var CATEGORIES = ["preference", "decision", "fact", "insight", "context", "general"];
var SOURCES = ["user", "agent", "external"];
var EDGE_TYPES = ["temporal", "semantic", "causal", "entity"];
var INTENTS = ["WHY", "WHEN", "ENTITY", "GENERAL"];
function normalizeEntityKey(entity) {
  return entity.normalize("NFKC").trim().toLocaleLowerCase();
}
var DEFAULT_EMBEDDING_ENDPOINT = "http://localhost:11434";
var DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
var EMBEDDING_PROTOCOL_AUTO = "auto";
var EMBEDDING_PROTOCOL_OLLAMA = "ollama";
var EMBEDDING_PROTOCOL_OPENAI = "openai";
var DEFAULT_EMBEDDING_PROTOCOL = EMBEDDING_PROTOCOL_AUTO;
var MNEMON_EMBEDDING_PROTOCOLS = [EMBEDDING_PROTOCOL_AUTO, EMBEDDING_PROTOCOL_OLLAMA, EMBEDDING_PROTOCOL_OPENAI];
var MEMORY_SPACES_DIRECTORY = "data";
var MEMORY_SPACE_REGISTRY_FILE = ".dsh-memory-bodies.json";
var MEMORY_SPACE_DATABASE_FILE = "mnemon.db";
var MEMORY_SPACE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
var MEMORY_SPACE_NAME_MAX_LENGTH = 100;
var MEMORY_SPACE_DESCRIPTION_MAX_LENGTH = 1e3;
var MNEMON_ACTIVE_STORE_FILE = "active";
var MEMORY_PROVIDER_REGISTRY_FILE = "memory-providers.json";
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseMemorySpaceRegistry(value) {
  const registry = isObject(value) ? value : void 0;
  if (registry?.version !== 1 || !Array.isArray(registry.bodies)) throw new Error("Memory Space registry is invalid");
  const ids = /* @__PURE__ */ new Set();
  const bodies = registry.bodies.map((raw) => {
    const body = isObject(raw) ? raw : void 0;
    if (typeof body?.id !== "string" || !MEMORY_SPACE_ID_PATTERN.test(body.id) || ids.has(body.id)) throw new Error("Memory Space registry contains an invalid or duplicate id");
    if (typeof body.name !== "string" || body.name.trim() === "" || body.name.length > MEMORY_SPACE_NAME_MAX_LENGTH || typeof body.description !== "string" || body.description.length > MEMORY_SPACE_DESCRIPTION_MAX_LENGTH) throw new Error("Memory Space registry contains invalid metadata");
    if (typeof body.createdAt !== "string" || typeof body.updatedAt !== "string") throw new Error("Memory Space registry contains invalid timestamps");
    ids.add(body.id);
    return { id: body.id, name: body.name, description: body.description, active: body.active === true, createdAt: body.createdAt, updatedAt: body.updatedAt };
  });
  return { version: 1, bodies };
}
function summarizeMemorySpaceRegistry(value) {
  const registry = isObject(value) ? value : void 0;
  const listed = registry?.bodies;
  const spaces = Array.isArray(listed) ? listed.filter(isObject) : [];
  return {
    valid: registry?.version === 1 && Array.isArray(listed),
    spaces: spaces.length,
    active: spaces.filter((space) => space.active === true).length
  };
}
function summarizeMemoryProviderRegistry(value) {
  const registry = isObject(value) ? value : void 0;
  const services = registry?.services;
  const listed = registry?.bodies;
  return {
    valid: registry !== void 0,
    services: isObject(services) ? Object.keys(services).length : 0,
    connections: Array.isArray(listed) ? listed.length : 0
  };
}

export {
  NATIVE_PROVIDER_ID,
  isNativeProvider,
  MEMORY_PLACEMENT_CAPABILITIES,
  CATEGORIES,
  SOURCES,
  EDGE_TYPES,
  INTENTS,
  normalizeEntityKey,
  DEFAULT_EMBEDDING_ENDPOINT,
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_PROTOCOL_AUTO,
  EMBEDDING_PROTOCOL_OLLAMA,
  EMBEDDING_PROTOCOL_OPENAI,
  DEFAULT_EMBEDDING_PROTOCOL,
  MNEMON_EMBEDDING_PROTOCOLS,
  MEMORY_SPACES_DIRECTORY,
  MEMORY_SPACE_REGISTRY_FILE,
  MEMORY_SPACE_DATABASE_FILE,
  MEMORY_SPACE_ID_PATTERN,
  MEMORY_SPACE_NAME_MAX_LENGTH,
  MEMORY_SPACE_DESCRIPTION_MAX_LENGTH,
  MNEMON_ACTIVE_STORE_FILE,
  MEMORY_PROVIDER_REGISTRY_FILE,
  parseMemorySpaceRegistry,
  summarizeMemorySpaceRegistry,
  summarizeMemoryProviderRegistry
};
