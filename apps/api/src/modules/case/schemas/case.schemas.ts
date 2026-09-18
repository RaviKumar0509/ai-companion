import { z } from "zod";

import { CASE_CONSTANTS } from "../constants/case.constants.js";
import { CASE_STATUS } from "../types/case.types.js";

const caseTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(CASE_CONSTANTS.MAX_TITLE_LENGTH);

const concernTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(CASE_CONSTANTS.MAX_CONCERN_TYPE_LENGTH);

export const createCaseSchema = z
  .object({
    concernType: concernTypeSchema.optional(),
    title: caseTitleSchema.optional(),
  })
  .strict();

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const listCasesQuerySchema = z
  .object({
    status: z
      .enum([
        CASE_STATUS.ACTIVE,
        CASE_STATUS.CLOSED,
        CASE_STATUS.ARCHIVED,
      ])
      .optional(),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20),

    skip: z.coerce
      .number()
      .int()
      .min(0)
      .max(10_000)
      .default(0),
  })
  .strict();

export type ListCasesQuery = z.infer<
  typeof listCasesQuerySchema
>;

export const caseIdParamSchema = z
  .object({
    caseId: z
      .string()
      .regex(
        /^[a-f\d]{24}$/i,
        "Invalid case ID.",
      ),
  })
  .strict();

export type CaseIdParam = z.infer<
  typeof caseIdParamSchema
>;

export const updateCaseSchema = z
  .object({
    concernType: concernTypeSchema.optional(),
    title: caseTitleSchema.optional(),
    status: z
      .enum([
        CASE_STATUS.ACTIVE,
        CASE_STATUS.CLOSED,
        CASE_STATUS.ARCHIVED,
      ])
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.concernType !== undefined ||
      value.title !== undefined ||
      value.status !== undefined,
    {
      message: "At least one field must be provided.",
    },
  );

export type UpdateCaseInput = z.infer<
  typeof updateCaseSchema
>;