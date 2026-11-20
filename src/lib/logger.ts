const SENSITIVE_KEY_PATTERN =
  /(password|token|authorization|cookie|secret|signature|key)/i;

function sanitizeMeta(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeMeta);
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY_PATTERN.test(k) ? "[REDACTED]" : sanitizeMeta(v);
  }
  return out;
}

type LogLevel = "info" | "warn" | "error";

function emit(
  level: LogLevel,
  context: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    context,
    message,
    ...(meta ? (sanitizeMeta(meta) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) =>
    emit("info", context, message, meta),
  warn: (context: string, message: string, meta?: Record<string, unknown>) =>
    emit("warn", context, message, meta),
  error: (context: string, message: string, meta?: Record<string, unknown>) =>
    emit("error", context, message, meta),
};
