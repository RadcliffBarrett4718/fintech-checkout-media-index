import assert from "node:assert/strict";
import { decideAsset } from "../src/checkout_media_index.ts";

assert.equal(decideAsset({ width: 1600, height: 900, format: "jpeg" }), "approved");
assert.equal(decideAsset({ width: 900, height: 600, format: "png" }), "review");
console.log("checkout asset decision tests passed");
