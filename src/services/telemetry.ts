import axios from 'axios';
import { ILogPayload, IRecentLogsFilter, LogSeverity } from '../../types/common';

// Severity mapping conforming to OpenTelemetry specifications
const SEVERITY_NUMBERS: Record<LogSeverity, number> = {
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
};

interface OtlpAttribute {
  key: string;
  value: {
    stringValue?: string;
    boolValue?: boolean;
    intValue?: string;
    doubleValue?: number;
  };
}

interface OtlpLogRecord {
  timeUnixNano: string;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: OtlpAttribute[];
}

export class OtlpTelemetry {
  private endpoint: string;
  private headers: Record<string, string>;
  private serviceName: string;
  private environment: string;
  private version: string;

  private logQueue: OtlpLogRecord[] = [];
  private recentLogs: ILogPayload[] = []; // In-memory ring-buffer for live querying (up to 200 items)
  private maxBatchSize: number = 30;
  private flushIntervalMs: number = 3000;
  private isFlushing: boolean = false;
  private _warnedOnce: boolean = false;
  private timer?: NodeJS.Timeout;

  constructor() {
    this.endpoint = (process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || '').trim().replace(/\/$/, '');
    this.headers = this.parseHeaders(process.env['OTEL_EXPORTER_OTLP_HEADERS'] || '');
    this.serviceName = process.env['OTEL_SERVICE_NAME'] || 'masterchef-app';
    this.environment = process.env['NODE_ENV'] || 'production';
    this.version = process.env['npm_package_version'] || '1.0.0';

    if (this.endpoint) {
      console.log(`📡 OpenTelemetry OTLP Exporter active -> ${this.endpoint}`);
      this.timer = setInterval(() => void this.flush(), this.flushIntervalMs);
      if (this.timer.unref) this.timer.unref();
    } else {
      console.log('ℹ️ OpenTelemetry endpoint not set (OTEL_EXPORTER_OTLP_ENDPOINT). Logs will stream locally.');
    }
  }

  private parseHeaders(headerStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headerStr) return headers;
    headerStr.split(',').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx > -1) {
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key && value) headers[key] = value;
      }
    });
    return headers;
  }

  private formatOtlpAttribute(key: string, val: unknown): OtlpAttribute {
    if (typeof val === 'boolean') {
      return { key, value: { boolValue: val } };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        return { key, value: { intValue: String(val) } };
      }
      return { key, value: { doubleValue: val } };
    } else if (val && typeof val === 'object') {
      try {
        return { key, value: { stringValue: JSON.stringify(val) } };
      } catch {
        return { key, value: { stringValue: String(val) } };
      }
    } else {
      return { key, value: { stringValue: String(val ?? '') } };
    }
  }

  public emitLog(logEvent: ILogPayload): void {
    // 1. Store in local in-memory ring-buffer
    this.recentLogs.unshift(logEvent);
    if (this.recentLogs.length > 200) {
      this.recentLogs.pop();
    }

    // 2. Queue for OpenTelemetry OTLP export if endpoint is configured
    if (!this.endpoint) return;

    const timeUnixNano = String(Date.now() * 1000000);
    const attributes: OtlpAttribute[] = [];

    // Add standard action attribute
    if (logEvent.action) {
      attributes.push(this.formatOtlpAttribute('action', logEvent.action));
    }

    // Add all metadata keys as OTLP attributes
    for (const [key, value] of Object.entries(logEvent)) {
      if (['timestamp', 'severity', 'message'].includes(key)) continue;
      attributes.push(this.formatOtlpAttribute(key, value));
    }

    const severityNum = SEVERITY_NUMBERS[logEvent.severity] || 9;
    this.logQueue.push({
      timeUnixNano,
      severityNumber: severityNum,
      severityText: logEvent.severity || 'INFO',
      body: { stringValue: logEvent.message || '' },
      attributes,
    });

    if (this.logQueue.length >= this.maxBatchSize) {
      void this.flush();
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.logQueue.length === 0 || !this.endpoint) return;
    this.isFlushing = true;

    const batch = this.logQueue.splice(0, this.maxBatchSize);

    const payload = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              this.formatOtlpAttribute('service.name', this.serviceName),
              this.formatOtlpAttribute('service.version', this.version),
              this.formatOtlpAttribute('deployment.environment', this.environment),
            ],
          },
          scopeLogs: [
            {
              scope: { name: 'masterchef-telemetry', version: this.version },
              logRecords: batch,
            },
          ],
        },
      ],
    };

    try {
      const url = this.endpoint.endsWith('/v1/logs')
        ? this.endpoint
        : `${this.endpoint}/v1/logs`;

      await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        timeout: 5000,
      });
    } catch (err: unknown) {
      if (!this._warnedOnce) {
        const error = err as { response?: { status?: number; data?: unknown }; message?: string };
        const status = error.response ? error.response.status : 'ERR';
        const detail = error.response?.data ? JSON.stringify(error.response.data) : (error.message ?? 'Unknown error');
        console.warn(`⚠️ Failed to export OTLP logs to ${this.endpoint} [${status}]:`, detail);
        this._warnedOnce = true;
      }
    } finally {
      this.isFlushing = false;
    }
  }

  public getRecentLogs(filter: IRecentLogsFilter = {}): ILogPayload[] {
    let result = this.recentLogs;
    if (filter.severity) {
      const targetSeverity = filter.severity.toUpperCase();
      result = result.filter(l => l.severity === targetSeverity);
    }
    if (filter.action) {
      const targetAction = filter.action.toLowerCase();
      result = result.filter(l => l.action && l.action.toLowerCase().includes(targetAction));
    }
    if (filter.chatId) {
      const targetChatId = String(filter.chatId);
      result = result.filter(l => String(l.chatId) === targetChatId);
    }
    if (filter.limit) {
      result = result.slice(0, parseInt(String(filter.limit), 10) || 50);
    }
    return result;
  }
}

export const telemetry = new OtlpTelemetry();

export function emitLog(logEvent: ILogPayload): void {
  telemetry.emitLog(logEvent);
}

export function getRecentLogs(filter?: IRecentLogsFilter): ILogPayload[] {
  return telemetry.getRecentLogs(filter);
}
