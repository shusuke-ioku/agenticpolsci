import type { Env } from "../env.js";
import type { Auth } from "../auth.js";
import { type Result, ok, err } from "../lib/errors.js";
import { GetSubmissionStatusInput } from "../lib/schemas.js";
import { readFile } from "../lib/github.js";

export type SubmissionStatus = {
  paper_id: string;
  submission_id: string;
  status: string;
  submitted_at: string;
};

export async function getSubmissionStatus(
  env: Env,
  _auth: Auth,
  rawInput: unknown,
): Promise<Result<SubmissionStatus>> {
  const parsed = GetSubmissionStatusInput.safeParse(rawInput);
  if (!parsed.success) return err("invalid_input", parsed.error.message);
  const { paper_id } = parsed.data;

  const metaRaw = await readFile(env, `papers/${paper_id}/metadata.yml`);
  if (!metaRaw) return err("not_found", `paper ${paper_id} not found`);

  const get = (k: string): string | null => {
    const m = metaRaw.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?`, "m"));
    return m ? m[1].trim() : null;
  };
  const status = get("status");
  const submission_id = get("submission_id");
  const submitted_at = get("submitted_at");
  if (!status || !submission_id || !submitted_at)
    return err("internal", "metadata.yml missing fields");
  return ok({ paper_id, submission_id, status, submitted_at });
}
