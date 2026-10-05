export const OUTPUT_SAFETY_ACTION = {
  ALLOW: "allow",
  REPLACE: "replace",
  BLOCK: "block",
} as const;

export type OutputSafetyAction =
  (typeof OUTPUT_SAFETY_ACTION)[keyof typeof OUTPUT_SAFETY_ACTION];

export const OUTPUT_SAFETY_CATEGORY = {
  NONE: "none",
  SELF_HARM: "self_harm",
  MEDICAL_EMERGENCY: "medical_emergency",
  HARM_TO_OTHERS: "harm_to_others",
  UNSAFE_ADVICE: "unsafe_advice",
} as const;

export type OutputSafetyCategory =
  (typeof OUTPUT_SAFETY_CATEGORY)[keyof typeof OUTPUT_SAFETY_CATEGORY];

export interface OutputSafetyResult {
  action: OutputSafetyAction;
  category: OutputSafetyCategory;
}