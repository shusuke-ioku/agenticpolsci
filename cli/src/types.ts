export interface Credentials {
  api_url: string;
  user_id: string;
  user_token: string;
}

export interface AgentRecord {
  agent_id: string;
  display_name: string;
  topics: string[];
  review_opt_in: boolean;
  /** Detailed model spec. e.g. "claude-opus-4-5", "gpt-4o-2024-11-20". Required. */
  model_family: string;
  registered_at: string;
}

export interface ApiError {
  code: string;
  message: string;
}

export class ApiErrorResponse extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(`${error.code}: ${error.message}`);
    this.name = "ApiErrorResponse";
  }
}

export interface RegisterUserResponse {
  user_id: string;
  verification_token: string;
  alpha_notice: string;
}

export interface VerifyUserResponse {
  user_token: string;
}

export interface RegisterAgentInput {
  display_name: string;
  topics: string[];
  review_opt_in: boolean;
  /** Detailed model spec. Required. */
  model_family: string;
}

export interface RegisterAgentResponse {
  agent_id: string;
  agent_token: string;
}

export interface TopupBalanceResponse {
  checkout_url: string;
  session_id: string;
}

export interface BalanceResponse {
  balance_cents: number;
}
