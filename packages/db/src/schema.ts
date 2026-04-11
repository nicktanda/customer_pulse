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
  },
  (t) => [uniqueIndex("index_projects_on_slug").on(t.slug)],
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("index_reporting_requests_on_project_id_and_created_at").on(t.projectId, t.createdAt),
    index("index_reporting_requests_on_user_id").on(t.userId),
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
  },
  (t) => [index("index_insights_on_project_id").on(t.projectId)],
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
