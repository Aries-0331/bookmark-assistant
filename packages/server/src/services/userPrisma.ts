import { PrismaClient } from '@prisma/client';
import { UserData } from '../types';

export const prisma = new PrismaClient();

export class UserPrismaRepo {
  async upsert(user: UserData): Promise<void> {
    const data = {
      notionUserId: user.userId,
      notionAccessToken: user.notionAccessToken,
      notionRefreshToken: user.notionRefreshToken || null,
      notionWorkspaceId: user.notionWorkspaceId || null,
      botId: user.botId || null,
      duplicatedTemplateId: user.duplicatedTemplateId || null,
      notionDatabaseId: user.notionDatabaseId || null,
      notionDataSourceId: user.notionDataSourceId || null,
      templateDatabaseId: user.templateDatabaseId || null,
      databases: user.databases || [],
      lastActivity: user.lastActivity,
    };

    await prisma.user.upsert({
      where: { notionUserId: user.userId },
      create: {
        ...data,
        email: user.email || `missing_${user.userId}@example.com`, // Fallback if email missing
      },
      update: data,
    });
  }

  async find(userId: string): Promise<UserData | undefined> {
    // Try finding by CUID first (new system)
    let u = await prisma.user.findUnique({ where: { id: userId } });

    // Fallback: try finding by notionUserId (legacy system/JWTs)
    if (!u) {
      u = await prisma.user.findUnique({ where: { notionUserId: userId } });
    }

    if (!u) return undefined;
    return {
      id: u.id,
      userId: u.notionUserId || '',
      email: u.email || undefined,
      notionAccessToken: u.notionAccessToken || '',
      notionRefreshToken: u.notionRefreshToken || undefined,
      notionWorkspaceId: u.notionWorkspaceId || undefined,
      botId: u.botId || undefined,
      duplicatedTemplateId: u.duplicatedTemplateId || undefined,
      notionDatabaseId: u.notionDatabaseId || undefined,
      notionDataSourceId: u.notionDataSourceId || undefined,
      templateDatabaseId: u.templateDatabaseId || undefined,
      databases: (u.databases as any) || [],
      lastActivity: u.lastActivity,
      plan: u.plan,
    };
  }

  async updateTokens(userId: string, access: string, refresh?: string) {
    // Try update by CUID or Notion ID
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          notionAccessToken: access,
          notionRefreshToken: refresh || null,
          lastActivity: new Date(),
        },
      });
    } catch {
      await prisma.user.update({
        where: { notionUserId: userId },
        data: {
          notionAccessToken: access,
          notionRefreshToken: refresh || null,
          lastActivity: new Date(),
        },
      });
    }
  }

  async setResolvedDatabase(
    userId: string,
    duplicated_template_id: string,
    databaseId: string,
    dataSourceId: string | null
  ) {
    const data = {
      templateDatabaseId: duplicated_template_id,
      notionDatabaseId: databaseId,
      notionDataSourceId: dataSourceId,
      lastActivity: new Date(),
    };

    try {
      await prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch {
      await prisma.user.update({
        where: { notionUserId: userId },
        data,
      });
    }
  }
}

export const userPrisma = new UserPrismaRepo();
