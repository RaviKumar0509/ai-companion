export const NOTIFICATION_INDEXES = [
  {
    key: { escalationId: 1 },
    name: "notifications_escalation_unique",
    unique: true,
  },
  {
    key: {
      "delivery.status": 1,
      "delivery.nextAttemptAt": 1,
      createdAt: 1,
    },
    name: "notifications_delivery_recovery",
    partialFilterExpression: {
      "delivery.status": "pending",
    },
  },
  {
    key: {
      "delivery.status": 1,
      "delivery.leaseUntil": 1,
    },
    name: "notifications_delivery_expired_leases",
    partialFilterExpression: {
      "delivery.status": "processing",
    },
  },
] as const;