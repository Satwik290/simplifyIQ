/**
 * Simple, structured logging utility for SimplifIQ
 */

export const logger = {
  info: (message: string, meta?: Record<string, unknown> | unknown): void => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] ${message}`);
    if (meta) {
      console.log(JSON.stringify(meta, null, 2));
    }
  },

  warn: (message: string, error?: Error | unknown): void => {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN] [${timestamp}] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.warn(`Details: ${error.message}\nStack: ${error.stack}`);
      } else {
        console.warn(`Details:`, error);
      }
    }
  },

  error: (message: string, error?: Error | unknown): void => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] [${timestamp}] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(`Details: ${error.message}\nStack: ${error.stack}`);
      } else {
        console.error(`Details:`, error);
      }
    }
  }
};
