/** Request/response DTOs for the Secryn API — mirrored from @repo/shared. */

// Auth

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  email: string;
  password: string;
  username?: string;
}

export interface LoginMFAResponse {
  mfaRequired: true;
  mfaToken: string;
}

export interface MFAConfirmBody {
  token: string;
  mfaToken: string;
}

export interface MFARecoveryBody {
  code: string;
  mfaToken: string;
}

export interface MFASetupResponse {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export interface MFAEnableBody {
  token: string;
}

export interface MFAStatusResponse {
  enabled: boolean;
}

export interface MFARecoveryCodesResponse {
  codes: string[];
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token: string;
  password: string;
}

// User

export interface UpdateUserInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Project

export interface CreateProjectInput {
  name: string;
  description?: string;
}

// Secret

export interface CreateSecretInput {
  name: string;
  value: string;
  notes: string;
}

export interface UpdateSecretInput {
  name?: string;
  value?: string;
  notes?: string;
}

// API Key

export type ApiKeyPermission = "read" | "write";

export interface CreateApiKeyInput {
  name: string;
  permissions: ApiKeyPermission[];
}

export interface UpdateApiKeyInput {
  name?: string;
  isActive?: boolean;
  addPermissions?: ApiKeyPermission[];
  removePermissions?: ApiKeyPermission[];
}
