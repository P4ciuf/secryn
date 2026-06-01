import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

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

// Console uses ANSI color codes per level; file output omits colours for grep-friendly archival
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

export type LogMeta = Record<string, unknown>;

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
    // Suppress debug logs outside development — they are too verbose for production
    if (isDevelopment) {
      log.debug(message, meta);
    }
  },
};
