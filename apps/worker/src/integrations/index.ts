/**
 * Integration client registry — maps source type integers to client classes.
 */
import type { Database } from "@customer-pulse/db/client";
import type { BaseIntegrationClient } from "./base-client.js";
import { LinearClient } from "./linear-client.js";
import { GoogleFormsClient } from "./google-forms-client.js";
import { SlackClient } from "./slack-client.js";
import { GongClient } from "./gong-client.js";
import { ExcelOnlineClient } from "./excel-online-client.js";
import { JiraClient } from "./jira-client.js";
import { LogRocketClient } from "./logrocket-client.js";
import { FullStoryClient } from "./fullstory-client.js";
import { IntercomClient } from "./intercom-client.js";
import { ZendeskClient } from "./zendesk-client.js";
import { SentryClient } from "./sentry-client.js";

type IntegrationRow = { id: number; projectId: number; sourceType: number; credentialsCiphertext: string | null };

// Maps source_type integers to client constructors
const CLIENT_MAP: Record<number, new (db: Database, row: IntegrationRow) => BaseIntegrationClient> = {
  0: LinearClient,        // linear
  1: GoogleFormsClient,   // google_forms
  2: SlackClient,         // slack
  4: GongClient,          // gong
  5: ExcelOnlineClient,   // excel_online
  6: JiraClient,          // jira
  7: LogRocketClient,     // logrocket
  8: FullStoryClient,     // fullstory
  9: IntercomClient,      // intercom
  10: ZendeskClient,      // zendesk
  11: SentryClient,       // sentry
};

// Maps sync job names to source type integers
export const SYNC_JOB_SOURCE_MAP: Record<string, number> = {
  SyncLinearJob: 0,
  SyncGoogleFormsJob: 1,
  SyncSlackJob: 2,
  SyncGongJob: 4,
  SyncExcelOnlineJob: 5,
  SyncJiraJob: 6,
  SyncLogrocketJob: 7,
  SyncFullstoryJob: 8,
  SyncIntercomJob: 9,
  SyncZendeskJob: 10,
  SyncSentryJob: 11,
};

export function createClient(db: Database, row: IntegrationRow): BaseIntegrationClient | null {
  const Ctor = CLIENT_MAP[row.sourceType];
  if (!Ctor) return null;
  return new Ctor(db, row);
}
