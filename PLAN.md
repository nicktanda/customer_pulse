# Customer Pulse - Project Plan

## Overview

Customer Pulse is a Rails 8 feedback aggregation and AI-powered insights platform that collects customer feedback from multiple sources, processes it with Claude AI, and generates actionable insights with automated daily email digests.

**Tech Stack:**
- Framework: Rails 8.0 with PostgreSQL
- Background Jobs: Sidekiq + Redis with cron scheduling (sidekiq-cron)
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- UI: Tailwind CSS + Hotwire (Turbo/Stimulus)
- Auth: Devise with role-based access
- Encryption: Lockbox for credentials
- Pagination: Pagy
- Email: ActionMailer with Sidekiq

---

## Implemented Features

---

## 1. Data Models

### User
**File:** `app/models/user.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| email | string | Devise-managed login |
| encrypted_password | string | Devise-managed |
| name | string | Display name |
| role | integer (enum) | `viewer: 0`, `admin: 1` |

**Validations:** name required

**Methods:**
- `admin?` - Returns true if user has admin role

---

### Feedback
**File:** `app/models/feedback.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| source | integer (enum) | Origin of feedback |
| source_external_id | string | External system ID for deduplication |
| title | string | Feedback title |
| content | text | Full feedback text |
| author_name | string | Submitter name |
| author_email | string | Submitter email |
| category | integer (enum) | AI-classified category |
| priority | integer (enum) | AI-assigned priority |
| status | integer (enum) | Processing status |
| ai_summary | text | AI-generated summary |
| ai_confidence_score | float | AI confidence (0.0-1.0) |
| ai_processed_at | datetime | When AI processing completed |
| manually_reviewed | boolean | Human review flag |
| raw_data | jsonb | Original webhook payload |
| insight_processed_at | datetime | When insight discovery ran |

**Enums:**
```ruby
source: { linear: 0, google_forms: 1, slack: 2, custom: 3, gong: 4, excel_online: 5, jira: 6 }
category: { uncategorized: 0, bug: 1, feature_request: 2, complaint: 3 }
priority: { unset: 0, p1: 1, p2: 2, p3: 3, p4: 4 }
status: { new_feedback: 0, triaged: 1, in_progress: 2, resolved: 3, archived: 4 }
```

**Scopes:**
- `unprocessed` - ai_processed_at is nil
- `processed` - ai_processed_at is present
- `needs_review` - manually_reviewed is false
- `high_priority` - p1 or p2
- `recent` - ordered by created_at DESC
- `in_period(start, end)` - created within date range
- `insight_unprocessed` - insight_processed_at is nil
- `ready_for_insights` - processed AND insight_unprocessed

**Associations:**
- `has_many :feedback_insights, dependent: :destroy`
- `has_many :insights, through: :feedback_insights`

**Indexes:**
- `ai_processed_at`, `category`, `created_at`, `insight_processed_at`, `priority`, `source`, `status`
- Unique: `(source, source_external_id)`

---

### Integration
**File:** `app/models/integration.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Display name |
| source_type | integer (enum) | Integration type |
| credentials_ciphertext | text | Lockbox-encrypted JSON |
| webhook_secret | string | Auto-generated 64-char hex |
| enabled | boolean | Active status (default: true) |
| last_synced_at | datetime | Last successful sync |
| sync_frequency_minutes | integer | Polling interval (default: 15) |

**Enums:**
```ruby
source_type: { linear: 0, google_forms: 1, slack: 2, custom: 3, gong: 4, excel_online: 5, jira: 6 }
```

**Scopes:**
- `enabled` - enabled is true
- `needs_sync` - enabled AND (last_synced_at is null OR older than sync_frequency_minutes)

**Callbacks:**
- `before_create :generate_webhook_secret` - SecureRandom.hex(32)

**Methods:**
- `parsed_credentials` - Parses JSON credentials, returns {} on error
- `update_credentials(hash)` - Updates and saves credentials
- `mark_synced!` - Sets last_synced_at to now
- `sync_due?` - Returns true if sync is needed

---

### Insight
**File:** `app/models/insight.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| title | string | Insight headline |
| description | text | Detailed explanation |
| insight_type | integer (enum) | Category of insight |
| severity | integer (enum) | Impact level |
| confidence_score | integer | AI confidence (0-100) |
| affected_users_count | integer | Estimated user impact |
| feedback_count | integer | Number of related feedbacks |
| status | integer (enum) | Processing status |
| pm_persona_id | bigint | FK to PmPersona |
| evidence | jsonb | Array of supporting quotes |
| metadata | jsonb | Additional data |
| discovered_at | datetime | When insight was found |
| addressed_at | datetime | When marked addressed |

**Enums:**
```ruby
insight_type: { problem: 0, opportunity: 1, trend: 2, risk: 3, user_need: 4 }
severity: { informational: 0, minor: 1, moderate: 2, major: 3, critical: 4 }
status: { discovered: 0, validated: 1, in_progress: 2, addressed: 3, dismissed: 4 }
```

**Scopes:**
- `recent` - ordered by discovered_at DESC
- `by_severity` - ordered by severity DESC
- `actionable` - status is discovered or validated
- `high_severity` - major or critical
- `unthemed` - no associated themes

**Associations:**
- `belongs_to :pm_persona, optional: true`
- `has_many :feedback_insights → feedbacks`
- `has_many :insight_themes → themes`
- `has_many :insight_stakeholders → stakeholder_segments`
- `has_many :idea_insights → ideas`

---

### Idea
**File:** `app/models/idea.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| title | string | Solution title |
| description | text | Detailed solution |
| idea_type | integer (enum) | Category of idea |
| effort_estimate | integer (enum) | Implementation effort |
| impact_estimate | integer (enum) | Expected impact |
| confidence_score | integer | AI confidence (0-100) |
| status | integer (enum) | Workflow status |
| pm_persona_id | bigint | FK to PmPersona |
| rationale | text | Why this solution |
| risks | text | Potential risks |
| implementation_hints | jsonb | Array of steps |
| metadata | jsonb | Additional data |

**Enums:**
```ruby
idea_type: { quick_win: 0, feature: 1, improvement: 2, process_change: 3, investigation: 4 }
effort_estimate: { trivial: 0, small: 1, medium: 2, large: 3, extra_large: 4 }
impact_estimate: { minimal: 0, low: 1, moderate: 2, high: 3, transformational: 4 }
status: { proposed: 0, under_review: 1, approved: 2, in_development: 3, completed: 4, rejected: 5 }
```

**Scopes:**
- `by_impact` - ordered by impact_estimate DESC
- `by_effort` - ordered by effort_estimate ASC
- `quick_wins` - idea_type is quick_win
- `high_impact_low_effort` - high+ impact AND trivial/small effort
- `actionable` - proposed, under_review, or approved

**Methods:**
- `roi_score` - `(impact_value / (effort_value + 1)) * 100`

**Associations:**
- `belongs_to :pm_persona, optional: true`
- `has_many :idea_insights → insights`
- `has_many :idea_relationships → related_ideas`
- `has_many :inverse_idea_relationships` (reverse lookup)

---

### Theme
**File:** `app/models/theme.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Theme name |
| description | text | What this theme represents |
| priority_score | integer | Calculated priority (default: 0) |
| insight_count | integer | Number of related insights |
| affected_users_estimate | integer | Combined user impact |
| metadata | jsonb | Additional data |
| analyzed_at | datetime | Last analysis time |

**Scopes:**
- `by_priority` - ordered by priority_score DESC
- `recent` - ordered by created_at DESC
- `analyzed` - analyzed_at is present

**Methods:**
- `update_insight_count!` - Updates from associations
- `update_priority_score!` - `sum(insights.severity) + (affected_users_estimate / 10)`

**Associations:**
- `has_many :insight_themes → insights`

---

### StakeholderSegment
**File:** `app/models/stakeholder_segment.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Segment name |
| segment_type | integer (enum) | Category of segment |
| description | text | Who this segment is |
| size_estimate | integer | Estimated size |
| engagement_priority | integer | Priority 0-5 |
| engagement_strategy | text | How to engage |
| characteristics | jsonb | Array of traits |
| metadata | jsonb | Additional data |

**Enums:**
```ruby
segment_type: { user_segment: 0, internal_team: 1, customer_tier: 2, use_case_group: 3, geographic_region: 4 }
```

**Scopes:**
- `by_priority` - ordered by engagement_priority DESC
- `by_size` - ordered by size_estimate DESC
- `users` - segment_type is user_segment
- `teams` - segment_type is internal_team

---

### PmPersona
**File:** `app/models/pm_persona.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Persona name |
| archetype | string | One of 5 types |
| description | text | Persona description |
| system_prompt | text | Claude system prompt |
| priorities | jsonb | Array of focus areas |
| active | boolean | Enabled status |

**Archetypes:** `data_driven`, `user_advocate`, `strategist`, `innovator`, `pragmatist`

**Class Methods:**
- `PmPersona.data_driven`, `.user_advocate`, `.strategist`, `.innovator`, `.pragmatist`

---

### PulseReport
**File:** `app/models/pulse_report.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| sent_at | datetime | When email was sent |
| period_start | datetime | Report start time |
| period_end | datetime | Report end time |
| feedback_count | integer | Items in report |
| recipient_count | integer | Emails sent |
| summary | text | Generated summary |

**Methods:**
- `sent?` - sent_at is present
- `mark_sent!(recipient_count:)` - Sets sent timestamp
- `feedbacks` - Returns feedbacks within period

---

### EmailRecipient
**File:** `app/models/email_recipient.rb`

| Attribute | Type | Description |
|-----------|------|-------------|
| email | string | Email address |
| name | string | Display name |
| active | boolean | Receiving emails |

---

### Join Models

#### FeedbackInsight
Links feedbacks to insights with `relevance_score` (float) and `contribution_summary` (text).

#### InsightTheme
Links insights to themes with `relevance_score` (float).
Callbacks update theme counts on create/destroy.

#### IdeaInsight
Links ideas to insights with `address_level` (0-4) and `address_description`.

#### IdeaRelationship
Links ideas to related ideas with `relationship_type` enum:
```ruby
{ complementary: 0, alternative: 1, prerequisite: 2, conflicts: 3, extends: 4 }
```

#### InsightStakeholder
Links insights to stakeholder segments with `impact_level` (0-4) and `impact_description`.

---

## 2. AI Services

### Ai::BaseAnalyzer
**File:** `app/services/ai/base_analyzer.rb`

Base class for all AI services providing:

**Configuration:**
```ruby
DEFAULT_MODEL = "claude-sonnet-4-20250514"
DEFAULT_MAX_TOKENS = 4096
```

**Key Methods:**
```ruby
def initialize(pm_persona: nil)
  @client = Anthropic::Client.new(api_key: ENV["ANTHROPIC_API_KEY"])
  @pm_persona = pm_persona
end

def call_claude(prompt, system_prompt: nil, max_tokens: DEFAULT_MAX_TOKENS)
  # Calls Claude API with error handling
  # Returns parsed JSON or { error: message }
end

def build_system_prompt(base_prompt)
  # Appends pm_persona.system_prompt if present
end

def rate_limit_sleep
  sleep(0.5)  # Rate limiting between API calls
end

def batch_items(items, batch_size: 25)
  items.each_slice(batch_size).to_a
end
```

**Error Handling:**
- Catches `Anthropic::Error` and `JSON::ParserError`
- Returns `{ error: message }` format on failure

---

### Ai::FeedbackProcessor
**File:** `app/services/ai/feedback_processor.rb`

Classifies individual feedback items using Claude AI.

**Methods:**
```ruby
def process(feedback)
  # Returns { success: true/false, result: {...}, error: message }
end

def process_batch(feedbacks)
  # Returns { processed: count, failed: count, errors: [...] }
end
```

**Output Format:**
```json
{
  "category": "bug|feature_request|complaint|uncategorized",
  "priority": "p1|p2|p3|p4",
  "summary": "Brief summary here",
  "confidence": 0.85
}
```

**Side Effects:**
- Updates feedback: `category`, `priority`, `ai_summary`, `ai_confidence_score`, `ai_processed_at`
- On error: Sets `category=uncategorized`, `priority=unset`, `confidence=0.0`

---

### Ai::InsightDiscoverer
**File:** `app/services/ai/insight_discoverer.rb`

Analyzes batches of feedback to discover business insights.

**Configuration:** `BATCH_SIZE = 25`

**Methods:**
```ruby
def discover(feedbacks)
  # Processes in batches of 25
  # Returns { insights: [...], created: count }
end
```

**Output Format:**
```json
{
  "insights": [{
    "title": "Clear insight title",
    "description": "Detailed explanation",
    "insight_type": "problem|opportunity|trend|risk|user_need",
    "severity": "informational|minor|moderate|major|critical",
    "confidence_score": 85,
    "affected_users_estimate": 150,
    "evidence": ["Quote 1", "Quote 2"],
    "feedback_indices": [0, 2, 5]
  }]
}
```

**Side Effects:**
- Creates `Insight` records with pm_persona, status=discovered
- Creates `FeedbackInsight` join records with relevance_score
- Updates `Feedback.insight_processed_at`
- Updates `Insight.feedback_count`

---

### Ai::ThemeIdentifier
**File:** `app/services/ai/theme_identifier.rb`

Groups related insights into themes.

**Methods:**
```ruby
def identify(insights)
  # Returns { themes: [...], created: count }
end

def reanalyze_all
  # Re-analyzes all actionable insights
end
```

**Output Format:**
```json
{
  "themes": [{
    "name": "Theme name",
    "description": "What this theme represents",
    "priority_score": 85,
    "affected_users_estimate": 500,
    "insight_indices": [0, 2, 5, 7]
  }]
}
```

**Side Effects:**
- Creates/updates `Theme` records
- Creates/updates `InsightTheme` join records
- Updates theme: `priority_score`, `affected_users_estimate`, `analyzed_at`

---

### Ai::IdeaGenerator
**File:** `app/services/ai/idea_generator.rb`

Generates solution ideas for insights.

**Methods:**
```ruby
def generate(insight)
  # Returns { ideas: [...], created: count }
end

def generate_batch(insights)
  # Processes multiple insights with rate limiting
end
```

**Output Format:**
```json
{
  "ideas": [{
    "title": "Clear idea title",
    "description": "Detailed solution",
    "idea_type": "quick_win|feature|improvement|process_change|investigation",
    "effort_estimate": "trivial|small|medium|large|extra_large",
    "impact_estimate": "minimal|low|moderate|high|transformational",
    "confidence_score": 75,
    "rationale": "Why this makes sense",
    "risks": "Potential risks",
    "implementation_hints": ["Step 1", "Step 2"]
  }]
}
```

---

### Ai::StakeholderIdentifier
**File:** `app/services/ai/stakeholder_identifier.rb`

Identifies affected user groups for insights.

**Output Format:**
```json
{
  "stakeholders": [{
    "name": "Segment name",
    "segment_type": "user_segment|internal_team|customer_tier|use_case_group|geographic_region",
    "description": "Who this segment is",
    "size_estimate": 500,
    "engagement_priority": 4,
    "engagement_strategy": "How to engage",
    "characteristics": ["Trait 1", "Trait 2"],
    "impact_level": 3,
    "impact_description": "How affected"
  }]
}
```

---

### Ai::IdeaLinker
**File:** `app/services/ai/idea_linker.rb`

Identifies relationships between ideas.

**Output Format:**
```json
{
  "relationships": [{
    "idea_index": 0,
    "related_idea_index": 2,
    "relationship_type": "complementary|alternative|prerequisite|conflicts|extends",
    "explanation": "Why related"
  }]
}
```

---

### Ai::AttackGroupBuilder
**File:** `app/services/ai/attack_group_builder.rb`

Creates coordinated action plans from insights, ideas, and themes.

**Configuration:** `max_tokens: 8192`

**Output Format:**
```json
{
  "attack_groups": [{
    "name": "Initiative name",
    "summary": "Executive summary",
    "insight_indices": [0, 2, 5],
    "idea_indices": [1, 3, 4],
    "theme_indices": [0],
    "combined_effort": "medium",
    "combined_impact": "high",
    "execution_order": [3, 1, 4],
    "dependencies": "Prerequisites",
    "risks": "Key risks",
    "success_metrics": ["Metric 1", "Metric 2"]
  }]
}
```

---

### Insights::Orchestrator
**File:** `app/services/insights/orchestrator.rb`

Coordinates the full insights pipeline.

**Methods:**
```ruby
def initialize(pm_persona: nil)
  @pm_persona = pm_persona || PmPersona.active.first
end

def run_full_pipeline(feedbacks: nil)
  # Defaults to 100 ready_for_insights feedbacks
  # Returns { feedbacks_analyzed, insights_created, themes_created,
  #           ideas_created, stakeholders_identified, relationships_linked }
end

# Individual stage runners:
def run_insight_discovery(feedbacks: nil)
def run_theme_analysis(insights: nil)
def run_idea_generation(insights: nil)
def run_stakeholder_identification(insights: nil)
def run_idea_linking(ideas: nil)
def build_attack_groups(insights: nil, ideas: nil, themes: nil)
```

**Pipeline Sequence:**
1. `Ai::InsightDiscoverer.discover`
2. `Ai::ThemeIdentifier.identify`
3. `Ai::IdeaGenerator.generate_batch`
4. `Ai::StakeholderIdentifier.identify_batch`
5. `Ai::IdeaLinker.link`

---

### PulseGenerator
**File:** `app/services/pulse_generator.rb`

Generates daily digest reports.

**Methods:**
```ruby
def initialize(period_start: 24.hours.ago, period_end: Time.current)

def generate
  # Creates PulseReport with:
  # - Total feedback count
  # - High priority breakdown (p1, p2)
  # - Category breakdown
  # - Source breakdown
  # - AI-generated trends (if >= 5 feedbacks)
end
```

---

## 3. Integration Clients

### Base Pattern
**File:** `app/services/integrations/base_client.rb`

```ruby
class Integrations::BaseClient
  def initialize(integration)
    @integration = integration
  end

  def test_connection
    raise NotImplementedError
  end

  def sync
    raise NotImplementedError
  end

  protected

  def credentials
    @integration.parsed_credentials
  end
end
```

---

### Linear Client
**File:** `app/services/integrations/linear_client.rb`

**API:** GraphQL at `https://api.linear.app/graphql`

**Credentials:**
- `api_key` - Linear API key

**Methods:**
- `test_connection` - Queries viewer info
- `sync` - Fetches last 50 issues, creates Feedback records

**Mapping:**
- Linear priority (1-4) → Feedback priority (p1-p4)
- Labels (bug, feature, enhancement) → Category

---

### Slack Client
**File:** `app/services/integrations/slack_client.rb`

**API:** REST at `https://slack.com/api`

**Credentials:**
- `bot_token` - Slack bot token
- `channels` - Array of channel IDs
- `keywords` - Array of filter keywords (default: feedback, bug, issue, problem, feature, request)

**Methods:**
- `test_connection` - Calls auth.test
- `sync` - Fetches channel history, filters by keywords, creates Feedback

---

### Google Forms/Sheets Client
**File:** `app/services/integrations/google_forms_client.rb`

**API:** Google Sheets API v4

**Credentials:**
- `spreadsheet_id` - Google Sheets ID
- `google_credentials` - Service account JSON (or ENV["GOOGLE_CREDENTIALS_JSON"])
- `sheet_name` - Worksheet name (default: "Form Responses 1")
- `column_mapping` - Column index mapping
- `last_synced_row` - Progress tracking

**Methods:**
- `test_connection` - Gets spreadsheet metadata
- `sync` - Fetches new rows, tracks last_synced_row

---

### Jira Client
**File:** `app/services/integrations/jira_client.rb`

**API:** REST at `{site_url}/rest/api/3`

**Credentials:**
- `site_url` - Jira instance URL
- `email` - Jira user email
- `api_token` - Jira API token
- `project_keys` - Array of projects to sync
- `issue_types` - Array of issue types
- `jql_filter` - Custom JQL override
- `import_comments` - Boolean for comment import

**Auth:** Basic auth with Base64(email:api_token)

**Methods:**
- `test_connection` - GET /rest/api/3/myself
- `sync` - Fetches issues via JQL, optionally imports comments
- `process_webhook(payload)` - Handles jira:issue_created, jira:issue_updated, comment_created

**Helper:** `extract_text_from_adf` - Parses Atlassian Document Format

---

### Excel Online Client
**File:** `app/services/integrations/excel_online_client.rb`

**API:** Microsoft Graph v1.0 at `https://graph.microsoft.com/v1.0`

**Credentials:**
- `tenant_id`, `client_id`, `client_secret` - Azure app credentials
- `access_token`, `refresh_token`, `token_expires_at` - OAuth tokens
- `workbook_id` - Excel file ID
- `worksheet_name` - Sheet name (default: "Sheet1")
- `column_mapping` - Column index mapping
- `last_synced_row` - Progress tracking

**Methods:**
- `test_connection` - Gets worksheet info
- `sync` - Fetches new rows with auto token refresh
- `ensure_valid_token!` - Refreshes token if expired
- `refresh_access_token!` - OAuth token refresh

---

### Gong Client
**File:** `app/services/integrations/gong_client.rb`

**API:** REST at `https://api.gong.io/v2`

**Credentials:**
- `api_key`, `api_secret` - Gong API credentials
- `workspace_id` - Optional workspace filter
- `call_types` - Array of call directions (Inbound, Outbound)
- `minimum_duration` - Minimum call length in seconds (default: 60)

**Auth:** Basic auth with Base64(api_key:api_secret)

**Methods:**
- `test_connection` - Gets users list
- `sync` - Fetches calls, filters by duration/type, imports with transcripts
- `fetch_transcript` - Gets call transcript highlights

---

## 4. Controllers

### DashboardController
**File:** `app/controllers/dashboard_controller.rb`

**Auth:** `authenticate_user!`

**Actions:**
- `index` - GET /
  - Sets: `@total_feedback`, `@feedback_by_category/priority/status/source`
  - Sets: `@recent_feedback` (10), `@high_priority_feedback` (5)
  - Sets: `@today_count`, `@week_count`, `@unprocessed_count`
  - Sets: `@latest_pulse_report`

---

### FeedbackController
**File:** `app/controllers/feedback_controller.rb`

**Auth:** `authenticate_user!`

**Actions:**

| Action | Route | Description |
|--------|-------|-------------|
| index | GET /feedback | List with filters (source, category, priority, status, q search) |
| show | GET /feedback/:id | Detail view |
| update | PATCH /feedback/:id | Update status/priority/category |
| override | PATCH /feedback/:id/override | Override AI classification, sets manually_reviewed=true |
| reprocess | POST /feedback/:id/reprocess | Queue ProcessFeedbackJob |
| bulk_update | POST /feedback/bulk_update | Update multiple feedback items |

**Filters:** source, category, priority, status
**Search:** ILIKE on title, content, author_name, author_email

---

### IntegrationsController
**File:** `app/controllers/integrations_controller.rb`

**Auth:** `authenticate_user!`
**Admin Only:** new, create, edit, update, destroy, test_connection, sync_now

**Actions:**

| Action | Route | Description |
|--------|-------|-------------|
| index | GET /integrations | List all integrations |
| show | GET /integrations/:id | Integration detail |
| new | GET /integrations/new | New integration form |
| create | POST /integrations | Create integration |
| edit | GET /integrations/:id/edit | Edit form |
| update | PATCH /integrations/:id | Update integration |
| destroy | DELETE /integrations/:id | Delete integration |
| test_connection | POST /integrations/:id/test_connection | Test API connection |
| sync_now | POST /integrations/:id/sync_now | Trigger manual sync |

---

### Webhook Controllers

#### Webhooks::LinearController
**File:** `app/controllers/webhooks/linear_controller.rb`
**Route:** POST /webhooks/linear

**Verification:** HMAC-SHA256 via Linear-Signature header
**Events:** create, update → process_issue

#### Webhooks::JiraController
**File:** `app/controllers/webhooks/jira_controller.rb`
**Route:** POST /webhooks/jira

**Verification:** HMAC-SHA256 via X-Hub-Signature or X-Atlassian-Webhook-Signature
**Events:** jira:issue_created, jira:issue_updated, comment_created, comment_updated

---

### Api::V1::FeedbackController
**File:** `app/controllers/api/v1/feedback_controller.rb`

**Auth:** API Key via X-API-Key header (finds Integration with custom source_type)

**Actions:**
- `create` - POST /api/v1/feedback
  - Params: title, content, author_name, author_email, category, priority, external_id, raw_data
  - Response: `{ status: "ok", id: ..., message: "..." }`

---

### Other Controllers

| Controller | Purpose |
|------------|---------|
| EmailRecipientsController | CRUD for pulse email recipients |
| PulseReportsController | View historical reports, resend emails |
| SettingsController | Application configuration |

---

## 5. Background Jobs

### Job Schedule
**File:** `config/sidekiq_schedule.yml`

| Job | Schedule | Queue | Description |
|-----|----------|-------|-------------|
| ProcessFeedbackBatchJob | `0 */4 * * *` | default | AI feedback processing every 4 hours |
| SyncGoogleFormsJob | `*/15 * * * *` | default | Google Forms sync every 15 min |
| SyncJiraJob | `*/15 * * * *` | default | Jira sync every 15 min |
| SyncExcelOnlineJob | `*/15 * * * *` | default | Excel Online sync every 15 min |
| SyncGongJob | `*/30 * * * *` | default | Gong sync every 30 min |
| GenerateInsightsJob | `0 6 * * *` | default | Full insights pipeline at 6 AM |
| WeeklyThemeAnalysisJob | `0 4 * * 0` | default | Theme re-analysis Sundays 4 AM |
| BuildAttackGroupsJob | `0 7 * * 1` | default | Attack group building Mondays 7 AM |
| SendDailyPulseJob | `0 9 * * *` | mailers | Daily pulse email at 9 AM |

### Job Details

#### ProcessFeedbackBatchJob
**File:** `app/jobs/process_feedback_batch_job.rb`
- Processes up to 100 unprocessed feedbacks
- Re-queues with 1 minute delay if more exist

#### GenerateInsightsJob
**File:** `app/jobs/generate_insights_job.rb`
- Runs `Insights::Orchestrator.run_full_pipeline`
- Re-queues with 5 minute delay if more feedbacks exist

#### WeeklyThemeAnalysisJob
**File:** `app/jobs/weekly_theme_analysis_job.rb`
- Analyzes insights from last 7 days
- Updates theme counts and priority scores

#### BuildAttackGroupsJob
**File:** `app/jobs/build_attack_groups_job.rb`
- Gets actionable insights/ideas/themes from last 30 days
- Builds coordinated action plans

#### SendDailyPulseJob
**File:** `app/jobs/send_daily_pulse_job.rb`
- Generates PulseReport for last 24 hours
- Sends via PulseMailer to active recipients

---

## 6. Routes

**File:** `config/routes.rb`

```ruby
# Mounted Services
mount Sidekiq::Web => "/sidekiq"  # Admin only

# Webhooks (no auth)
post "/webhooks/linear", to: "webhooks/linear#create"
post "/webhooks/slack", to: "webhooks/slack#create"
post "/webhooks/jira", to: "webhooks/jira#create"

# API (API key auth)
namespace :api do
  namespace :v1 do
    resources :feedback, only: [:create]
  end
end

# Authenticated routes
root "dashboard#index"

resources :feedback, only: [:index, :show, :update] do
  member do
    patch :override
    post :reprocess
  end
  collection do
    post :bulk_update
  end
end

resources :integrations do
  member do
    post :test_connection
    post :sync_now
  end
end

resources :email_recipients, path: "recipients"
resource :settings, only: [:show, :update]

resources :pulse_reports, only: [:index, :show] do
  member do
    post :resend
  end
end
```

---

## 7. Database Schema

### Tables

```
users
├── email (string, unique)
├── encrypted_password (string)
├── name (string)
├── role (integer, default: 0)
└── Devise fields...

feedbacks
├── source (integer)
├── source_external_id (string)
├── title (string)
├── content (text)
├── author_name, author_email (string)
├── category, priority, status (integer)
├── ai_summary (text)
├── ai_confidence_score (float)
├── ai_processed_at (datetime)
├── manually_reviewed (boolean)
├── raw_data (jsonb)
└── insight_processed_at (datetime)

integrations
├── name (string)
├── source_type (integer)
├── credentials_ciphertext (text)
├── webhook_secret (string)
├── enabled (boolean)
├── last_synced_at (datetime)
└── sync_frequency_minutes (integer)

insights
├── title (string)
├── description (text)
├── insight_type, severity, status (integer)
├── confidence_score, affected_users_count, feedback_count (integer)
├── pm_persona_id (bigint FK)
├── evidence, metadata (jsonb)
├── discovered_at, addressed_at (datetime)

ideas
├── title (string)
├── description (text)
├── idea_type, effort_estimate, impact_estimate, status (integer)
├── confidence_score (integer)
├── pm_persona_id (bigint FK)
├── rationale, risks (text)
├── implementation_hints, metadata (jsonb)

themes
├── name (string)
├── description (text)
├── priority_score, insight_count, affected_users_estimate (integer)
├── metadata (jsonb)
└── analyzed_at (datetime)

stakeholder_segments
├── name (string)
├── segment_type (integer)
├── description, engagement_strategy (text)
├── size_estimate, engagement_priority (integer)
├── characteristics, metadata (jsonb)

pm_personas
├── name, archetype (string)
├── description, system_prompt (text)
├── priorities (jsonb)
└── active (boolean)

pulse_reports
├── sent_at, period_start, period_end (datetime)
├── feedback_count, recipient_count (integer)
└── summary (text)

email_recipients
├── email (string, unique)
├── name (string)
└── active (boolean)

# Join Tables
feedback_insights (feedback_id, insight_id, relevance_score, contribution_summary)
insight_themes (insight_id, theme_id, relevance_score)
idea_insights (idea_id, insight_id, address_level, address_description)
idea_relationships (idea_id, related_idea_id, relationship_type, explanation)
insight_stakeholders (insight_id, stakeholder_segment_id, impact_level, impact_description)
```

---

## 8. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FEEDBACK INGESTION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Linear  │  │  Slack  │  │  Jira   │  │  Gong   │  │ Custom  │           │
│  │Webhooks │  │ Events  │  │Webhooks │  │  Polls  │  │   API   │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       │            │            │            │            │                 │
│       └────────────┴────────────┴────────────┴────────────┘                 │
│                                   │                                          │
│                                   ▼                                          │
│                         ┌─────────────────┐                                  │
│                         │    Feedback     │                                  │
│                         │     Model       │                                  │
│                         └────────┬────────┘                                  │
│                                  │                                           │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                    AI PROCESSING (Every 4 hours)                             │
├──────────────────────────────────┼──────────────────────────────────────────┤
│                                  ▼                                           │
│                    ┌─────────────────────────┐                               │
│                    │  Ai::FeedbackProcessor  │                               │
│                    │   (Claude claude-sonnet-4-20250514)    │                               │
│                    └─────────────┬───────────┘                               │
│                                  │                                           │
│                                  ▼                                           │
│           ┌─────────────────────────────────────────┐                        │
│           │  Updates: category, priority, summary,  │                        │
│           │  confidence_score, ai_processed_at      │                        │
│           └─────────────────────────────────────────┘                        │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                 INSIGHTS PIPELINE (Daily 6 AM)                               │
├──────────────────────────────────┼──────────────────────────────────────────┤
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Insights::Orchestrator                            │    │
│  │  (with PmPersona: data_driven | user_advocate | strategist |        │    │
│  │   innovator | pragmatist)                                            │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│    ┌────────────────────────────┼────────────────────────────────────┐      │
│    │                            │                                    │      │
│    ▼                            ▼                            ▼       │      │
│  ┌────────────┐          ┌────────────┐          ┌────────────┐     │      │
│  │ Stage 1:   │          │ Stage 2:   │          │ Stage 3:   │     │      │
│  │ Insight    │────────▶ │ Theme      │────────▶ │ Idea       │     │      │
│  │ Discovery  │          │ Identifier │          │ Generator  │     │      │
│  └────────────┘          └────────────┘          └────────────┘     │      │
│       │                        │                        │           │      │
│       ▼                        ▼                        ▼           │      │
│   Insights              InsightThemes                 Ideas         │      │
│   FeedbackInsights                                  IdeaInsights    │      │
│                                                                     │      │
│    ┌────────────────────────────┬────────────────────────────────┐  │      │
│    │                            │                                │  │      │
│    ▼                            ▼                                │  │      │
│  ┌────────────┐          ┌────────────┐                         │  │      │
│  │ Stage 4:   │          │ Stage 5:   │                         │  │      │
│  │ Stakeholder│          │ Idea       │                         │  │      │
│  │ Identifier │          │ Linker     │                         │  │      │
│  └────────────┘          └────────────┘                         │  │      │
│       │                        │                                │  │      │
│       ▼                        ▼                                │  │      │
│   StakeholderSegments    IdeaRelationships                      │  │      │
│   InsightStakeholders                                           │  │      │
│                                                                      │      │
└──────────────────────────────────────────────────────────────────────┘      │
                                   │                                           │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                    WEEKLY ANALYSIS                                           │
├──────────────────────────────────┼──────────────────────────────────────────┤
│                                  │                                           │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ Sundays 4 AM: WeeklyThemeAnalysisJob                             │       │
│  │   - Re-analyze all actionable insights                           │       │
│  │   - Update theme counts and priority scores                      │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │ Mondays 7 AM: BuildAttackGroupsJob                               │       │
│  │   - Combine insights, ideas, themes into action plans            │       │
│  │   - Generate execution order and success metrics                 │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼──────────────────────────────────────────┐
│                    DAILY DIGEST (9 AM)                                       │
├──────────────────────────────────┼──────────────────────────────────────────┤
│                                  ▼                                           │
│                    ┌─────────────────────────┐                               │
│                    │     PulseGenerator      │                               │
│                    └─────────────┬───────────┘                               │
│                                  │                                           │
│                                  ▼                                           │
│                    ┌─────────────────────────┐                               │
│                    │      PulseReport        │                               │
│                    │  - Summary stats        │                               │
│                    │  - Category breakdown   │                               │
│                    │  - Priority breakdown   │                               │
│                    │  - AI-generated trends  │                               │
│                    └─────────────┬───────────┘                               │
│                                  │                                           │
│                                  ▼                                           │
│                    ┌─────────────────────────┐                               │
│                    │      PulseMailer        │──────▶ EmailRecipients        │
│                    └─────────────────────────┘                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Security

### Authentication
- **Devise** for user authentication
- Roles: `viewer` (default), `admin`
- Admin-only access: Sidekiq UI, integration management, recipient management

### API Security
- **X-API-Key header** for custom feedback API
- Key stored in Integration credentials
- Secure comparison via `ActiveSupport::SecurityUtils.secure_compare`

### Webhook Security
- **HMAC-SHA256** signature verification
- Linear: `Linear-Signature` header
- Jira: `X-Hub-Signature` or `X-Atlassian-Webhook-Signature` header
- Secrets stored in `integration.webhook_secret`

### Credential Storage
- **Lockbox** encryption for integration credentials
- Master key: `ENV["LOCKBOX_MASTER_KEY"]` (32-byte hex)
- Credentials stored as encrypted JSON in `credentials_ciphertext`

---

## 10. Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgres://user:pass@host:5432/customer_pulse

# Redis
REDIS_URL=redis://localhost:6379/0

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Security
SECRET_KEY_BASE=...
LOCKBOX_MASTER_KEY=...  # 32-byte hex: SecureRandom.hex(32)

# Google (optional)
GOOGLE_CREDENTIALS_JSON='{...}'  # Service account JSON

# Webhook secrets (optional, can be per-integration)
LINEAR_WEBHOOK_SECRET=...
SLACK_SIGNING_SECRET=...
```

### Optional Integration Variables

```bash
# Jira
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_API_TOKEN=...

# Microsoft/Excel Online
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...

# Gong
GONG_API_KEY=...
GONG_API_SECRET=...
```

---

## 11. Development

### Setup

```bash
# Install dependencies
bundle install

# Setup database
rails db:create db:migrate db:seed

# Start development server
bin/dev
```

### Running Background Jobs

```bash
# Start Sidekiq
bundle exec sidekiq

# Or with specific config
bundle exec sidekiq -C config/sidekiq.yml
```

### Testing

```bash
# Run all tests
bundle exec rspec

# Run specific tests
bundle exec rspec spec/models/
bundle exec rspec spec/services/ai/
```

### Console Commands

```ruby
# Process a single feedback
Ai::FeedbackProcessor.new.process(Feedback.find(1))

# Run insights pipeline manually
Insights::Orchestrator.new.run_full_pipeline

# Test an integration
client = Integrations::LinearClient.new(Integration.find(1))
client.test_connection
client.sync

# Generate a pulse report
PulseGenerator.new.generate
```

---

## 12. Agentic AI System (Planned)

### Overview

A comprehensive autonomous AI system that combines:
1. **UX Audit Agent** - AI that explores your product and generates UX feedback
2. **AI Client Personas** - Synthetic customers you can query 24/7 based on real feedback
3. **Agent Swarms** - Coordinated multi-agent systems for feedback collection and synthesis
4. **Improvement Builder Agents** - Agents that implement fixes and link changes to feedback
5. **Feedback-Change Linking** - Full traceability from customer feedback to code changes

---

### 12.1 UX Audit Agent

#### Purpose
An autonomous AI agent that explores your product like a real user, identifying UX issues, accessibility problems, and usability friction points. Findings are merged with customer feedback for a complete picture.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UX AUDIT AGENT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │  Browser Agent  │     │  Vision Agent   │     │ Accessibility   │        │
│  │  (Playwright)   │────▶│  (Claude Vision)│────▶│    Checker      │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│          │                       │                       │                   │
│          ▼                       ▼                       ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    UX Finding Synthesizer                        │        │
│  │  - Categorizes issues (navigation, clarity, performance, a11y)  │        │
│  │  - Assigns severity and affected user segments                   │        │
│  │  - Generates reproduction steps                                  │        │
│  └──────────────────────────────┬──────────────────────────────────┘        │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌─────────────────────────┐                               │
│                    │   Merge with Customer   │                               │
│                    │      Feedback Pool      │                               │
│                    └─────────────────────────┘                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Components

**Browser Agent**
```ruby
# app/services/agents/browser_agent.rb
class Agents::BrowserAgent
  # Uses Playwright/Puppeteer for browser automation
  # Navigates product, captures screenshots, records interactions

  def initialize(product_url:, auth_credentials: nil)
  def explore(strategy: :breadth_first, max_pages: 50)
  def execute_user_journey(journey_definition)
  def capture_page_state  # Screenshots, DOM, network, console
end
```

**Vision Agent**
```ruby
# app/services/agents/vision_agent.rb
class Agents::VisionAgent
  # Uses Claude Vision to analyze screenshots
  # Identifies visual issues, layout problems, confusing UI

  def analyze_screenshot(image_path)
  def compare_states(before:, after:)  # Detect unexpected changes
  def evaluate_visual_hierarchy
  def identify_cognitive_load_issues
end
```

**Accessibility Checker**
```ruby
# app/services/agents/accessibility_checker.rb
class Agents::AccessibilityChecker
  # WCAG 2.1 compliance checking
  # Combines axe-core results with AI analysis

  def audit_page(page_content)
  def check_color_contrast
  def verify_keyboard_navigation
  def validate_screen_reader_compatibility
end
```

#### Data Model

**UxAudit**
| Attribute | Type | Description |
|-----------|------|-------------|
| product_id | bigint | FK to Product |
| status | enum | pending, running, completed, failed |
| strategy | enum | breadth_first, depth_first, user_journey |
| pages_explored | integer | Count of pages visited |
| findings_count | integer | Issues discovered |
| started_at | datetime | Audit start time |
| completed_at | datetime | Audit end time |
| configuration | jsonb | Audit settings |

**UxFinding**
| Attribute | Type | Description |
|-----------|------|-------------|
| ux_audit_id | bigint | FK to UxAudit |
| finding_type | enum | navigation, clarity, performance, accessibility, visual, interaction |
| severity | enum | informational, minor, moderate, major, critical |
| title | string | Finding headline |
| description | text | Detailed explanation |
| page_url | string | Where issue was found |
| screenshot_path | string | Evidence screenshot |
| reproduction_steps | jsonb | Array of steps |
| wcag_criteria | string | WCAG guideline if applicable |
| ai_confidence | float | Agent confidence score |
| merged_feedback_ids | jsonb | Linked customer feedback |

#### Scheduling

```yaml
# config/sidekiq_schedule.yml
ux_audit_job:
  cron: "0 2 * * 0"  # Sundays 2 AM
  class: RunUxAuditJob
  queue: agents
  description: "Weekly automated UX audit"
```

---

### 12.2 AI Client Personas

#### Purpose
Synthetic customer personas built from aggregated real feedback. These AI personas can be queried 24/7 to test ideas, validate solutions, or understand customer perspectives without waiting for real user research.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI CLIENT PERSONA SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PERSONA GENERATION                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Feedback Corpus                                   │    │
│  │  (All customer feedback, segmented by user type, use case, tier)    │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                 Persona Synthesis Agent                              │    │
│  │  - Clusters feedback by behavioral patterns                          │    │
│  │  - Extracts communication style, pain points, goals                 │    │
│  │  - Generates persona profile with system prompt                     │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  "Frustrated│  │  "Power     │  │  "New User  │  │  "Enterprise│        │
│  │   Freelancer│  │   User"     │  │   Sarah"    │  │   Admin"    │        │
│  │   Mike"     │  │             │  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  PERSONA INTERACTION                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Conversation Interface                          │    │
│  │  "Hey Sarah, what do you think about this new onboarding flow?"     │    │
│  │  "Mike, would this feature solve your billing frustration?"         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Components

**Persona Synthesizer**
```ruby
# app/services/agents/persona_synthesizer.rb
class Agents::PersonaSynthesizer
  # Analyzes feedback corpus to generate realistic personas

  def synthesize_personas(feedback_scope:, target_count: 5)
    # 1. Cluster feedback by patterns
    # 2. Identify distinct user archetypes
    # 3. Extract voice, concerns, goals, frustrations
    # 4. Generate persona profile and system prompt
    # 5. Create grounding context from real feedback
  end

  def refresh_persona(client_persona)
    # Update persona with new feedback data
  end
end
```

**Persona Conversation Agent**
```ruby
# app/services/agents/persona_conversation_agent.rb
class Agents::PersonaConversationAgent
  # Enables conversations with AI personas

  def initialize(client_persona)
  def ask(question)          # Ask persona a question
  def test_idea(idea)        # Get persona's reaction to an idea
  def simulate_journey(flow) # Walk persona through a user flow
  def debate(other_persona, topic)  # Two personas discuss
end
```

#### Data Model

**ClientPersona**
| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Persona name ("Frustrated Mike") |
| persona_type | enum | power_user, new_user, churned, enterprise, smb, freelancer |
| avatar_url | string | Generated avatar |
| tagline | string | One-line description |
| background | text | Detailed background story |
| goals | jsonb | Array of user goals |
| frustrations | jsonb | Array of pain points |
| communication_style | text | How they express themselves |
| system_prompt | text | Claude system prompt for embodiment |
| grounding_feedback_ids | jsonb | Source feedback IDs |
| last_synthesized_at | datetime | When persona was updated |
| feedback_count | integer | Number of feedbacks incorporated |
| active | boolean | Available for conversations |

**PersonaConversation**
| Attribute | Type | Description |
|-----------|------|-------------|
| client_persona_id | bigint | FK to ClientPersona |
| user_id | bigint | FK to User who initiated |
| conversation_type | enum | question, idea_test, journey_simulation, debate |
| messages | jsonb | Array of conversation messages |
| summary | text | AI-generated conversation summary |
| insights_generated | jsonb | Key takeaways |
| linked_idea_ids | jsonb | Ideas discussed |

#### API

```ruby
# Chat with a persona
POST /api/v1/personas/:id/chat
{
  "message": "What would make you upgrade to our pro plan?",
  "context": { "discussing_feature": "advanced_analytics" }
}

# Test an idea with multiple personas
POST /api/v1/personas/panel
{
  "persona_ids": [1, 3, 5],
  "idea_id": 42,
  "question": "Would this feature solve your main frustration?"
}

# Simulate user journey
POST /api/v1/personas/:id/simulate_journey
{
  "journey": ["signup", "onboarding", "first_project", "invite_team"]
}
```

---

### 12.3 Agent Swarms

#### Purpose
Coordinated multi-agent systems that work together to collect, synthesize, and act on feedback at scale. Swarms can be deployed for specific missions like "understand why users churn" or "find all accessibility issues."

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT SWARM SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SWARM ORCHESTRATOR                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Mission: "Understand why enterprise users are complaining about    │    │
│  │           performance in Q4"                                        │    │
│  │                                                                      │    │
│  │  Spawns agents → Coordinates work → Synthesizes results             │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────┐                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │  Collector  │         │  Collector  │         │  Collector  │           │
│  │   Agent 1   │         │   Agent 2   │         │   Agent 3   │           │
│  │ (Linear)    │         │ (Slack)     │         │ (Gong)      │           │
│  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘           │
│         │                       │                       │                   │
│         └───────────────────────┼───────────────────────┘                   │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌─────────────────────────┐                               │
│                    │   Synthesis Agents      │                               │
│                    │   (Pattern finding,     │                               │
│                    │    root cause analysis) │                               │
│                    └─────────────┬───────────┘                               │
│                                  │                                           │
│                                  ▼                                           │
│                    ┌─────────────────────────┐                               │
│                    │   Report Generator      │                               │
│                    │   (Findings + Actions)  │                               │
│                    └─────────────────────────┘                               │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Swarm Types

**1. Collection Swarm**
```ruby
# app/services/swarms/collection_swarm.rb
class Swarms::CollectionSwarm
  # Parallel agents collecting from multiple sources

  def initialize(mission:, sources: :all, filters: {})

  def deploy
    # Spawn collector agents for each source
    # Each agent runs in parallel (Sidekiq jobs)
    # Results aggregated as they complete
  end
end
```

**2. Analysis Swarm**
```ruby
# app/services/swarms/analysis_swarm.rb
class Swarms::AnalysisSwarm
  # Multiple analysis agents with different perspectives

  ANALYST_TYPES = [
    :pattern_finder,      # Finds recurring themes
    :root_cause_analyzer, # Digs into why problems exist
    :impact_assessor,     # Evaluates business impact
    :solution_brainstormer, # Generates potential fixes
    :devil_advocate       # Challenges conclusions
  ]

  def analyze(feedback_corpus)
    # Each analyst processes corpus
    # Results debated/synthesized
    # Consensus findings produced
  end
end
```

**3. Improvement Swarm**
```ruby
# app/services/swarms/improvement_swarm.rb
class Swarms::ImprovementSwarm
  # Agents that implement improvements

  BUILDER_TYPES = [
    :code_generator,      # Writes implementation code
    :test_writer,         # Creates test coverage
    :documentation_agent, # Updates docs
    :reviewer_agent,      # Reviews changes
    :deployment_agent     # Handles rollout
  ]

  def implement(idea)
    # Coordinate builders to implement idea
    # Link all changes back to source feedback
  end
end
```

#### Data Model

**Swarm**
| Attribute | Type | Description |
|-----------|------|-------------|
| name | string | Swarm identifier |
| swarm_type | enum | collection, analysis, improvement |
| mission | text | What the swarm is trying to accomplish |
| status | enum | pending, deploying, running, synthesizing, completed, failed |
| configuration | jsonb | Swarm settings |
| agent_count | integer | Number of agents spawned |
| started_at | datetime | Deployment time |
| completed_at | datetime | Completion time |

**SwarmAgent**
| Attribute | Type | Description |
|-----------|------|-------------|
| swarm_id | bigint | FK to Swarm |
| agent_type | string | Type of agent |
| agent_role | string | Specific role in swarm |
| status | enum | pending, running, completed, failed |
| input_data | jsonb | What agent received |
| output_data | jsonb | What agent produced |
| tokens_used | integer | API token consumption |
| started_at | datetime | Agent start time |
| completed_at | datetime | Agent completion time |

**SwarmResult**
| Attribute | Type | Description |
|-----------|------|-------------|
| swarm_id | bigint | FK to Swarm |
| result_type | enum | finding, recommendation, action, report |
| title | string | Result headline |
| content | text | Detailed content |
| confidence | float | Swarm confidence in result |
| supporting_evidence | jsonb | Evidence from agents |
| linked_feedback_ids | jsonb | Source feedback |
| linked_insight_ids | jsonb | Related insights |

---

### 12.4 Improvement Builder Agents

#### Purpose
AI agents that can actually implement improvements in your codebase, create PRs, and link every change back to the customer feedback that inspired it.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      IMPROVEMENT BUILDER SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Idea / Insight                               │    │
│  │  "Users are frustrated by slow search - need to add caching"        │    │
│  │  Linked Feedback: [#123, #456, #789]                                │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Implementation Planner                            │    │
│  │  - Analyzes codebase for relevant files                             │    │
│  │  - Creates implementation plan                                       │    │
│  │  - Identifies risks and dependencies                                 │    │
│  └──────────────────────────────┬──────────────────────────────────────┘    │
│                                 │                                            │
│         ┌───────────────────────┼───────────────────────────────────────┐   │
│         │                       │                       │               │   │
│         ▼                       ▼                       ▼               │   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐       │   │
│  │    Code     │         │    Test     │         │    Docs     │       │   │
│  │  Generator  │         │   Writer    │         │   Updater   │       │   │
│  └──────┬──────┘         └──────┬──────┘         └──────┬──────┘       │   │
│         │                       │                       │               │   │
│         └───────────────────────┼───────────────────────┘               │   │
│                                 │                                        │   │
│                                 ▼                                        │   │
│                    ┌─────────────────────────┐                           │   │
│                    │     Review Agent        │                           │   │
│                    │  - Code review          │                           │   │
│                    │  - Security check       │                           │   │
│                    │  - Performance review   │                           │   │
│                    └─────────────┬───────────┘                           │   │
│                                  │                                       │   │
│                                  ▼                                       │   │
│                    ┌─────────────────────────┐                           │   │
│                    │   PR Creation Agent     │                           │   │
│                    │  - Creates branch       │                           │   │
│                    │  - Commits changes      │                           │   │
│                    │  - Opens PR with links  │                           │   │
│                    └─────────────────────────┘                           │   │
│                                                                          │   │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Components

**Implementation Planner**
```ruby
# app/services/agents/implementation_planner.rb
class Agents::ImplementationPlanner
  # Analyzes idea and creates implementation plan

  def plan(idea)
    # 1. Understand the requirement from idea + feedback
    # 2. Analyze codebase for relevant files
    # 3. Identify what needs to change
    # 4. Estimate effort and risks
    # 5. Create step-by-step plan
  end
end
```

**Code Generator Agent**
```ruby
# app/services/agents/code_generator.rb
class Agents::CodeGenerator
  # Generates implementation code

  def initialize(repo_path:, idea:, plan:)

  def generate
    # For each step in plan:
    # 1. Read relevant files
    # 2. Generate code changes
    # 3. Validate syntax
    # 4. Track feedback linkage
  end

  def apply_changes
    # Write changes to files
    # Stage for commit
  end
end
```

**PR Creation Agent**
```ruby
# app/services/agents/pr_creation_agent.rb
class Agents::PrCreationAgent
  # Creates pull requests with full traceability

  def create_pr(changes:, idea:, feedbacks:)
    # 1. Create feature branch
    # 2. Commit changes with feedback references
    # 3. Generate PR description with:
    #    - Summary of changes
    #    - Linked feedback items
    #    - Linked insights
    #    - Test plan
    # 4. Open PR via GitHub API
  end
end
```

#### Data Model

**ImprovementImplementation**
| Attribute | Type | Description |
|-----------|------|-------------|
| idea_id | bigint | FK to Idea being implemented |
| status | enum | planning, implementing, reviewing, pr_created, merged, deployed |
| implementation_plan | jsonb | Step-by-step plan |
| files_changed | jsonb | Array of file changes |
| branch_name | string | Git branch name |
| pr_url | string | GitHub PR URL |
| pr_number | integer | PR number |
| merged_at | datetime | When PR was merged |
| deployed_at | datetime | When deployed to production |
| linked_feedback_ids | jsonb | All related feedback |
| linked_insight_ids | jsonb | All related insights |

---

### 12.5 Feedback-Change Linking

#### Purpose
Complete traceability from customer feedback through insights, ideas, and into actual code changes. Every line of code can be traced back to the customer need that inspired it.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FEEDBACK-CHANGE LINKING SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TRACEABILITY CHAIN                                                          │
│                                                                              │
│  Feedback ──────▶ Insight ──────▶ Idea ──────▶ Implementation ──────▶ PR    │
│     │                │              │                │                │      │
│     │                │              │                │                │      │
│     ▼                ▼              ▼                ▼                ▼      │
│  ┌──────┐       ┌──────┐       ┌──────┐        ┌──────┐         ┌──────┐   │
│  │ #123 │──────▶│ I-45 │──────▶│ ID-12│───────▶│IMP-7 │────────▶│PR-89 │   │
│  │ #456 │       │      │       │      │        │      │         │      │   │
│  │ #789 │       │      │       │      │        │      │         │      │   │
│  └──────┘       └──────┘       └──────┘        └──────┘         └──────┘   │
│                                                                              │
│  REVERSE LOOKUP                                                              │
│  "Which customer requests led to this PR?"                                  │
│  "Who reported the bug we just fixed?"                                      │
│  "What feedback drove this feature?"                                        │
│                                                                              │
│  NOTIFICATION SYSTEM                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  When PR merged → Notify original feedback authors:                  │    │
│  │  "Your feedback about slow search has been addressed in v2.4.0!"    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Components

**Lineage Tracker**
```ruby
# app/services/feedback_lineage_tracker.rb
class FeedbackLineageTracker
  # Tracks the journey from feedback to code

  def trace_forward(feedback)
    # Returns: insights → ideas → implementations → PRs
  end

  def trace_backward(pr_or_commit)
    # Returns: implementations → ideas → insights → feedbacks
  end

  def get_full_lineage(feedback)
    # Returns complete graph of relationships
  end
end
```

**Customer Notifier**
```ruby
# app/services/customer_notifier.rb
class CustomerNotifier
  # Notifies customers when their feedback is addressed

  def notify_on_merge(pr)
    # 1. Trace back to original feedbacks
    # 2. Get customer emails
    # 3. Send personalized "your feedback was implemented" email
  end

  def generate_changelog_from_feedback(feedbacks)
    # Creates customer-facing changelog from feedback
  end
end
```

#### Data Model

**FeedbackLineage**
| Attribute | Type | Description |
|-----------|------|-------------|
| feedback_id | bigint | Source feedback |
| lineage_type | enum | insight, idea, implementation, pr, commit |
| lineage_id | bigint | ID of linked record |
| lineage_class | string | Class name (polymorphic) |
| relationship | enum | inspired, addressed_by, partially_addressed, mentioned_in |
| created_by | enum | human, agent |

**ChangeNotification**
| Attribute | Type | Description |
|-----------|------|-------------|
| feedback_id | bigint | FK to Feedback |
| implementation_id | bigint | FK to ImprovementImplementation |
| notification_type | enum | pr_created, pr_merged, deployed |
| recipient_email | string | Customer email |
| sent_at | datetime | When sent |
| message | text | Notification content |

#### PR Template with Feedback Links

```markdown
## Summary
Implements Redis caching for search queries to improve performance.

## Customer Feedback Addressed
This change addresses the following customer feedback:

| ID | Source | Summary |
|----|--------|---------|
| #123 | Linear | "Search is painfully slow on large datasets" |
| #456 | Slack | "Our team complained about search taking 10+ seconds" |
| #789 | Gong | Customer call: "Search performance is a blocker for renewal" |

## Related Insights
- **INS-45**: "Enterprise users experiencing search performance degradation"
  - Severity: Major
  - Affected Users: ~500

## Implementation
- Added Redis caching layer for search queries
- Cache TTL: 5 minutes
- Cache invalidation on data changes

## Test Plan
- [ ] Unit tests for cache layer
- [ ] Integration tests for search with cache
- [ ] Load test showing improvement

---
*Generated by Customer Pulse Improvement Agent*
*Feedback → Code traceability maintained*
```

---

### 12.6 Agentic System Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE AGENTIC SYSTEM FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  FEEDBACK SOURCES                          UX AUDIT                          │
│  ┌─────────────────────┐                  ┌─────────────────────┐           │
│  │ Linear, Slack, Jira │                  │  Browser Agent      │           │
│  │ Gong, API, etc.     │                  │  Vision Agent       │           │
│  └──────────┬──────────┘                  │  Accessibility      │           │
│             │                             └──────────┬──────────┘           │
│             │                                        │                       │
│             └────────────────┬───────────────────────┘                       │
│                              │                                               │
│                              ▼                                               │
│             ┌────────────────────────────────────┐                           │
│             │      UNIFIED FEEDBACK POOL         │                           │
│             │  (Customer + AI-discovered issues) │                           │
│             └─────────────────┬──────────────────┘                           │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                       │
│         │                     │                     │                       │
│         ▼                     ▼                     ▼                       │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐                  │
│  │  Analysis   │      │   Client    │      │   Agent     │                  │
│  │  Swarm      │      │  Personas   │      │   Swarms    │                  │
│  │             │      │             │      │             │                  │
│  │ Pattern     │      │ "What do    │      │ Collection  │                  │
│  │ finding     │      │  customers  │      │ Analysis    │                  │
│  │ Root cause  │      │  think?"    │      │ Synthesis   │                  │
│  └──────┬──────┘      └──────┬──────┘      └──────┬──────┘                  │
│         │                    │                    │                          │
│         └────────────────────┼────────────────────┘                          │
│                              │                                               │
│                              ▼                                               │
│             ┌────────────────────────────────────┐                           │
│             │        INSIGHTS + IDEAS            │                           │
│             │  (Validated with AI personas)      │                           │
│             └─────────────────┬──────────────────┘                           │
│                               │                                              │
│                               ▼                                              │
│             ┌────────────────────────────────────┐                           │
│             │     IMPROVEMENT BUILDER AGENTS     │                           │
│             │                                    │                           │
│             │  Planner → Coder → Reviewer → PR   │                           │
│             └─────────────────┬──────────────────┘                           │
│                               │                                              │
│                               ▼                                              │
│             ┌────────────────────────────────────┐                           │
│             │        CODE CHANGES + PRs          │                           │
│             │  (Linked to original feedback)     │                           │
│             └─────────────────┬──────────────────┘                           │
│                               │                                              │
│                               ▼                                              │
│             ┌────────────────────────────────────┐                           │
│             │      CUSTOMER NOTIFICATION         │                           │
│             │  "Your feedback was implemented!"  │                           │
│             └────────────────────────────────────┘                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### 12.7 Implementation Phases

#### Phase A: Foundation
- [ ] Agent base classes and infrastructure
- [ ] Swarm orchestration framework
- [ ] Agent job queue (separate from main Sidekiq)
- [ ] Token usage tracking and budgeting
- [ ] Agent conversation logging

#### Phase B: UX Audit Agent
- [ ] Browser automation integration (Playwright)
- [ ] Vision agent with Claude Vision API
- [ ] Accessibility checker integration
- [ ] UxAudit and UxFinding models
- [ ] Scheduled audit jobs
- [ ] Merge UX findings with customer feedback

#### Phase C: AI Client Personas
- [ ] Persona synthesis from feedback corpus
- [ ] ClientPersona model and generation
- [ ] Conversation interface
- [ ] Idea testing with persona panels
- [ ] Journey simulation
- [ ] Persona refresh/update pipeline

#### Phase D: Agent Swarms
- [ ] Swarm orchestrator
- [ ] Collection swarm implementation
- [ ] Analysis swarm with multiple analysts
- [ ] Swarm result synthesis
- [ ] Mission-based swarm deployment UI

#### Phase E: Improvement Builders
- [ ] Implementation planner agent
- [ ] Code generator with repo access
- [ ] Test writer agent
- [ ] PR creation agent
- [ ] Human review/approval workflow
- [ ] Feedback-to-code lineage tracking

#### Phase F: Closed Loop
- [ ] Full lineage tracking
- [ ] Customer notification on merge
- [ ] Auto-generated changelogs
- [ ] Impact measurement (did fix resolve feedback?)
- [ ] Continuous learning from outcomes

---

## Future Enhancements

### Phase 1: UI/UX Improvements
- [ ] Insights dashboard with visualization charts
- [ ] Theme explorer with drill-down capabilities
- [ ] Idea board with kanban-style workflow
- [ ] Stakeholder segment management UI
- [ ] Attack group visualization and planning view
- [ ] Real-time updates with Turbo Streams
- [ ] Mobile-responsive design improvements

### Phase 2: Advanced Analytics
- [ ] Trend analysis over time (weekly/monthly comparisons)
- [ ] Sentiment tracking and scoring
- [ ] Customer health scoring based on feedback patterns
- [ ] Predictive churn indicators
- [ ] Competitive intelligence tagging
- [ ] Custom dashboards and report builder
- [ ] Export to CSV/PDF

### Phase 3: Workflow Integration
- [ ] Linear issue creation from ideas
- [ ] Jira ticket generation from insights
- [ ] Slack notifications for high-priority feedback
- [ ] Integration with product roadmap tools (ProductBoard, Aha!)
- [ ] Export to Notion/Confluence
- [ ] GitHub issue creation
- [ ] Calendar integration for review meetings

### Phase 4: Collaboration Features
- [ ] Comments on insights/ideas/themes
- [ ] Team assignments and ownership
- [ ] Approval workflows for ideas
- [ ] Custom PM persona creation
- [ ] Shared views and saved filters
- [ ] Activity feed and notifications
- [ ] @mentions and tagging

### Phase 5: Enterprise Features
- [ ] Multi-tenant support with organization isolation
- [ ] SSO integration (SAML, OIDC)
- [ ] Audit logging for compliance
- [ ] Custom report builder with scheduling
- [ ] API rate limiting and usage quotas
- [ ] Webhook delivery guarantees and retry logic
- [ ] Data retention policies
- [ ] Role-based permissions (granular)

---

## Appendix: PM Persona System Prompts

### Data-Driven
Focus on metrics, statistical validation, and quantification. Emphasize measurable outcomes, data patterns, and evidence-based decision making.

### User-Advocate
Focus on user satisfaction, emotional impact, and journey mapping. Emphasize empathy, user stories, and experience optimization.

### Strategist
Focus on long-term vision, competitive positioning, and market trends. Emphasize strategic alignment, market opportunities, and sustainable advantages.

### Innovator
Focus on new approaches, differentiation, and breakthrough opportunities. Emphasize creativity, disruption potential, and novel solutions.

### Pragmatist
Focus on ROI, feasibility, and risk minimization. Emphasize practical implementation, resource constraints, and quick wins.
