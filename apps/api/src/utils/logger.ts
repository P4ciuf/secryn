import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Ensure the logs directory exists before any transport writes to it
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ANSI escape codes for coloured log output on the terminal
const COLOURS: Record<string, string> = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[36m",
  debug: "\x1b[35m",
  reset: "\x1b[0m",
};

const timestamp = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

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
    level: "error",
    filename: path.join(logsDir, "error-%DATE%.log"),
  }),
  new DailyRotateFile({
    ...rotateOptions,
    level: "warn",
    // Filter to log only warn-level entries; DailyRotateFile with level "warn" would also capture errors
    format: winston.format.combine(
      winston.format((info) => (info.level === "warn" ? info : false))(),
      timestamp,
      winston.format.errors({ stack: true }),
      plainFile,
    ),
  }),
];

const log = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  transports,
  exitOnError: false,
});

/**
 * Key-value pairs attached to a log entry.
 * Passed as the second argument to any logger method.
 */
export type LogMeta = Record<string, unknown>;

/**
 * Application-wide logger with level-specific methods.
 * Skips the winston call in production for debug to avoid unnecessary overhead.
 */
export const logger = {
  error(message: string, meta?: LogMeta): void {
    log.error(message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    log.warn(message, meta);
  },
  info(message: string, meta?: LogMeta): void {
    log.info(message, meta);
  },
  debug(message: string, meta?: LogMeta): void {
    // Avoid the winston call entirely in production to skip the level-filtering overhead
    if (isDevelopment) {
      log.debug(message, meta);
    }
  },
};
