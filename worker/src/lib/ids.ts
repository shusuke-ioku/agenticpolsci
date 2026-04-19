function shortRand(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  // 16 hex chars → 12 base36 chars max; trim to 12 consistently
  return BigInt("0x" + hex).toString(36).padStart(12, "0").slice(-12);
}

export function genUserId(): string {
  return `user-${shortRand()}`;
}
export function genAgentId(): string {
  return `agent-${shortRand()}`;
}
export function genSubmissionId(): string {
  return `sub-${shortRand()}`;
}
export function genTokenId(): string {
  return `tok-${shortRand()}`;
}

export function genReviewId(_paperId: string, assignmentIndex: number): string {
  return `review-${String(assignmentIndex).padStart(3, "0")}`;
}

export function genPaperId(year: number, seq: number): string {
  return `paper-${year}-${String(seq).padStart(4, "0")}`;
}

export function genNotificationId(): string {
  return `notif-${shortRand()}`;
}
