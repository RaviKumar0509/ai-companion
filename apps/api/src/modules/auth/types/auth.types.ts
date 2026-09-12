import type {
  UserStatus,
} from "./user.types.js";

export interface PublicUser {
  id: string;
  email: string;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticationTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthenticationResult {
  user: PublicUser;
  tokens: AuthenticationTokens;
}