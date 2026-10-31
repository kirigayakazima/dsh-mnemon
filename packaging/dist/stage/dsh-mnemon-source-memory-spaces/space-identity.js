// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-memory-spaces/src/mnemon-store-identity.ts
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
var USAGE_TABLES = /* @__PURE__ */ new Set(["oplog"]);
var USAGE_COLUMNS = /* @__PURE__ */ new Set(["access_count", "last_accessed_at", "effective_importance", "embedding"]);
var ROW_VALUES = /* @__PURE__ */ new Map([
  ["edges", /* @__PURE__ */ new Set(["weight", "metadata", "created_at"])],
  ["insights", /* @__PURE__ */ new Set(["updated_at"])]
]);
var SCRATCH_PREFIX = ".dsh-space-identity-";
var IDENTITY_MAX_ROWS = 5e5;
var MERGE_MAX_ROWS = 2e6;
function sqlite() {
  try {
    return process.getBuiltinModule?.("node:sqlite");
  } catch {
    return void 0;
  }
}
function quote(name) {
  return '"' + name.replaceAll('"', '""') + '"';
}
function cell(value) {
  if (value instanceof Uint8Array) return { blob: Buffer.from(value).toString("base64") };
  if (typeof value === "bigint") return { integer: String(value) };
  if (typeof value === "number") return { real: Object.is(value, -0) ? "-0" : String(value) };
  return value;
}
function rowDigest(columns, row) {
  return createHash("sha256").update(JSON.stringify(columns.map((column) => cell(row[column])))).digest("base64").slice(0, 22);
}
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function sameBytes(left, right) {
  return left === right || Buffer.from(left.buffer, left.byteOffset, left.byteLength).equals(right);
}
function remove(path) {
  try {
    rmSync(path, { recursive: true, force: true, maxRetries: 3 });
  } catch {
  }
}
var MnemonStoreIdentity = class {
  /** `parent` holds the short-lived copies a database is read from. */
  constructor(parent, options = {}) {
    this.parent = parent;
    this.module = options.sqlite ?? sqlite;
    this.maxRows = options.maxRows ?? IDENTITY_MAX_ROWS;
    this.remaining = options.maxMergeRows ?? MERGE_MAX_ROWS;
  }
  scratch;
  known = /* @__PURE__ */ new WeakMap();
  projections = /* @__PURE__ */ new WeakMap();
  module;
  maxRows;
  remaining;
  of(bytes) {
    return this.contents(bytes)?.identity ?? "bytes:" + digest(bytes);
  }
  /** Whether `outer` holds every row `inner` holds; `outer` may have columns `inner` lacks. */
  contains(outer, inner) {
    if (sameBytes(outer, inner)) return true;
    const whole = this.contents(outer);
    const part = this.contents(inner);
    if (whole === void 0 || part === void 0) return false;
    for (const [name, table] of part.tables) {
      const present = this.rowsOn(outer, whole, name, table.columns);
      if (present === void 0) return false;
      for (const row of table.rows) if (!present.has(row)) return false;
    }
    return true;
  }
  /**
   * `local` with the rows only `incoming` holds added to it, or undefined when the two cannot
   * merge: a row both hold differently, a table or column `local` lacks, or a database that
   * cannot be read. `local` itself comes back when it already holds everything.
   */
  merge(local, incoming) {
    if (sameBytes(local, incoming)) return local;
    const mine = this.contents(local);
    const theirs = this.contents(incoming);
    if (mine === void 0 || theirs === void 0) return void 0;
    const missing = /* @__PURE__ */ new Map();
    for (const [name, table] of theirs.tables) {
      const present = this.rowsOn(local, mine, name, table.columns);
      if (present === void 0) return void 0;
      const rows = new Set([...table.rows].filter((row) => !present.has(row)));
      if (rows.size > 0) missing.set(name, rows);
    }
    if (missing.size === 0) return local;
    const module = this.module();
    const directory = this.directory();
    if (module === void 0 || directory === void 0) return void 0;
    const target = join(directory, randomUUID() + ".db");
    const source = join(directory, randomUUID() + ".db");
    let writer;
    let reader;
    try {
      writeFileSync(target, local, { mode: 384 });
      writeFileSync(source, incoming, { mode: 384 });
      writer = this.open(module, target, false);
      reader = this.open(module, source, true);
      if (writer === void 0 || reader === void 0) return void 0;
      writer.exec("BEGIN IMMEDIATE");
      writer.exec("PRAGMA defer_foreign_keys = ON");
      for (const [name, rows] of missing) {
        const table = theirs.tables.get(name);
        const own = mine.tables.get(name);
        const written = table.all.filter((column) => own.all.includes(column));
        const insert = writer.prepare(`INSERT INTO ${quote(name)} (${written.map(quote).join(", ")}) VALUES (${written.map(() => "?").join(", ")})`);
        const statement = reader.prepare(`SELECT ${written.map(quote).join(", ")} FROM ${quote(name)}`);
        statement.setReadBigInts(true);
        for (const row of statement.iterate()) {
          if (!this.spend()) throw new Error("the merge read limit was reached");
          if (!rows.has(rowDigest(table.columns, row))) continue;
          insert.run(...written.map((column) => row[column]));
        }
      }
      writer.exec("COMMIT");
      writer.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      writer.close();
      writer = void 0;
      return readFileSync(target);
    } catch {
      return void 0;
    } finally {
      for (const database of [writer, reader]) {
        try {
          database?.close();
        } catch {
        }
      }
      for (const path of [target, source]) for (const suffix of ["", "-wal", "-shm", "-journal"]) remove(path + suffix);
    }
  }
  dispose() {
    if (this.scratch !== void 0) remove(this.scratch);
    this.scratch = void 0;
  }
  spend() {
    this.remaining -= 1;
    return this.remaining >= 0;
  }
  contents(bytes) {
    const known = this.known.get(bytes);
    if (known !== void 0) return known ?? void 0;
    const contents = this.read(bytes);
    this.known.set(bytes, contents ?? null);
    return contents;
  }
  /** The digests of a table's rows over `columns`, which may leave out columns the table has. */
  rowsOn(bytes, contents, name, columns) {
    const table = contents.tables.get(name);
    if (table === void 0 || !columns.every((column) => table.columns.includes(column))) return void 0;
    if (columns.length === table.columns.length) return table.rows;
    const key = JSON.stringify([name, columns]);
    const cached = this.projections.get(bytes) ?? /* @__PURE__ */ new Map();
    this.projections.set(bytes, cached);
    if (!cached.has(key)) cached.set(key, this.withCopy(bytes, true, (database) => this.digests(database, name, columns) ?? null) ?? null);
    return cached.get(key) ?? void 0;
  }
  digests(database, name, columns) {
    const rows = /* @__PURE__ */ new Set();
    if (columns.length === 0) return rows;
    const statement = database.prepare(`SELECT ${columns.map(quote).join(", ")} FROM ${quote(name)}`);
    statement.setReadBigInts(true);
    let budget = this.maxRows;
    for (const row of statement.iterate()) {
      budget -= 1;
      if (budget < 0 || !this.spend()) return void 0;
      rows.add(rowDigest(columns, row));
    }
    return rows;
  }
  directory() {
    try {
      if (this.scratch === void 0) {
        for (const name of readdirSync(this.parent)) if (name.startsWith(SCRATCH_PREFIX)) remove(join(this.parent, name));
      }
      if (this.scratch === void 0 || !existsSync(this.scratch)) this.scratch = mkdtempSync(join(this.parent, SCRATCH_PREFIX));
    } catch {
      return void 0;
    }
    return this.scratch;
  }
  /** A connection to a private copy, refused when the copy is missing or empty rather than created. */
  open(module, path, readOnly) {
    if (!existsSync(path)) return void 0;
    const database = new module.DatabaseSync(path, { readOnly });
    database.exec("PRAGMA trusted_schema = OFF");
    const pages = database.prepare("PRAGMA page_count").get();
    if (Number(pages?.page_count ?? 0) <= 0) {
      database.close();
      return void 0;
    }
    return database;
  }
  withCopy(bytes, readOnly, use) {
    const module = this.module();
    if (module === void 0) return void 0;
    const directory = this.directory();
    if (directory === void 0) return void 0;
    const path = join(directory, randomUUID() + ".db");
    let database;
    try {
      writeFileSync(path, bytes, { mode: 384 });
      database = this.open(module, path, readOnly);
      return database === void 0 ? void 0 : use(database);
    } catch {
      return void 0;
    } finally {
      try {
        database?.close();
      } catch {
      }
      for (const suffix of ["", "-wal", "-shm", "-journal"]) remove(path + suffix);
    }
  }
  read(bytes) {
    return this.withCopy(bytes, true, (database) => {
      const listed = database.prepare("SELECT name, type FROM pragma_table_list WHERE schema = 'main'").all();
      if (listed.some((entry) => entry.type !== "table" && entry.type !== "view")) return void 0;
      const names = listed.filter((entry) => entry.type === "table" && !entry.name.startsWith("sqlite_") && !USAGE_TABLES.has(entry.name)).map((entry) => entry.name).sort();
      const hash = createHash("sha256");
      const tables = /* @__PURE__ */ new Map();
      let budget = this.maxRows;
      for (const name of names) {
        const all = database.prepare(`PRAGMA table_info(${quote(name)})`).all().map((column) => column.name);
        const columns = all.filter((column) => !USAGE_COLUMNS.has(column) && ROW_VALUES.get(name)?.has(column) !== true).sort();
        const rows = [];
        if (columns.length > 0) {
          const statement = database.prepare(`SELECT ${columns.map(quote).join(", ")} FROM ${quote(name)}`);
          statement.setReadBigInts(true);
          for (const row of statement.iterate()) {
            budget -= 1;
            if (budget < 0 || !this.spend()) return void 0;
            rows.push(rowDigest(columns, row));
          }
        }
        rows.sort();
        hash.update(JSON.stringify(["table", name, columns, rows.length]));
        for (const row of rows) hash.update(row);
        tables.set(name, { columns, all, rows: new Set(rows) });
      }
      return { identity: "content:" + hash.digest("hex"), tables };
    });
  }
};

// ../../memory-provider-validation/mnemon/plugins/dsh-mnemon-source-memory-spaces/src/space-identity.ts
var MemorySpaceIdentity = class {
  #identity;
  /** `parent` holds the short-lived copies a store is read from; dispose of the identity when done. */
  constructor(parent) {
    this.#identity = new MnemonStoreIdentity(parent);
  }
  /** The store's content identity, or the digest of its bytes when its content cannot be read. */
  of(bytes) {
    return this.#identity.of(bytes);
  }
  /** Whether `outer` holds every row `inner` holds; `outer` may have columns `inner` lacks. */
  contains(outer, inner) {
    return this.#identity.contains(outer, inner);
  }
  /**
   * `local` with the rows only `incoming` holds added to it, or undefined when the two cannot
   * merge: a row both hold differently, a table or column `local` lacks, or a store that cannot
   * be read. `local` itself comes back when it already holds everything.
   */
  merge(local, incoming) {
    return this.#identity.merge(local, incoming);
  }
  /** Remove the short-lived copies the identity made. */
  dispose() {
    this.#identity.dispose();
  }
};
export {
  MemorySpaceIdentity
};
