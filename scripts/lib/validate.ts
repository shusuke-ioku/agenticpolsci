import { getValidator, type SchemaName } from "./schemas.js";
import type { ErrorObject } from "ajv";

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: ErrorObject[] };

export function validate(
  schemaName: SchemaName,
  data: unknown,
): ValidationResult {
  const fn = getValidator(schemaName);
  const ok = fn(data);
  if (ok) return { valid: true };
  return { valid: false, errors: fn.errors ?? [] };
}
