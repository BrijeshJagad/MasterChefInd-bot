const { emitLog } = require("./telemetry");

function logEvent(severity, action, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  let errorObj = null;

  if (metadata instanceof Error) {
    errorObj = metadata;
    metadata = { error: metadata };
  } else if (metadata && metadata.error instanceof Error) {
    errorObj = metadata.error;
  }

  const logPayload = {
    timestamp,
    severity,
    action,
    message,
    ...metadata
  };

  if (errorObj) {
    logPayload.error = {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack
    };
  }

  // 1. Output to stdout
  if (process.env.NODE_ENV === "development") {
    const icon = severity === "ERROR" ? "🚨" : severity === "WARN" ? "⚠️" : severity === "DEBUG" ? "🐛" : "⚡";
    const metaStr = Object.keys(metadata).length > 0 ? " " + JSON.stringify(metadata) : "";
    console.log(`${icon} [${severity}] [${action}] ${message}${metaStr}`);
    if (errorObj && errorObj.stack) {
      console.error(errorObj.stack);
    }
  } else {
    // Production structured JSON for Render / Docker stdout
    console.log(JSON.stringify(logPayload));
  }

  // 2. Dispatch to OpenTelemetry OTLP Exporter & In-memory ring-buffer
  try {
    emitLog(logPayload);
  } catch (err) {
    // Non-blocking
  }
}

const logger = {
  info: (action, message, metadata) => logEvent("INFO", action, message, metadata),
  warn: (action, message, metadata) => logEvent("WARN", action, message, metadata),
  error: (action, message, metadata) => logEvent("ERROR", action, message, metadata),
  debug: (action, message, metadata) => logEvent("DEBUG", action, message, metadata),
  action: (action, details) => logEvent("INFO", action, details.message || action, details)
};

module.exports = logger;
