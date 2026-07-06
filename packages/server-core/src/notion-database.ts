export interface NotionDataSourceLike {
  id?: unknown;
}

export interface NotionDatabaseLike {
  data_sources?: unknown;
}

export function getPrimaryNotionDataSourceId(
  database: NotionDatabaseLike | null | undefined
): string | undefined {
  const dataSources = database?.data_sources;

  if (!Array.isArray(dataSources) || dataSources.length === 0) {
    return undefined;
  }

  const primary = dataSources[0] as NotionDataSourceLike | null | undefined;
  return typeof primary?.id === 'string' && primary.id.length > 0 ? primary.id : undefined;
}
