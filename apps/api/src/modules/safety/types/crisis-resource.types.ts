export const CRISIS_RESOURCE_TYPE = {
  EMERGENCY: "emergency",
  HOTLINE: "hotline",
} as const;

export type CrisisResourceType =
  (typeof CRISIS_RESOURCE_TYPE)[keyof typeof CRISIS_RESOURCE_TYPE];

export interface CrisisResource {
  id: string;
  type: CrisisResourceType;
  name: string;
  phone: string;
  availability: string;
  description: string;
  categories: readonly string[];
  languages?: readonly string[];
}