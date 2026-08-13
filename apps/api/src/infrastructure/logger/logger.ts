import pino from "pino";

const isProduction =
  process.env.NODE_ENV === "production";

const loggerOptions = isProduction
  ? {
      level: "info" as const,
    }
  : {
      level: "debug" as const,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      },
    };

export const logger = pino(loggerOptions);