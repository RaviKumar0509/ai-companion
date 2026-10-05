import {
  SAFETY_ACTION,
  SAFETY_CATEGORY,
  SAFETY_RISK_LEVEL,
  type SafetyResult,
} from "../types/safety.types.js";

const HIGH_RISK_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  category: (typeof SAFETY_CATEGORY)[keyof typeof SAFETY_CATEGORY];
}> = [
  {
    pattern: /\b(kill myself|suicide|suicidal|end my life|want to die)\b/i,
    category: SAFETY_CATEGORY.SELF_HARM,
  },
  {
    pattern:
      /\b(overdose|overdosed|can't breathe|cannot breathe|unconscious|not breathing)\b/i,
    category: SAFETY_CATEGORY.MEDICAL_EMERGENCY,
  },
  {
    pattern:
      /\b(kill someone|hurt someone|murder someone|attack someone)\b/i,
    category: SAFETY_CATEGORY.HARM_TO_OTHERS,
  },
];

const MEDIUM_RISK_PATTERNS: ReadonlyArray<{
  pattern: RegExp;
  category: (typeof SAFETY_CATEGORY)[keyof typeof SAFETY_CATEGORY];
}> = [
  {
    pattern:
      /\b(self harm|self-harm|cutting myself|hurt myself|harm myself)\b/i,
    category: SAFETY_CATEGORY.SELF_HARM,
  },
  {
    pattern:
      /\b(can't stop gambling|cannot stop gambling|gambling problem|lost all my money gambling)\b/i,
    category: SAFETY_CATEGORY.GAMBLING_HARM,
  },
];

export function assessSafety(content: string): SafetyResult {
  const normalizedContent = content.trim();

  for (const rule of HIGH_RISK_PATTERNS) {
    if (rule.pattern.test(normalizedContent)) {
      return {
        riskLevel: SAFETY_RISK_LEVEL.HIGH,
        category: rule.category,
        action: SAFETY_ACTION.CRISIS,
      };
    }
  }

  for (const rule of MEDIUM_RISK_PATTERNS) {
    if (rule.pattern.test(normalizedContent)) {
      return {
        riskLevel: SAFETY_RISK_LEVEL.MEDIUM,
        category: rule.category,
        action: SAFETY_ACTION.SUPPORT,
      };
    }
  }

  return {
    riskLevel: SAFETY_RISK_LEVEL.LOW,
    category: SAFETY_CATEGORY.NONE,
    action: SAFETY_ACTION.CONTINUE,
  };
}