import {
  provideMemoryRuntime
} from "./chunk-QB2IHHKL.js";
import "./chunk-ORGDM7RZ.js";
import "./chunk-TSXFSIB7.js";
import "./chunk-FES2HEG7.js";

// ../../memory-provider-validation/mnemon/src/core/plugin.ts
var name = "dsh-mnemon-core";
var provide = ["mnemonMemory"];
var inject = [];
function apply(context) {
  provideMemoryRuntime(context);
}
export {
  apply,
  inject,
  name,
  provide
};
