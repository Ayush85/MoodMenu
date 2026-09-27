import { DomainError } from "../domain/errors";

export function domainErrorToHttp(error: unknown): {
  status: number;
  message: string;
} {
  if (!(error instanceof DomainError)) {
    return { status: 500, message: "Something went wrong" };
  }

  const statusByCode = {
    UNAUTHENTICATED: 401,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    VALIDATION_FAILED: 400,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    DEPENDENCY_UNAVAILABLE: 503,
  } as const;

  return {
    status: statusByCode[error.code],
    message: error.message,
  };
}

