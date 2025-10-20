import { isPro } from '@bookmark-sync/shared/env';
import type { NotionSyncAdapter } from '@bookmark-sync/shared/notionSync/adapter';
import { proApi } from './pro-api';
import { ossApi } from './oss-api';

export const api: NotionSyncAdapter = isPro() ? proApi : ossApi;
