
import { z } from "zod";

import {
  ESCALATION_STATUS,
} from "../../safety/types/escalation.types.js";

export const listEscalationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),

  status: z.enum([
    ESCALATION_STATUS.OPEN,
    ESCALATION_STATUS.ACKNOWLEDGED,
    ESCALATION_STATUS.ASSIGNED,
    ESCALATION_STATUS.IN_PROGRESS,
    ESCALATION_STATUS.RESOLVED,
    ESCALATION_STATUS.CLOSED,
  ]).optional(),
});

export type ListEscalationsQuery = z.infer<
  typeof listEscalationsQuerySchema
>;
