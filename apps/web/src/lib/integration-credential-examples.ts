import { IntegrationSourceType } from "@customer-pulse/db/client";

/**
 * Shown on “New integration” and in onboarding so operators can paste valid JSON without reading the schema.
 * Keep keys aligned with what workers / webhooks expect for each `IntegrationSourceType`.
 */
export function credentialJsonExampleForSourceType(sourceType: number): string {
  switch (sourceType) {
    case IntegrationSourceType.linear:
      return '{"api_key":"lin_api_..."}';
    case IntegrationSourceType.slack:
      return '{"bot_token":"xoxb-...","channels":["general"],"keywords":["feedback"]}';
    case IntegrationSourceType.jira:
      return '{"site_url":"https://your.atlassian.net","email":"you@company.com","api_token":"..."}';
    case IntegrationSourceType.github:
      return '{"access_token":"ghp_...","owner":"org","repo":"app","default_branch":"main"}';
    case IntegrationSourceType.google_forms:
      return '{"spreadsheet_id":"…","sheet_name":"Form Responses 1","google_credentials":{…service_account_json…}}';
    case IntegrationSourceType.custom:
      return '{"api_key":"...","base_url":"https://api.example.com"}';
    case IntegrationSourceType.gong:
      return '{"api_key":"...","base_url":"https://api.gong.io"}';
    case IntegrationSourceType.excel_online:
      return '{"tenant_id":"...","client_id":"...","client_secret":"..."}';
    case IntegrationSourceType.logrocket:
    case IntegrationSourceType.fullstory:
    case IntegrationSourceType.intercom:
    case IntegrationSourceType.zendesk:
    case IntegrationSourceType.sentry:
      return '{"api_key":"..."}';
    default:
      return '{"api_key":"..."}';
  }
}
