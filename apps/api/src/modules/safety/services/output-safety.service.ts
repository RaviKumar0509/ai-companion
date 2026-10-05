import {
  OUTPUT_SAFETY_ACTION,
  OUTPUT_SAFETY_CATEGORY,
  type OutputSafetyResult,
} from "../types/output-safety.types.js";

const HIGH_RISK_OUTPUT_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  category:
    | typeof OUTPUT_SAFETY_CATEGORY.SELF_HARM
    | typeof OUTPUT_SAFETY_CATEGORY.MEDICAL_EMERGENCY
    | typeof OUTPUT_SAFETY_CATEGORY.HARM_TO_OTHERS;
}> = [
  {
    pattern:
      /\b(you should kill yourself|you should die|go kill yourself|suicide is the answer)\b/i,
    category: OUTPUT_SAFETY_CATEGORY.SELF_HARM,
  },
  {
    pattern:
      /\b(ignore (the )?emergency|don't seek medical help|do not seek medical help|you don't need a doctor)\b/i,
    category: OUTPUT_SAFETY_CATEGORY.MEDICAL_EMERGENCY,
  },
  {
    pattern:
      /\b(you should kill (him|her|them)|go kill (him|her|them)|how to murder)\b/i,
    category: OUTPUT_SAFETY_CATEGORY.HARM_TO_OTHERS,
  },
];

const UNSAFE_ADVICE_PATTERNS: ReadonlyArray<RegExp> = [
  /\b(take a dangerous dose|take an overdose|overdose on)\b/i,
  /\b(stop your prescribed medication|double your medication dose|triple your medication dose)\b/i,
  /\b(use drugs to cope|use gambling to recover your losses)\b/i,
];

export function assessOutputSafety(content: string): OutputSafetyResult {
  const normalizedContent = content.trim();

  for (const rule of HIGH_RISK_OUTPUT_PATTERNS) {
    if (rule.pattern.test(normalizedContent)) {
      return {
        action: OUTPUT_SAFETY_ACTION.BLOCK,
        category: rule.category,
      };
    }
  }

  for (const pattern of UNSAFE_ADVICE_PATTERNS) {
    if (pattern.test(normalizedContent)) {
      return {
        action: OUTPUT_SAFETY_ACTION.REPLACE,
        category: OUTPUT_SAFETY_CATEGORY.UNSAFE_ADVICE,
      };
    }
  }

  return {
    action: OUTPUT_SAFETY_ACTION.ALLOW,
    category: OUTPUT_SAFETY_CATEGORY.NONE,
  };
}