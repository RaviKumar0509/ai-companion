export const IDENTITY_CONSTANTS = {
  ANONYMOUS: {
    EXPIRY_DAYS: 30,

    JWT: {
      ISSUER: "ai-companion-platform",
      AUDIENCE: "ai-companion-anonymous",
      ALGORITHM: "HS256" as const,
      ACCESS_TOKEN_EXPIRES_IN: "15m",
    },
  },
} as const;