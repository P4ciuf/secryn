import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

/**
 * Full Prisma payload for an {@link ApiKey} record with its permission
 * assignments eagerly loaded. Used internally to normalize database
 * results into the public {@link ApiKey} DTO.
 */
export type ApiKeyWithPermissions = Prisma.ApiKeyGetPayload<{
  include: {
    apiKeyPermissions: true;
  };
}>;

/**
 * Thin data-access layer over the Prisma {@link ApiKey} and
 * {@link ApiKeyPermission} tables. Every method delegates directly to
 * the Prisma client with the same input shape — no extra logic.
 *
 * The default {@link include} always fetches permission assignments so
 * callers never receive an incomplete API key record.
 */
export class ApiKeyRepository {
  private readonly include = {
    include: {
      apiKeyPermissions: true,
    },
  };

  async createApiKey(data: Prisma.ApiKeyCreateInput) {
    return await prisma.apiKey.create({ data });
  }

  async deleteApiKey(where: Prisma.ApiKeyWhereUniqueInput) {
    await prisma.apiKey.delete({ where });
  }

  async findApiKey(where: Prisma.ApiKeyWhereInput): Promise<ApiKeyWithPermissions | null> {
    return await prisma.apiKey.findFirst({ where, ...this.include });
  }

  async findApiKeys(where: Prisma.ApiKeyWhereInput): Promise<ApiKeyWithPermissions[]> {
    return await prisma.apiKey.findMany({ where, ...this.include });
  }

  async createPermissionAssignment(data: Prisma.ApiKeyPermissionCreateInput) {
    await prisma.apiKeyPermission.create({ data });
  }

  async deletePermissionAssignment(where: Prisma.ApiKeyPermissionWhereUniqueInput) {
    await prisma.apiKeyPermission.delete({ where });
  }

  async deleteApiKeys(where: Prisma.ApiKeyWhereInput) {
    await prisma.apiKey.deleteMany({ where });
  }

  async updateApiKey(where: Prisma.ApiKeyWhereUniqueInput, data: Prisma.ApiKeyUpdateInput) {
    return await prisma.apiKey.update({ where, data });
  }
}

export const apiKeyRepository = new ApiKeyRepository();
