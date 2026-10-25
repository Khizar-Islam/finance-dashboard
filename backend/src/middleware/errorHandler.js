// Final handlers for the API. Every error reply is { error: "<message>" };
// details of 5xx errors stay in the server log.

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

// body-parser errors carry statusCode and type; reply with fixed messages.
const BODY_PARSER_MESSAGES = {
  "entity.parse.failed": "Invalid JSON body",
  "entity.too.large": "Request body is too large",
};

// Unknown /api routes.
function apiNotFound(req, res) {
  res.status(404).json({ error: "Not found" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Only statusCode is trusted: Google/Prisma SDK errors carry their own "status".
  const code = err?.statusCode;
  const statusCode = Number.isInteger(code) && code >= 400 && code < 600 ? code : 500;

  if (statusCode >= 500) {
    console.error(err);
    return res.status(statusCode).json({ error: GENERIC_MESSAGE });
  }

  const message = BODY_PARSER_MESSAGES[err.type] || err.message || "Bad request";
  res.status(statusCode).json({ error: message });
}

module.exports = { apiNotFound, errorHandler };
