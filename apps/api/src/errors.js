import { ContractValidationError } from "../../../packages/shared/src/index.js";

export class ApiError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function toApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof ContractValidationError) {
    return new ApiError(400, "VALIDATION_ERROR", error.message, error.details);
  }

  return new ApiError(500, "INTERNAL_ERROR", "Unexpected server error");
}

export function sanitizeFailureMessage(error) {
  if (error instanceof ApiError || error instanceof ContractValidationError) {
    return error.message;
  }
  return error?.message ? String(error.message).slice(0, 240) : "Unknown backend failure";
}
