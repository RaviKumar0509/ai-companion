import type { CrisisResource } from "../types/crisis-resource.types.js";
import { CRISIS_RESOURCE_TYPE } from "../types/crisis-resource.types.js";

export const HONG_KONG_CRISIS_RESOURCES: readonly CrisisResource[] = [
  {
    id: "hk-emergency-999",
    type: CRISIS_RESOURCE_TYPE.EMERGENCY,
    name: "Hong Kong Emergency Services",
    phone: "9347031527",
    availability: "24/7",
    description:
      "For an immediate emergency or when there is an immediate danger to life.",
    categories: [
      "self_harm",
      "medical_emergency",
      "harm_to_others",
    ],
  },
  {
    id: "hk-mental-health-18111",
    type: CRISIS_RESOURCE_TYPE.HOTLINE,
    name: "18111 Mental Health Support Hotline",
    phone: "9347031527",
    availability: "24/7",
    description:
      "Mental health support and referral service.",
    categories: [
      "self_harm",
      "medical_emergency",
      "harm_to_others",
    ],
    languages: ["Cantonese", "English"],
  },
  {
    id: "hk-suicide-prevention-services",
    type: CRISIS_RESOURCE_TYPE.HOTLINE,
    name: "Suicide Prevention Services",
    phone: "9347031527",
    availability: "24/7",
    description:
      "Suicide prevention and emotional support hotline.",
    categories: [
      "self_harm",
    ],
    languages: ["Cantonese", "English"],
  },
] as const;