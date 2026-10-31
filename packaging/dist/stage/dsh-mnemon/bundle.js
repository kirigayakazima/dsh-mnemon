import {
  prepareStarterResolution
} from "./chunk-5XFXOS2Q.js";
import "./chunk-FES2HEG7.js";

// ../../memory-provider-validation/mnemon/src/bundle.ts
var groupKey = Symbol.for("cordis.group");
var init = Symbol.for("cordis.init");
var MnemonBundle = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
  }
  static inject = ["loader"];
  static [groupKey] = true;
  async *[init]() {
    await prepareStarterResolution(this.ctx);
    const Group = this.ctx.loader?.builtins?.group;
    if (typeof Group !== "function") throw new Error("dsh-mnemon/bundle needs the Loader's cordis:group builtin");
    const group = new Group(this.ctx, this.config);
    yield () => group.stop();
    await group.update(this.config);
  }
};
export {
  MnemonBundle as default
};
