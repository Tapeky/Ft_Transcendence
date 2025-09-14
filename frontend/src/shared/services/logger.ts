// Centralized logging service for Ft_Transcendence frontend

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private constructor() {
    // Set log level based on environment
    const env = import.meta.env.NODE_ENV;
    this.logLevel = env === 'development' ? LogLevel.DEBUG : LogLevel.WARN;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data
    };

    // Add to internal log store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output for development
    if (import.meta.env.NODE_ENV === 'development') {
      const prefix = context ? `[${context}]` : '';
      const levelStr = LogLevel[level];
      const timeStr = entry.timestamp.toISOString().split('T')[1].split('.')[0];

      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`${timeStr} DEBUG ${prefix}`, message, data || '');
          break;
        case LogLevel.INFO:
          console.info(`${timeStr} INFO ${prefix}`, message, data || '');
          break;
        case LogLevel.WARN:
          console.warn(`${timeStr} WARN ${prefix}`, message, data || '');
          break;
        case LogLevel.ERROR:
          console.error(`${timeStr} ERROR ${prefix}`, message, data || '');
          break;
      }
    }
  }

  public debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  public info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  public warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  public error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  // Helper methods for common patterns
  public api(message: string, data?: any): void {
    this.info(message, 'API', data);
  }

  public websocket(message: string, data?: any): void {
    this.debug(message, 'WebSocket', data);
  }

  public game(message: string, data?: any): void {
    this.debug(message, 'Game', data);
  }

  public auth(message: string, data?: any): void {
    this.info(message, 'Auth', data);
  }

  public router(message: string, data?: any): void {
    this.debug(message, 'Router', data);
  }
}

export const logger = Logger.getInstance();
export default logger;