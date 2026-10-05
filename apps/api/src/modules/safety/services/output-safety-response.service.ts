import {
  OUTPUT_SAFETY_CATEGORY,
  type OutputSafetyCategory,
} from "../types/output-safety.types.js";

const OUTPUT_SAFETY_RESPONSES: Record<
  Exclude<OutputSafetyCategory, "none">,
  string
> = {
  self_harm:
    "I can't provide guidance that could encourage or help with harming yourself. " +
    "If you feel you may act on these thoughts or you are in immediate danger, " +
    "please contact emergency services or a trusted person who can stay with you.",

  medical_emergency:
    "I can't provide instructions that could put your health at further risk. " +
    "If you may be experiencing a medical emergency, please seek urgent medical attention " +
    "or contact emergency services.",

  harm_to_others:
    "I can't provide guidance for harming another person. " +
    "If you believe someone is in immediate danger, move to a safe place and contact emergency services.",

  unsafe_advice:
    "I can't provide instructions that could put your health, recovery, finances, " +
    "or safety at risk. I can help you explore safer recovery-support options instead.",
};

export function buildOutputSafetyResponse(
  category: OutputSafetyCategory,
): string {
  if (category === OUTPUT_SAFETY_CATEGORY.NONE) {
    return "";
  }

  return OUTPUT_SAFETY_RESPONSES[category];
}