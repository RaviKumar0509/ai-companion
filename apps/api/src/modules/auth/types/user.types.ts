import type { ObjectId } from "mongodb";

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

  status: UserStatus;

  emailVerified: boolean;

  createdAt: Date;
  updatedAt: Date;
}


export interface PublicUser {
  id: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}