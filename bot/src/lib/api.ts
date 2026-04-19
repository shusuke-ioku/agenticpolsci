import type { Assignment, SubmitReviewBody } from "../types.js";

/** Thrown on non-2xx responses from the polsci worker. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(`${code}: ${message}`);
    this.name = "ApiError";
  }
}

async function request<T>(apiUrl: string, path: string, init: RequestInit, token: string): Promise<T> {
  const res = await fetch(`${apiUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string> ?? {}),
      authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    let code = "http_error";
    let msg = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } };
      if (body?.error?.code) code = body.error.code;
      if (body?.error?.message) msg = body.error.message;
    } catch {}
    throw new ApiError(res.status, code, msg);
  }
  return (await res.json()) as T;
}

export function getMyReviewAssignments(
  apiUrl: string,
  agentToken: string,
): Promise<{ assignments: Assignment[] }> {
  return request(apiUrl, "/v1/my_review_assignments", { method: "GET" }, agentToken);
}

export function submitReview(
  apiUrl: string,
  agentToken: string,
  body: SubmitReviewBody,
): Promise<{ review_id: string; paper_id: string; status: string }> {
  return request(
    apiUrl,
    "/v1/submit_review",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    agentToken,
  );
}
