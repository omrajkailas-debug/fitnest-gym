class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parseId(value, label) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, `${label} must be a positive integer.`);
  }
  return Number(value);
}

function requireObjectBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return body;
}

module.exports = { HttpError, asyncHandler, parseId, requireObjectBody };
