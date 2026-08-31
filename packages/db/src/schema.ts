/**
 * PostgreSQL schema (snake_case columns, integer enums). Numeric values must stay aligned with
 * `docs/next-migration/PARITY_MATRIX.md` for legacy row compatibility.
 */
import {
  pgTable,
  bigint,
  bigserial,
  text,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  timestamp,
  varchar,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * User table in the tenant database.
 *
 * In **multi-tenant mode**, this is a read-only mirror synced from the control
 * plane.  Auth fields (password, reset token) exist for schema compatibility but
 * are empty — all auth queries go through the control-plane `cpUsers` table.
 *
 * In **single-tenant mode**, this is the authoritative user table (same as before).
 */
export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().default(""),
    encryptedPassword: varchar("encrypted_password", { length: 255 }).notNull().default(""),
    resetPasswordToken: varchar("reset_password_token", { length: 255 }),
    resetPasswordSentAt: timestamp("reset_password_sent_at", { withTimezone: true }),
    rememberCreatedAt: timestamp("remember_created_at", { withTimezone: true }),
    name: varchar("name", { length: 255 }),
    role: integer("role").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    onboardingCurrentStep: varchar("onboarding_current_step", { length: 255 }).default("welcome"),
    provider: varchar("provider", { length: 255 }),
    uid: varchar("uid", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 255 }),
  },
  (t) => [
    uniqueIndex("index_users_on_email").on(t.email),
    uniqueIndex("index_users_on_provider_and_uid").on(t.provider, t.uid),
    uniqueIndex("index_users_on_reset_password_token").on(t.resetPasswordToken),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    slug: varchar("slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    /** Business-level objectives for the Strategy tab (project = workspace). */
    businessObjectives: text("business_objectives"),
    businessStrategy: text("business_strategy"),
    /**
     * OST / discovery map v1: optional root “goal” copy + link (outcomes at top of the tree in `/app/discover/map`).
     */
    ostMapRoot: jsonb("ost_map_root")
      .$type<{ text?: string }>()
      .notNull()
      .default({}),
  },
  (t) => [uniqueIndex("index_projects_on_slug").on(t.slug)],
);

/** Per-project settings (pulse send time, AI interval, defaults). */
export const projectSettings = pgTable(
  "project_settings",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    pulseSendTime: varchar("pulse_send_time", { length: 10 }).notNull().default("09:00"),
    aiProcessingIntervalHours: integer("ai_processing_interval_hours").notNull().default(4),
    defaultPriority: varchar("default_priority", { length: 20 }).notNull().default("unset"),
    autoArchiveDays: integer("auto_archive_days").notNull().default(30),
    githubAutoMerge: boolean("github_auto_merge").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("index_project_settings_on_project_id").on(t.projectId)],
);

/** Named teams under a project; objectives/strategy only in v1 (no member assignment). */
export const teams = pgTable(
  "teams",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    objectives: text("objectives"),
    strategy: text("strategy"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("index_teams_on_project_id").on(t.projectId)],
);

/**
 * Async natural-language reporting jobs: user prompt + structured or markdown result.
 * output_mode / status use integers aligned with ReportingOutputMode / ReportingRequestStatus in enums.ts.
 */
export const reportingRequests = pgTable(
  "reporting_requests",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    prompt: text("prompt").notNull(),
    outputMode: integer("output_mode").notNull().default(0),
    status: integer("status").notNull().default(0),
    errorMessage: text("error_message"),
    resultMarkdown: text("result_markdown"),
    resultStructured: jsonb("result_structured").$type<Record<string, unknown> | null>(),
    /** How many days of feedback context to include when building the AI prompt. */
    rangeDays: integer("range_days").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("index_reporting_requests_on_project_id_and_created_at").on(t.projectId, t.createdAt),
    index("index_reporting_requests_on_user_id").on(t.userId),
  ],
);

/**
 * Charts pinned to the Reporting page by a user.
 * Stores a snapshot of the chart JSON at pin time so pinned charts stay stable
 * even as feedback data changes (denormalised — no FK to reporting_requests).
 */
export const pinnedReportCharts = pgTable(
  "pinned_report_charts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    createdBy: bigint("created_by", { mode: "number" }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    prompt: text("prompt").notNull(),
    /** Snapshot of the chart JSON from reporting_requests.result_structured at pin time. */
    chartJson: jsonb("chart_json").$type<Record<string, unknown>>().notNull(),
    narrative: text("narrative"),
    rangeDays: integer("range_days").notNull().default(30),
    pinnedAt: timestamp("pinned_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("index_pinned_report_charts_on_project_id").on(t.projectId),
    index("index_pinned_report_charts_on_created_by").on(t.createdBy),
  ],
);

export const projectUsers = pgTable(
  "project_users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    invitedById: bigint("invited_by_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    isOwner: boolean("is_owner").notNull().default(false),
  },
  (t) => [
    uniqueIndex("index_project_users_on_project_id_and_user_id").on(t.projectId, t.userId),
    index("index_project_users_on_project_id").on(t.projectId),
    index("index_project_users_on_user_id").on(t.userId),
    index("index_project_users_on_invited_by_id").on(t.invitedById),
  ],
);

export const integrations = pgTable(
  "integrations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    sourceType: integer("source_type").notNull(),
    credentialsCiphertext: text("credentials_ciphertext"),
    webhookSecret: varchar("webhook_secret", { length: 255 }),
    enabled: boolean("enabled").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncFrequencyMinutes: integer("sync_frequency_minutes").notNull().default(15),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
  },
  (t) => [
    index("index_integrations_on_project_id").on(t.projectId),
    index("index_integrations_on_enabled").on(t.enabled),
    index("index_integrations_on_source_type").on(t.sourceType),
  ],
);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    source: integer("source").notNull(),
    sourceExternalId: varchar("source_external_id", { length: 255 }),
    title: varchar("title", { length: 255 }),
    content: text("content").notNull(),
    authorName: varchar("author_name", { length: 255 }),
    authorEmail: varchar("author_email", { length: 255 }),
    category: integer("category").notNull().default(0),
    priority: integer("priority").notNull().default(0),
    status: integer("status").notNull().default(0),
    aiSummary: text("ai_summary"),
    aiConfidenceScore: doublePrecision("ai_confidence_score"),
    aiProcessedAt: timestamp("ai_processed_at", { withTimezone: true }),
    manuallyReviewed: boolean("manually_reviewed").notNull().default(false),
    rawData: jsonb("raw_data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    insightProcessedAt: timestamp("insight_processed_at", { withTimezone: true }),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("index_feedbacks_on_source_and_source_external_id").on(t.source, t.sourceExternalId),
    index("index_feedbacks_on_project_id").on(t.projectId),
    index("index_feedbacks_on_source").on(t.source),
    index("index_feedbacks_on_created_at").on(t.createdAt),
  ],
);

export const emailRecipients = pgTable(
  "email_recipients",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    active: boolean("active").notNull().default(true),
    /**
     * Per-recipient digest filter applied in worker SQL (NOT trusted to the LLM).
     * Shape: `{ minPriority?: number, categories?: number[], teamIds?: number[] }`.
     */
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull().default({}),
    /**
     * Tone / length preferences passed into the digest prompt.
     * Shape: `{ tone?: "concise" | "detailed", focus?: string }`.
     */
    preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("index_email_recipients_on_project_id_and_email").on(t.projectId, t.email),
    index("index_email_recipients_on_active").on(t.active),
    index("index_email_recipients_on_project_id").on(t.projectId),
  ],
);

export const pulseReports = pgTable(
  "pulse_reports",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    feedbackCount: integer("feedback_count").notNull().default(0),
    recipientCount: integer("recipient_count").notNull().default(0),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
  },
  (t) => [
    index("index_pulse_reports_on_project_id").on(t.projectId),
    index("index_pulse_reports_on_sent_at").on(t.sentAt),
  ],
);

export const pmPersonas = pgTable("pm_personas", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  archetype: varchar("archetype", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  priorities: jsonb("priorities").$type<unknown[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
});

export const insights = pgTable(
  "insights",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    insightType: integer("insight_type").notNull().default(0),
    severity: integer("severity").notNull().default(0),
    confidenceScore: integer("confidence_score").notNull().default(0),
    affectedUsersCount: integer("affected_users_count").notNull().default(0),
    feedbackCount: integer("feedback_count").notNull().default(0),
    status: integer("status").notNull().default(0),
    pmPersonaId: bigint("pm_persona_id", { mode: "number" }),
    evidence: jsonb("evidence").$type<unknown[]>().notNull().default([]),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }),
    addressedAt: timestamp("addressed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    /**
     * Default discovery “owner” for this insight — inherited by activities unless
     * `discovery_activities.assignee_id` is set. Stage 3 assignments.
     */
    discoveryLeadId: bigint("discovery_lead_id", { mode: "number" }),
    /**
     * Coarse process position for discovery (framing → … → decision). Stage 4.
     * Integers: see `DiscoveryInsightStage` in `enums.ts`.
     */
    discoveryStage: integer("discovery_stage").notNull().default(1),
    /**
     * Optional Strategy-tab team for this opportunity (same `project_id` as the insight);
     * shown on the OST map when set.
     */
    teamId: bigint("team_id", { mode: "number" }),
  },
  (t) => [
    index("index_insights_on_project_id").on(t.projectId),
    index("index_insights_on_discovery_lead_id").on(t.discoveryLeadId),
    index("index_insights_on_discovery_stage").on(t.discoveryStage),
    index("index_insights_on_team_id").on(t.teamId),
  ],
);

export const themes = pgTable("themes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priorityScore: integer("priority_score").notNull().default(0),
  insightCount: integer("insight_count").notNull().default(0),
  affectedUsersEstimate: integer("affected_users_estimate").notNull().default(0),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
});

export const feedbackInsights = pgTable(
  "feedback_insights",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    feedbackId: bigint("feedback_id", { mode: "number" }).notNull(),
    insightId: bigint("insight_id", { mode: "number" }).notNull(),
    relevanceScore: doublePrecision("relevance_score").notNull().default(0),
    contributionSummary: text("contribution_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_feedback_insights_on_feedback_id_and_insight_id").on(t.feedbackId, t.insightId),
    index("index_feedback_insights_on_feedback_id").on(t.feedbackId),
    index("index_feedback_insights_on_insight_id").on(t.insightId),
  ],
);

export const insightThemes = pgTable(
  "insight_themes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    insightId: bigint("insight_id", { mode: "number" }).notNull(),
    themeId: bigint("theme_id", { mode: "number" }).notNull(),
    relevanceScore: doublePrecision("relevance_score").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_insight_themes_on_insight_id_and_theme_id").on(t.insightId, t.themeId),
    index("index_insight_themes_on_insight_id").on(t.insightId),
    index("index_insight_themes_on_theme_id").on(t.themeId),
  ],
);

export const stakeholderSegments = pgTable("stakeholder_segments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  segmentType: integer("segment_type").notNull().default(0),
  description: text("description"),
  sizeEstimate: integer("size_estimate").notNull().default(0),
  engagementPriority: integer("engagement_priority").notNull().default(0),
  engagementStrategy: text("engagement_strategy"),
  characteristics: jsonb("characteristics").$type<unknown[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
});

export const insightStakeholders = pgTable(
  "insight_stakeholders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    insightId: bigint("insight_id", { mode: "number" }).notNull(),
    stakeholderSegmentId: bigint("stakeholder_segment_id", { mode: "number" }).notNull(),
    impactLevel: integer("impact_level").notNull().default(0),
    impactDescription: text("impact_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("idx_insight_stakeholders_unique").on(t.insightId, t.stakeholderSegmentId),
    index("index_insight_stakeholders_on_insight_id").on(t.insightId),
    index("index_insight_stakeholders_on_stakeholder_segment_id").on(t.stakeholderSegmentId),
  ],
);

export const ideas = pgTable("ideas", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  ideaType: integer("idea_type").notNull().default(0),
  effortEstimate: integer("effort_estimate").notNull().default(0),
  impactEstimate: integer("impact_estimate").notNull().default(0),
  confidenceScore: integer("confidence_score").notNull().default(0),
  status: integer("status").notNull().default(0),
  pmPersonaId: bigint("pm_persona_id", { mode: "number" }),
  rationale: text("rationale"),
  risks: text("risks"),
  implementationHints: jsonb("implementation_hints").$type<unknown[]>().notNull().default([]),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  projectId: bigint("project_id", { mode: "number" }).notNull(),
});

export const ideaInsights = pgTable(
  "idea_insights",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ideaId: bigint("idea_id", { mode: "number" }).notNull(),
    insightId: bigint("insight_id", { mode: "number" }).notNull(),
    addressLevel: integer("address_level").notNull().default(0),
    addressDescription: text("address_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_idea_insights_on_idea_id_and_insight_id").on(t.ideaId, t.insightId),
    index("index_idea_insights_on_idea_id").on(t.ideaId),
    index("index_idea_insights_on_insight_id").on(t.insightId),
  ],
);

export const ideaRelationships = pgTable(
  "idea_relationships",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ideaId: bigint("idea_id", { mode: "number" }).notNull(),
    relatedIdeaId: bigint("related_idea_id", { mode: "number" }).notNull(),
    relationshipType: integer("relationship_type").notNull().default(0),
    explanation: text("explanation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_idea_relationships_on_idea_id_and_related_idea_id").on(t.ideaId, t.relatedIdeaId),
    index("index_idea_relationships_on_idea_id").on(t.ideaId),
    index("index_idea_relationships_on_related_idea_id").on(t.relatedIdeaId),
  ],
);

export const ideaPullRequests = pgTable(
  "idea_pull_requests",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ideaId: bigint("idea_id", { mode: "number" }).notNull(),
    integrationId: bigint("integration_id", { mode: "number" }).notNull(),
    prNumber: integer("pr_number"),
    prUrl: varchar("pr_url", { length: 255 }),
    branchName: varchar("branch_name", { length: 255 }),
    status: integer("status").notNull().default(0),
    filesChanged: jsonb("files_changed").$type<unknown[]>().notNull().default([]),
    errorMessage: text("error_message"),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    progressMessage: text("progress_message"),
    progressStep: integer("progress_step"),
  },
  (t) => [
    index("index_idea_pull_requests_on_idea_id").on(t.ideaId),
    index("index_idea_pull_requests_on_integration_id").on(t.integrationId),
  ],
);

export const repoAnalyses = pgTable(
  "repo_analyses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    integrationId: bigint("integration_id", { mode: "number" }).notNull(),
    commitSha: varchar("commit_sha", { length: 255 }),
    techStack: jsonb("tech_stack").$type<Record<string, unknown>>().notNull().default({}),
    structure: jsonb("structure").$type<Record<string, unknown>>().notNull().default({}),
    conventions: jsonb("conventions").$type<Record<string, unknown>>().notNull().default({}),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("index_repo_analyses_on_integration_id").on(t.integrationId)],
);

export const skills = pgTable(
  "skills",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    content: text("content").notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    projectId: bigint("project_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_skills_on_name").on(t.name),
    index("index_skills_on_user_id").on(t.userId),
    index("index_skills_on_project_id").on(t.projectId),
  ],
);

/**
 * specs — the core Build primitive.
 *
 * Each spec captures a piece of work that originated from one or more insights.
 * The spec moves through SpecStatus stages (backlog → shipped) on the Spec Board.
 *
 * Key columns:
 *   user_stories         — JSONB array of user story strings drafted by a PM or Claude
 *   acceptance_criteria  — JSONB array of acceptance criteria strings (one per user story)
 *   status               — integer aligned with SpecStatus enum in enums.ts
 *   effort_score         — AI-estimated effort (1–5 scale, null until scored)
 *   impact_score         — AI-estimated impact (1–5 scale, null until scored)
 *   ai_generated         — true when user_stories / acceptance_criteria were drafted by Claude
 *   created_by           — the user who created the spec (foreign key to users.id)
 */
export const specs = pgTable(
  "specs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    /** Free-text overview of the problem and context (shown on the spec form and detail page) */
    description: text("description"),
    /** Array of user story strings, e.g. ["As a PM, I want…", …] */
    userStories: jsonb("user_stories").$type<string[]>().notNull().default([]),
    /** Array of acceptance criteria strings, ordered to match userStories */
    acceptanceCriteria: jsonb("acceptance_criteria").$type<string[]>().notNull().default([]),
    /** Integer aligned with SpecStatus enum — 0=backlog, 5=shipped */
    status: integer("status").notNull().default(0),
    /** AI-estimated effort score on a 1–5 scale; null until the Effort/Impact Planner scores it */
    effortScore: doublePrecision("effort_score"),
    /** AI-estimated impact score on a 1–5 scale; null until scored */
    impactScore: doublePrecision("impact_score"),
    /** Measurable success criteria generated by Claude — e.g. "20% of active users within 30 days" */
    successMetrics: jsonb("success_metrics").$type<string[]>().notNull().default([]),
    /** Explicit exclusions to prevent scope creep — generated by Claude */
    outOfScope: jsonb("out_of_scope").$type<string[]>().notNull().default([]),
    /** Risks and edge cases identified during AI drafting */
    risks: jsonb("risks").$type<string[]>().notNull().default([]),
    /** True when userStories / acceptanceCriteria were generated by Claude — shown as "AI drafted" badge */
    aiGenerated: boolean("ai_generated").notNull().default(false),
    /** The user who created this spec */
    createdBy: bigint("created_by", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("index_specs_on_project_id").on(t.projectId),
    index("index_specs_on_created_by").on(t.createdBy),
    index("index_specs_on_status").on(t.status),
  ],
);

/**
 * spec_insights — the "golden thread" join table.
 *
 * Links each spec back to the insight(s) that motivated it.
 * Every spec should have at least one row here so PMs can always trace
 * build work back to real customer evidence.
 */
export const specInsights = pgTable(
  "spec_insights",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    specId: bigint("spec_id", { mode: "number" }).notNull(),
    insightId: bigint("insight_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    /** Prevent the same insight being linked to the same spec twice */
    uniqueIndex("index_spec_insights_on_spec_id_and_insight_id").on(t.specId, t.insightId),
    index("index_spec_insights_on_spec_id").on(t.specId),
    index("index_spec_insights_on_insight_id").on(t.insightId),
  ],
);

/**
 * discovery_activities — research tasks linked to an insight.
 *
 * Each row represents one discovery activity (interview guide, survey, etc.)
 * created by a PM on the Discover tab. The activityType integer maps to
 * DiscoveryActivityType in enums.ts; status maps to DiscoveryActivityStatus.
 */
export const discoveryActivities = pgTable(
  "discovery_activities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    insightId: bigint("insight_id", { mode: "number" }).notNull(),
    /** Integer aligned with DiscoveryActivityType enum — e.g. 1=interview_guide */
    activityType: integer("activity_type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    /** Integer aligned with DiscoveryActivityStatus enum — 1=draft, 2=in_progress, 3=complete */
    status: integer("status").notNull().default(1),
    /** AI-generated draft content (questions, hypotheses, etc.) stored as JSONB */
    aiGeneratedContent: jsonb("ai_generated_content").$type<Record<string, unknown>>(),
    /** Free-text notes or findings entered by the PM */
    findings: text("findings"),
    /** True when aiGeneratedContent was produced by Claude */
    aiGenerated: boolean("ai_generated").notNull().default(false),
    /**
     * When set, this person “owns” the activity. When null, ownership falls back to
     * `insights.discovery_lead_id` (see Stage 3).
     */
    assigneeId: bigint("assignee_id", { mode: "number" }),
    createdBy: bigint("created_by", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("index_discovery_activities_on_project_id").on(t.projectId),
    index("index_discovery_activities_on_insight_id").on(t.insightId),
    index("index_discovery_activities_on_status").on(t.status),
    index("index_discovery_activities_on_assignee_id").on(t.assigneeId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  projectUsers: many(projectUsers),
  skills: many(skills),
  reportingRequests: many(reportingRequests),
}));

export const teamsRelations = relations(teams, ({ one }) => ({
  project: one(projects, { fields: [teams.projectId], references: [projects.id] }),
}));

export const reportingRequestsRelations = relations(reportingRequests, ({ one }) => ({
  project: one(projects, { fields: [reportingRequests.projectId], references: [projects.id] }),
  user: one(users, { fields: [reportingRequests.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  projectUsers: many(projectUsers),
  integrations: many(integrations),
  feedbacks: many(feedbacks),
  teams: many(teams),
  reportingRequests: many(reportingRequests),
  pinnedReportCharts: many(pinnedReportCharts),
}));

/**
 * ai_suggestions — polymorphic audit log for every AI-drafted artifact across the app.
 *
 * Lets us A/B prompts, tune confidence thresholds, replay failures, and rate-limit per project.
 * Payload is versioned (`payload.v`) so the shape can evolve without a migration.
 *
 * `target_table` + `target_id` is a polymorphic pointer — null when the suggestion is
 * still draft-only (e.g. a "Draft from feedback themes" preview the user has not saved yet).
 */
export const aiSuggestions = pgTable(
  "ai_suggestions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    /** Stable string key — e.g. "spec_draft", "insight_draft", "strategy_draft", "activity_draft", "tag_propose". */
    kind: varchar("kind", { length: 64 }).notNull(),
    /** Polymorphic pointer: e.g. "specs"/"insights"/"feedbacks". Null when not yet bound to a row. */
    targetTable: varchar("target_table", { length: 64 }),
    targetId: bigint("target_id", { mode: "number" }),
    /** Versioned suggestion content: `{ v: 1, draft: {...}, sources: [...] }`. */
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    confidence: doublePrecision("confidence"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: bigint("accepted_by", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("index_ai_suggestions_on_project_id").on(t.projectId),
    index("index_ai_suggestions_on_kind").on(t.kind),
    index("index_ai_suggestions_on_target").on(t.targetTable, t.targetId),
  ],
);

/** Pending invitations for users who don't have accounts yet. Converted to projectUsers on signup. */
export const projectInvitations = pgTable(
  "project_invitations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    invitedById: bigint("invited_by_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_project_invitations_on_project_id_and_email").on(t.projectId, t.email),
    index("index_project_invitations_on_email").on(t.email),
  ],
);

export const projectInvitationsRelations = relations(projectInvitations, ({ one }) => ({
  project: one(projects, { fields: [projectInvitations.projectId], references: [projects.id] }),
  invitedBy: one(users, { fields: [projectInvitations.invitedById], references: [users.id] }),
}));

export const projectUsersRelations = relations(projectUsers, ({ one }) => ({
  project: one(projects, { fields: [projectUsers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectUsers.userId], references: [users.id] }),
}));

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  project: one(projects, { fields: [integrations.projectId], references: [projects.id] }),
  ideaPullRequests: many(ideaPullRequests),
  repoAnalyses: many(repoAnalyses),
}));

export const feedbacksRelations = relations(feedbacks, ({ one, many }) => ({
  project: one(projects, { fields: [feedbacks.projectId], references: [projects.id] }),
  feedbackInsights: many(feedbackInsights),
}));

export const specsRelations = relations(specs, ({ one, many }) => ({
  project: one(projects, { fields: [specs.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [specs.createdBy], references: [users.id] }),
  specInsights: many(specInsights),
}));

export const specInsightsRelations = relations(specInsights, ({ one }) => ({
  spec: one(specs, { fields: [specInsights.specId], references: [specs.id] }),
  insight: one(insights, { fields: [specInsights.insightId], references: [insights.id] }),
}));

export const pinnedReportChartsRelations = relations(pinnedReportCharts, ({ one }) => ({
  project: one(projects, { fields: [pinnedReportCharts.projectId], references: [projects.id] }),
  createdByUser: one(users, { fields: [pinnedReportCharts.createdBy], references: [users.id] }),
}));

/**
 * tags / feedback_tags — Cross-cut D auto-tagging.
 * `feedback_tags.source` is "human" (manual) or "ai" (proposed by Claude — pending acceptance).
 */
export const tags = pgTable(
  "tags",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    projectId: bigint("project_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    color: varchar("color", { length: 32 }),
    createdBy: bigint("created_by", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_tags_on_project_id_and_name").on(t.projectId, t.name),
    index("index_tags_on_project_id").on(t.projectId),
  ],
);

export const feedbackTags = pgTable(
  "feedback_tags",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    feedbackId: bigint("feedback_id", { mode: "number" }).notNull(),
    tagId: bigint("tag_id", { mode: "number" }).notNull(),
    source: varchar("source", { length: 16 }).notNull().default("human"),
    confidence: doublePrecision("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex("index_feedback_tags_on_feedback_id_and_tag_id").on(t.feedbackId, t.tagId),
    index("index_feedback_tags_on_tag_id").on(t.tagId),
  ],
);
