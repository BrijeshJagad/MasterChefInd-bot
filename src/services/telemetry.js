const axios = require("axios");

// Severity mapping conforming to OpenTelemetry specifications
const SEVERITY_NUMBERS = {
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21
};

class OtlpTelemetry {
  constructor() {
    this.endpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "").trim().replace(/\/$/, "");
    this.headers = this.parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS || "");
    this.serviceName = process.env.OTEL_SERVICE_NAME || "masterchef-app";
    this.environment = process.env.NODE_ENV || "production";
    this.version = process.env.npm_package_version || "1.0.0";

    this.logQueue = [];
    this.recentLogs = []; // In-memory ring-buffer for live querying (up to 200 items)
    this.maxBatchSize = 30;
    this.flushIntervalMs = 3000;
    this.isFlushing = false;

    if (this.endpoint) {
      console.log(`📡 OpenTelemetry OTLP Exporter active -> ${this.endpoint}`);
      this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
      if (this.timer.unref) this.timer.unref();
    } else {
      console.log("ℹ️ OpenTelemetry endpoint not set (OTEL_EXPORTER_OTLP_ENDPOINT). Logs will stream locally.");
    }
  }

  parseHeaders(headerStr) {
    const headers = {};
    if (!headerStr) return headers;
    headerStr.split(",").forEach(pair => {
      const idx = pair.indexOf("=");
      if (idx > -1) {
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key && value) headers[key] = value;
      }
    });
    return headers;
  }

  formatOtlpAttribute(key, val) {
    if (typeof val === "boolean") {
      return { key, value: { boolValue: val } };
    } else if (typeof val === "number") {
      if (Number.isInteger(val)) {
        return { key, value: { intValue: String(val) } };
      }
      return { key, value: { doubleValue: val } };
    } else if (val && typeof val === "object") {
      try {
        return { key, value: { stringValue: JSON.stringify(val) } };
      } catch {
        return { key, value: { stringValue: String(val) } };
      }
    } else {
      return { key, value: { stringValue: String(val ?? "") } };
    }
  }

  emitLog(logEvent) {
    // 1. Store in local in-memory ring-buffer
    this.recentLogs.unshift(logEvent);
    if (this.recentLogs.length > 200) {
      this.recentLogs.pop();
    }

    // 2. Queue for OpenTelemetry OTLP export if endpoint is configured
    if (!this.endpoint) return;

    const timeUnixNano = String(Date.now() * 1000000);
    const attributes = [];

    // Add standard action attribute
    if (logEvent.action) {
      attributes.push(this.formatOtlpAttribute("action", logEvent.action));
    }

    // Add all metadata keys as OTLP attributes
    for (const [key, value] of Object.entries(logEvent)) {
      if (["timestamp", "severity", "message"].includes(key)) continue;
      attributes.push(this.formatOtlpAttribute(key, value));
    }

    this.logQueue.push({
      timeUnixNano,
      severityNumber: SEVERITY_NUMBERS[logEvent.severity] || 9,
      severityText: logEvent.severity || "INFO",
      body: { stringValue: logEvent.message || "" },
      attributes
    });

    if (this.logQueue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.isFlushing || this.logQueue.length === 0 || !this.endpoint) return;
    this.isFlushing = true;

    const batch = this.logQueue.splice(0, this.maxBatchSize);

    const payload = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              this.formatOtlpAttribute("service.name", this.serviceName),
              this.formatOtlpAttribute("service.version", this.version),
              this.formatOtlpAttribute("deployment.environment", this.environment)
            ]
          },
          scopeLogs: [
            {
              scope: { name: "masterchef-telemetry", version: this.version },
              logRecords: batch
            }
          ]
        }
      ]
    };

    try {
      const url = this.endpoint.endsWith("/v1/logs")
        ? this.endpoint
        : `${this.endpoint}/v1/logs`;

      await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          ...this.headers
        },
        timeout: 5000
      });
    } catch (err) {
      // Don't crash on network or collector hiccups; log warning once
      if (!this._warnedOnce) {
        console.warn(`⚠️ Failed to export OTLP logs to ${this.endpoint}:`, err.message);
        this._warnedOnce = true;
      }
    } finally {
      this.isFlushing = false;
    }
  }

  getRecentLogs(filter = {}) {
    let result = this.recentLogs;
    if (filter.severity) {
      result = result.filter(l => l.severity === filter.severity.toUpperCase());
    }
    if (filter.action) {
      result = result.filter(l => l.action && l.action.toLowerCase().includes(filter.action.toLowerCase()));
    }
    if (filter.chatId) {
      result = result.filter(l => String(l.chatId) === String(filter.chatId));
    }
    if (filter.limit) {
      result = result.slice(0, parseInt(filter.limit, 10) || 50);
    }
    return result;
  }
}

const telemetry = new OtlpTelemetry();

module.exports = {
  telemetry,
  emitLog: (logEvent) => telemetry.emitLog(logEvent),
  getRecentLogs: (filter) => telemetry.getRecentLogs(filter)
};
