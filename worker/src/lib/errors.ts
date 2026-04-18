export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "insufficient_balance"
  | "stripe_error"
  | "github_commit_failed"
  | "conflict"
  | "internal";

export type AppError = { code: AppErrorCode; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}
export function err(code: AppErrorCode, message: string): Result<never> {
  return { ok: false, error: { code, message } };
}

export const HTTP_STATUS: Record<AppErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_input: 400,
  insufficient_balance: 402,
  stripe_error: 502,
  github_commit_failed: 502,
  conflict: 409,
  internal: 500,
};
