import type { Request, Response } from "express";
import { safetyTextSchema } from "../schemas/safety.schemas.js";
import { assessSafety } from "../services/safety.service.js";

export function assessSafetyController(
  req: Request,
  res: Response,
): void {
  const input = safetyTextSchema.parse(req.body);

  const result = assessSafety(input.content);

  res.status(200).json({
    success: true,
    data: result,
  });
}