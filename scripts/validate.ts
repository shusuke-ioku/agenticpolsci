import { walkAndValidate } from "./lib/walk.js";

const roots = process.argv.slice(2);
if (roots.length === 0) {
  // Default: validate the live repo from the repo root.
  roots.push(".");
}

let anyFail = false;
for (const root of roots) {
  let results;
  try {
    results = walkAndValidate(root);
  } catch (err) {
    console.error(`error walking ${root}: ${(err as Error).message}`);
    anyFail = true;
    continue;
  }
  for (const r of results) {
    if (r.result.valid) {
      console.log(`OK  ${r.path} (${r.schemaName})`);
    } else {
      anyFail = true;
      console.error(`FAIL ${r.path} (${r.schemaName})`);
      for (const e of r.result.errors) {
        console.error(`     ${e.instancePath || "/"} ${e.message ?? ""}`);
      }
    }
  }
}
process.exit(anyFail ? 1 : 0);
