import type { Prisma, User } from "@prisma/client";
import {
  apiKeyRepository,
  type ApiKeyRepository,
  type ApiKeyWithPermissions,
} from "../repositories/apiKey";
import { UserService } from "./user";
import { randomBytes } from "node:crypto";
import { CryptoUtils } from "../utils/crypto";
import type { ApiKey, ApiKeyPermission, CreateApiKeyInput } from "@repo/shared";
import { ApiError } from "../errors/apiError";

/**
 * Business-logic layer for API key lifecycle management.
 *
 * Each instance is scoped to a single authenticated user. All
 * operations verify that the caller owns the key before reading or
 * mutating it. Key material is encrypted via {@link CryptoUtils} before
 * it touches the database and is decrypted only when returned to the
 * owner.
 *
 * Use the static {@link Instance} factory for user-scoped operations
 * and {@link SystemInstance} when the identity is derived from the
 * API key itself (e.g. during request authentication).
 */
export class ApiKeyService {
  private readonly repository: ApiKeyRepository = apiKeyRepository;
  private readonly user: User;

  private constructor(user: User) {
    this.user = user;
  }

  /**
   * Creates a service scoped to the given user. Resolves and validates
   * the user record, throwing if the user does not exist.
   *
   * @param userId - The authenticated user's ID
   * @returns An {@link ApiKeyService} bound to the resolved user
   * @throws {ApiError} ResourceNotFound when the user does not exist
   */
  static async Instance(userId: string): Promise<ApiKeyService> {
    const userService = await UserService.Instance(userId);
    const user = await userService.getUserOrThrow({ id: userId });
    return new ApiKeyService(user);
  }

  /**
   * Creates a service instance by resolving the owner of a given
   * encrypted API key. Used during request authentication when the
   * caller presents a raw API key rather than a user JWT.
   *
   * @param cryptedKey - The encrypted key string (as stored in the database)
   * @returns An {@link ApiKeyService} scoped to the key's owner
   * @throws {ApiError} Unauthorized when the key does not exist
   */
  static async SystemInstance(cryptedKey: string): Promise<ApiKeyService> {
    const apiKey = await apiKeyRepository.findApiKey({ key: cryptedKey });
    if (!apiKey) throw ApiError.Unauthorized("Api key not found");
    return this.Instance(apiKey.userId);
  }

  private hasApiKeyAccess(apiKey: ApiKey): boolean {
    return apiKey.userId === (this.user.id as string);
  }

  /**
   * Ensures the current user owns the given API key, normalizing a
   * full Prisma payload first if needed. Throws if access is denied.
   */
  private hasAccessOrThrow(apiKey: ApiKey | ApiKeyWithPermissions) {
    if ("apiKeyPermissions" in apiKey) {
      apiKey = this.normalizeApiKey(apiKey);
    }

    if (!this.hasApiKeyAccess(apiKey as ApiKey))
      throw new Error("You don't have access to this API key");
    return apiKey;
  }

  /**
   * Converts a Prisma database record into the public {@link ApiKey}
   * DTO by extracting permission values, converting Date objects to
   * ISO strings, and discarding the internal join-table wrapper.
   *
   * @param apiKey - The raw Prisma payload with nested permission records
   * @returns A flat, serializable {@link ApiKey} object
   */
  private normalizeApiKey(apiKey: ApiKeyWithPermissions): ApiKey {
    const { apiKeyPermissions, createdAt, updatedAt, expiresAt, ...rest } = apiKey;

    return {
      ...rest,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      permissions: apiKeyPermissions.map((p) => p.permission.toLowerCase() as ApiKeyPermission),
    };
  }

  /** Fetches, decrypts, and normalizes multiple API keys in parallel after verifying ownership. */
  private async getManyApiKeys(where: Prisma.ApiKeyWhereInput): Promise<Array<ApiKey> | null> {
    const apiKeys = await this.repository.findApiKeys(where);
    return Promise.all(
      apiKeys.map(async (apiKey) => {
        this.hasAccessOrThrow(apiKey);
        const cryptoUtils = new CryptoUtils(apiKey.key);
        apiKey.key = await cryptoUtils.decrypt();
        return this.normalizeApiKey(apiKey);
      }),
    );
  }

  /**
   * Fetches and decrypts a single API key, verifying caller ownership.
   * Strips the {@code sc_} prefix before decryption and re-adds it to the
   * returned key so the caller sees the stored representation.
   */
  private async getApiKey(where: Prisma.ApiKeyWhereInput): Promise<ApiKey | null> {
    const apiKey = await this.repository.findApiKey(where);
    if (!apiKey) return null;
    this.hasAccessOrThrow(apiKey);
    const cryptoUtils = new CryptoUtils(apiKey.key.replace("sc_", ""));
    apiKey.key = "sc_" + (await cryptoUtils.decrypt());
    return this.normalizeApiKey(apiKey);
  }

  private async updateApiKey(where: Prisma.ApiKeyWhereUniqueInput, data: Prisma.ApiKeyUpdateInput) {
    const apiKey = await this.getApiKeyOrThrow(where);
    this.hasAccessOrThrow(apiKey);
    await this.repository.updateApiKey(where, data);
    return this.getApiKeyOrThrow(where);
  }

  private async deleteApiKey(where: Prisma.ApiKeyWhereUniqueInput) {
    const apiKey = await this.getApiKeyOrThrow(where);
    this.hasAccessOrThrow(apiKey);
    await this.repository.deleteApiKey(where);
  }

  /** Returns all decrypted API keys belonging to the scoped user. */
  async getUserApiKeys() {
    return await this.getManyApiKeys({ userId: this.user.id as string });
  }

  /** Fetches a decrypted API key by its database ID. Returns null if not found or not owned. */
  async getApiKeyById(id: string) {
    return await this.getApiKey({ id });
  }

  /** Fetches a decrypted API key by its encrypted key value. Returns null if not found or not owned. */
  async getApiKeyByKey(key: string) {
    return await this.getApiKey({ key });
  }

  /** Like {@link getApiKey} but throws {@link ApiError.ResourceNotFound} when the key is absent. */
  async getApiKeyOrThrow(where: Prisma.ApiKeyWhereInput) {
    const apiKey = await this.getApiKey(where);
    if (!apiKey) throw ApiError.ResourceNotFound("Api Key");
    return apiKey;
  }

  /**
   * Generates a new API key for the current user.
   *
   * A 16-byte cryptographically random hex string is generated, encrypted
   * via AES-256-GCM, prefixed with {@code sc_} for quick identification,
   * and stored in the database. The key expires after 30 days unless updated.
   *
   * The returned {@link ApiKey} object includes the decrypted key value
   * so the caller can present it to the user — it will not be recoverable
   * after this response.
   *
   * @param data - The key name and initial permissions
   * @returns The created {@link ApiKey} with the decrypted key value
   */
  async generateApiKey(data: CreateApiKeyInput): Promise<ApiKey> {
    const key = randomBytes(16).toString("hex");
    const cryptoUtils = new CryptoUtils(key);
    const encryptedKey = await cryptoUtils.encrypt();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

    const apiKey = await this.repository.createApiKey({
      keyName: data.name,
      key: `sc_${encryptedKey}`,
      expiresAt,
      user: {
        connect: {
          id: this.user.id as string,
        },
      },
      apiKeyPermissions: {
        createMany: {
          skipDuplicates: true,
          data: data.permissions.map((p) => ({
            // Prisma generated enum expects uppercase; the DTO carries lowercase
            permission: p.toUpperCase() as never,
          })),
        },
      },
    });

    return this.getApiKeyOrThrow({ id: apiKey.id });
  }

  /** Deletes an API key by its database ID after verifying caller ownership. */
  async deleteApiKeyById(id: string) {
    return await this.deleteApiKey({ id });
  }

  /** Deletes an API key by its encrypted key value after verifying caller ownership. */
  async deleteApiKeyByKey(key: string) {
    return await this.deleteApiKey({ key });
  }

  /**
   * Deletes all API keys whose expiration date has passed.
   * Intended to be called by a scheduled cleanup job.
   */
  async deleteExpiredKeys() {
    return await this.repository.deleteApiKeys({ expiresAt: { lt: new Date() } });
  }

  /** Toggles the active/inactive status of an API key owned by the scoped user. */
  async updateApiKeyStatus(id: string, isActive: boolean): Promise<ApiKey> {
    await this.updateApiKey({ id }, { isActive });
    return this.getApiKeyOrThrow({ id });
  }

  /** Renames an API key owned by the scoped user. */
  async updateApiKeyName(id: string, keyName: string): Promise<ApiKey> {
    await this.updateApiKey({ id }, { keyName });
    return this.getApiKeyOrThrow({ id });
  }

  /**
   * Atomically replaces the permission set of an API key.
   *
   * Removed permissions are deleted from the join table and added
   * permissions are bulk-created in a single {@code updateApiKey} call.
   * The returned key reflects the new permission set after the update.
   *
   * @param id - The API key ID
   * @param data - Permissions to add and remove
   * @returns The updated {@link ApiKey} with the new permissions
   */
  async updateApiKeyPermissions(
    id: string,
    data: { addPermissions: ApiKeyPermission[]; removePermissions: ApiKeyPermission[] },
  ): Promise<ApiKey> {
    await this.updateApiKey(
      { id },
      {
        apiKeyPermissions: {
          deleteMany: {
            ...data.removePermissions.map((p) => ({
              // Prisma generated enum expects uppercase; the DTO carries lowercase
              permission: p.toUpperCase() as never,
            })),
          },
          createMany: {
            data: data.addPermissions.map((p) => ({
              permission: p.toUpperCase() as never,
            })),
          },
        },
      },
    );
    return this.getApiKeyOrThrow({ id });
  }

  /**
   * Verifies that an API key is valid: it must exist, be active, and
   * not have passed its expiration date.
   *
   * @param cryptedKey - The encrypted key string as stored in the database
   * @returns {@code true} if the key is valid and usable
   */
  async verifyKey(cryptedKey: string): Promise<boolean> {
    const apiKey = await this.getApiKeyByKey(cryptedKey);
    if (!apiKey) return false;
    return apiKey.isActive && new Date(apiKey.expiresAt) > new Date();
  }
}
