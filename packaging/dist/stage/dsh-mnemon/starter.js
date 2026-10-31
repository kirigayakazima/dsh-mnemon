import {
  prepareStarterResolution
} from "./chunk-5XFXOS2Q.js";
import "./chunk-FES2HEG7.js";

// ../../memory-provider-validation/mnemon/src/starter.ts
var name = "dsh-mnemon-starter";
var provide = ["mnemonStarterReady"];
async function apply(ctx) {
  await prepareStarterResolution(ctx);
  ctx.provide("mnemonStarterReady", true);
}
export {
  apply,
  name,
  provide
};
