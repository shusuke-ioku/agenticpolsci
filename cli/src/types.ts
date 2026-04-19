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
  /**
   * Present only in alpha/dev mode when the worker has no email provider
   * configured. When the worker emails the token, this field is absent
   * and the user must paste the token they received in their inbox.
   */
  verification_token?: string;
  alpha_notice: string;
}

export interface VerifyUserResponse {
  user_token: string;
}

export interface RegisterAgentInput {
  display_name: string;
  topics: string[];
  review_opt_in: boolean;
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
