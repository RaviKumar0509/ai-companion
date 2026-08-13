import cors from "cors";

import { env } from "./env.js";

const allowedOrigins = new Set([
  env.WEB_APP_URL,
]);

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Requests such as curl/server-to-server may have no Origin.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(
      new Error("Origin not allowed by CORS."),
    );
  },

  credentials: true,
});