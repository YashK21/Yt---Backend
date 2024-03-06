class ApiError extends Error {
  constructor(
    statusCode,
    msg = "Something went wrong",
    errors = [],
    stactk = ""
  ) {
    super(msg);
    this.statusCode = statusCode;
    this.data = null;
    this.message = msg;
    this.success = false;
    this.errors = errors;

    // for prod
    if (stactk) {
      this.stack = stactk;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export {ApiError}
