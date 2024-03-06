class ApiError extends Error {
  constructor(
    statusCode,
    msg = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(msg);
    this.statusCode = statusCode;
    this.data = null;
    this.message = msg;
    this.success = false;
    this.errors = errors;

    // for prod
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
export {ApiError}
