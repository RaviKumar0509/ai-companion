export const AUTH_CONSTANTS = {
  JWT: {
    ISSUER: "ai-companion-platform",
    AUDIENCE: "ai-companion-api",
    ALGORITHM: "HS256" as const,
    ACCESS_TOKEN_EXPIRES_IN: "15m",
    REFRESH_TOKEN_EXPIRES_IN_DAYS: 30,
  },
  EMAIL_VERIFICATION: {
  TOKEN_BYTES: 32,
  EXPIRES_IN_MINUTES: 30,
},

  REFRESH_TOKEN_BYTES: 64,

  PASSWORD_RESET: {
    TOKEN_BYTES: 32,
    EXPIRES_IN_MINUTES: 15,
  },

  INVALID_CREDENTIALS_MESSAGE:
    "Invalid email or password.",
} as const;