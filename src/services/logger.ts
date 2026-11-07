import { emitLog } from './telemetry';
import { ILogPayload, LogSeverity } from '../../types/common';

function logEvent(
  severity: LogSeverity,
  action: string,
  message: string,
  metadata: Record<string, unknown> | Error = {}
): void {
  const timestamp = new Date().toISOString();
  let errorObj: Error | null = null;
  let meta: Record<string, unknown> = {};

  if (metadata instanceof Error) {
    errorObj = metadata;
    meta = { error: metadata };
  } else if (metadata && metadata['error'] instanceof Error) {
    errorObj = metadata['error'] as Error;
    meta = { ...metadata };
  } else if (metadata) {
    meta = { ...metadata };
  }

  const logPayload: ILogPayload = {
    timestamp,
    severity,
    action,
    message,
    ...meta,
  };

  if (errorObj) {
    logPayload.error = {
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
    };
  }

  // 1. Output to stdout
  if (process.env['NODE_ENV'] === 'development') {
    const icon = severity === 'ERROR' ? '🚨' : severity === 'WARN' ? '⚠️' : severity === 'DEBUG' ? '🐛' : '⚡';
    const metaStr = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
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
  } catch {
    // Non-blocking
  }
}

const logger = {
  info: (action: string, message: string, metadata?: Record<string, unknown> | Error): void =>
    logEvent('INFO', action, message, metadata),
  warn: (action: string, message: string, metadata?: Record<string, unknown> | Error): void =>
    logEvent('WARN', action, message, metadata),
  error: (action: string, message: string, metadata?: Record<string, unknown> | Error): void =>
    logEvent('ERROR', action, message, metadata),
  debug: (action: string, message: string, metadata?: Record<string, unknown> | Error): void =>
    logEvent('DEBUG', action, message, metadata),
  action: (action: string, details: { message?: string; [key: string]: unknown }): void =>
    logEvent('INFO', action, details.message || action, details),
  logEvent,
};

export = logger;
