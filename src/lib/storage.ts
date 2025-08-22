export interface StorageData {
  notion_token?: string;
  notion_database_id?: string;
  openai_api_key?: string;
  auto_sync_enabled?: boolean;
  sync_settings?: {
    generateTags: boolean;
    generateSummary: boolean;
    extractContent: boolean;
  };
}

export class ChromeStorage {
  static async get<K extends keyof StorageData>(
    keys: K | K[]
  ): Promise<Pick<StorageData, K>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        resolve(result as Pick<StorageData, K>);
      });
    });
  }

  static async set(data: Partial<StorageData>): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => {
        resolve();
      });
    });
  }

  static async remove(keys: keyof StorageData | (keyof StorageData)[]): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys as string | string[], () => {
        resolve();
      });
    });
  }

  static async clear(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    });
  }
}