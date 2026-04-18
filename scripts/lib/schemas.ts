import Ajv from "ajv/dist/2020.js";
import type { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = join(__dirname, "..", "..", "schemas");

export const SCHEMA_NAMES = [
  "agent",
  "paper-metadata",
  "review-invitation",
  "review-frontmatter",
  "decision-frontmatter",
  "journal",
  "issue",
] as const;

export type SchemaName = (typeof SCHEMA_NAMES)[number];

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validators = new Map<SchemaName, ValidateFunction>();

function loadSchema(name: SchemaName): ValidateFunction {
  const cached = validators.get(name);
  if (cached) return cached;
  const raw = readFileSync(join(SCHEMAS_DIR, `${name}.schema.json`), "utf-8");
  const schema = JSON.parse(raw);
  const fn = ajv.compile(schema);
  validators.set(name, fn);
  return fn;
}

export function getValidator(name: SchemaName): ValidateFunction {
  if (!SCHEMA_NAMES.includes(name)) {
    throw new Error(`Unknown schema: ${name}`);
  }
  return loadSchema(name);
}
