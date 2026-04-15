import { QUEUE_DEFAULT, QUEUE_MAILERS } from "./queue-names.js";

/**
 * Cron patterns — see `docs/archive/next-migration/sidekiq_schedule.yml` for historical reference.
 * `jobName` matches the Ruby class name for easier log correlation during the migration.
 */
export const repeatableSchedules: { queue: string; jobName: string; pattern: string }[] = [
  { queue: QUEUE_DEFAULT, jobName: "ProcessFeedbackBatchJob", pattern: "0 */4 * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncGoogleFormsJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_MAILERS, jobName: "SendDailyPulseJob", pattern: "0 9 * * *" },
  { queue: QUEUE_DEFAULT, jobName: "GenerateInsightsJob", pattern: "0 6 * * *" },
  { queue: QUEUE_DEFAULT, jobName: "WeeklyThemeAnalysisJob", pattern: "0 4 * * 0" },
  { queue: QUEUE_DEFAULT, jobName: "BuildAttackGroupsJob", pattern: "0 7 * * 1" },
  { queue: QUEUE_DEFAULT, jobName: "SyncJiraJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncExcelOnlineJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncGongJob", pattern: "*/30 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncSlackJob", pattern: "* * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncSentryJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncZendeskJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncIntercomJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncLogrocketJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncFullstoryJob", pattern: "*/15 * * * *" },
  { queue: QUEUE_DEFAULT, jobName: "SyncLinearJob", pattern: "*/15 * * * *" },
];
