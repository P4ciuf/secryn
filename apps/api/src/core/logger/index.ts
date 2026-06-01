import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Ensure the logs directory exists at import time — required before any transport writes
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const COLOURS: Record<string, string> = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[36m",
  debug: "\x1b[35m",
  reset: "\x1b[0m",
};

const timestamp = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

// Console uses ANSI colour codes per level; file output omits colours for grep-friendly archival
const colouredConsole = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const colour = COLOURS[level as string] ?? "";
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${colour}[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${COLOURS.reset}`;
});

const plainFile = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
});

const isDevelopment = process.env.NODE_ENV === "development";

const rotateOptions = {
  datePattern: "YYYY-MM-DD",
  maxFiles: "7d",
  zippedArchive: false,
  format: winston.format.combine(timestamp, winston.format.errors({ stack: true }), plainFile),
};

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: isDevelopment ? "debug" : "info",
    format: winston.format.combine(
      timestamp,
      winston.format.errors({ stack: true }),
      colouredConsole,
    ),
  }),
  new DailyRotateFile({
    ...rotateOptions,
    level: isDevelopment ? "debug" : "info",
    filename: path.join(logsDir, "logs-data-%DATE%.log"),
  }),
];

// Logger errors must never crash the process — logging is non-critical infrastructure
const log = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  transports,
  exitOnError: false,
});

/**
 * Thin wrapper around a Winston logger instance.
 *
 * Exposes `error`, `warn`, `info`, and `debug` methods. The `debug` level is
 * automatically suppressed in non-development environments to avoid verbosity.
 * The underlying logger is configured with `exitOnError: false` so that logging
 * failures never crash the process.
 */
export const logger = {
  /**
   * Logs a message at the "error" severity level.
   * Always emitted regardless of NODE_ENV.
   */
  error(message: string, meta?: unknown): void {
    log.error(message, meta);
  },

  warn(message: string, meta?: unknown): void {
    log.warn(message, meta);
  },

  info(message: string, meta?: unknown): void {
    log.info(message, meta);
  },

  /**
   * Logs a message at the "debug" severity level.
   * Suppressed in production — debug logs are too verbose for non-development environments.
   */
  debug(message: string, meta?: unknown): void {
    if (isDevelopment) {
      log.debug(message, meta);
    }
  },
};
