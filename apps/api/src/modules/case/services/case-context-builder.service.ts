import type { CaseContextDocument } from "../types/case-context.types.js";

export interface AIContextSection {
  role: "system";
  content: string;
}

function formatList(
  label: string,
  values: readonly string[] | undefined,
): string | null {
  if (!values || values.length === 0) {
    return null;
  }

  return `${label}:\n${values.map((value) => `- ${value}`).join("\n")}`;
}

export function buildCaseContextForAI(
  context: CaseContextDocument | null,
): AIContextSection | null {
  if (!context || context.status === "empty") {
    return null;
  }

  const sections: string[] = [];

  if (context.summary?.trim()) {
    sections.push(`Case summary:\n${context.summary.trim()}`);
  }

  const recoveryGoals = formatList(
    "Recovery goals",
    context.recoveryGoals,
  );

  if (recoveryGoals) {
    sections.push(recoveryGoals);
  }

  const knownTriggers = formatList(
    "Known triggers",
    context.knownTriggers,
  );

  if (knownTriggers) {
    sections.push(knownTriggers);
  }

  const copingStrategies = formatList(
    "Coping strategies",
    context.copingStrategies,
  );

  if (copingStrategies) {
    sections.push(copingStrategies);
  }

  const supportPreferences = formatList(
    "Support preferences",
    context.supportPreferences,
  );

  if (supportPreferences) {
    sections.push(supportPreferences);
  }

  const riskNotes = formatList(
    "Relevant safety context",
    context.riskNotes,
  );

  if (riskNotes) {
    sections.push(riskNotes);
  }

  if (sections.length === 0) {
    return null;
  }

  return {
    role: "system",
    content:
      "The following is structured context from the user's recovery case. " +
      "Use it only as background context for the current conversation. " +
      "Do not treat it as a diagnosis or as a substitute for the user's current statements.\n\n" +
      sections.join("\n\n"),
  };
}