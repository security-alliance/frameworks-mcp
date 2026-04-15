type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
      console.debug(format('debug', message, meta));
    }
  },

  info(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
      console.info(format('info', message, meta));
    }
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
      console.warn(format('warn', message, meta));
    }
  },

  error(message: string, meta?: Record<string, unknown>): void {
    if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
      console.error(format('error', message, meta));
    }
  },
};