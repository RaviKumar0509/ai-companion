
import type { ObjectId } from "mongodb";

export const USER_ROLE = {
  USER: "user",
  CLINICIAN: "clinician",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole =
  (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  DELETED: "deleted",
} as const;

export type UserStatus =
  (typeof USER_STATUS)[keyof typeof USER_STATUS];

export interface UserDocument {
  _id?: ObjectId;

  email: string;
  passwordHash: string;

  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}
