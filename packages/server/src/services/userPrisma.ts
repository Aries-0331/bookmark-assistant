import { PrismaClient } from '@prisma/client';
import { UserData } from '../types';

export const prisma = new PrismaClient();

export class UserPrismaRepo {
  async upsert(user: UserData): Promise<void> {
    await prisma.user.upsert({
      where: { user_id: user.userId },
      create: {
        user_id: user.userId,
        notion_access_token: user.notionAccessToken,
        notion_refresh_token: user.notionRefreshToken || null,
        notion_workspace_id: user.notionWorkspaceId || null,
        bot_id: user.botId || null,
        duplicated_template_id: user.duplicatedTemplateId || null,
        notion_database_id: user.notionDatabaseId || null,
        notion_data_source_id: user.notionDataSourceId || null,
        template_database_id: user.templateDatabaseId || null,
        databases: user.databases || [],
        last_activity: user.lastActivity,
      },
      update: {
        notion_access_token: user.notionAccessToken,
        notion_refresh_token: user.notionRefreshToken || null,
        notion_workspace_id: user.notionWorkspaceId || null,
        bot_id: user.botId || null,
        duplicated_template_id: user.duplicatedTemplateId || null,
        notion_database_id: user.notionDatabaseId || null,
        notion_data_source_id: user.notionDataSourceId || null,
        template_database_id: user.templateDatabaseId || null,
        databases: user.databases || [],
        last_activity: new Date(),
      },
    });
  }

  async find(userId: string): Promise<UserData | undefined> {
    const u = await prisma.user.findUnique({ where: { user_id: userId } });
    if (!u) return undefined;
    return {
      userId: u.user_id,
      notionAccessToken: u.notion_access_token,
      notionRefreshToken: u.notion_refresh_token || undefined,
      notionWorkspaceId: u.notion_workspace_id || undefined,
      botId: u.bot_id || undefined,
      duplicatedTemplateId: u.duplicated_template_id || undefined,
      notionDatabaseId: u.notion_database_id || undefined,
      notionDataSourceId: u.notion_data_source_id || undefined,
      templateDatabaseId: u.template_database_id || undefined,
      databases: (u.databases as any) || [],
      lastActivity: u.last_activity,
    };
  }

  async updateTokens(userId: string, access: string, refresh?: string) {
    await prisma.user.update({
      where: { user_id: userId },
      data: {
        notion_access_token: access,
        notion_refresh_token: refresh || null,
        last_activity: new Date(),
      },
    });
  }

  async setResolvedDatabase(
    userId: string,
    duplicated_template_id: string,
    databaseId: string,
    dataSourceId: string | null
  ) {
    await prisma.user.update({
      where: { user_id: userId },
      data: {
        template_database_id: duplicated_template_id,
        notion_database_id: databaseId,
        notion_data_source_id: dataSourceId,
        last_activity: new Date(),
      },
    });
  }
}

export const userPrisma = new UserPrismaRepo();
