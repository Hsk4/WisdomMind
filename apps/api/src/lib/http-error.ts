/**
 * An error with an HTTP status. Controllers throw these; the central handler
 * turns them into `{ ok: false, error }`. Plain `Error`s are classified the
 * same way the old `toState` did (validation, Postgres, unauthorized, else 500).
 */
export class HttpError extends Error {
  readonly status: number;
  /**
   * A short machine-readable reason, for errors the client must branch on
   * rather than just display (`DEVICE_LOCKED` on sign-in).
   */
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

/*
 * Messages are read by people, not by the client: the web shows them as-is.
 * They never say "Unauthorized:" — that is a status, not a sentence.
 */
export const unauthorized = (message = "Please sign in again.") =>
  new HttpError(401, message);

export const forbidden = (message = "You do not have access to this page.") =>
  new HttpError(403, message);

/** Still authenticated, but the account is not usable yet (status/onboarding). */
export const notReady = (message: string) => new HttpError(403, message);

export const notFound = (message = "Not found") => new HttpError(404, message);

export const badRequest = (message: string) => new HttpError(400, message);

export const conflict = (message: string) => new HttpError(409, message);
