class Integration < ApplicationRecord
  # Encrypted credentials using Lockbox
  has_encrypted :credentials

  # Associations
  belongs_to :project
  has_many :repo_analyses, dependent: :destroy
  has_many :idea_pull_requests, dependent: :destroy

  # Enums
  enum :source_type, { linear: 0, google_forms: 1, slack: 2, custom: 3, gong: 4, excel_online: 5, jira: 6, logrocket: 7, fullstory: 8, intercom: 9, zendesk: 10, sentry: 11, github: 12, anthropic: 13 }

  # Validations
  validates :name, presence: true
  validates :source_type, presence: true

  # Scopes
  scope :enabled, -> { where(enabled: true) }

  # Database-agnostic version of needs_sync (works with both PostgreSQL and SQLite)
  def self.needs_sync
    enabled.select(&:sync_due?)
  end

  # Generate a webhook secret if not present
  before_create :generate_webhook_secret

  def parsed_credentials
    raw = credentials
    return {} if raw.blank?
    JSON.parse(raw)
  rescue Lockbox::DecryptionError
    # Credentials were encrypted with a different key (e.g. LOCKBOX_MASTER_KEY changed or wasn't set).
    # Clear the corrupted ciphertext so we don't keep failing; user can re-enter credentials.
    update_column(:credentials_ciphertext, nil)
    {}
  rescue JSON::ParserError
    {}
  end

  def update_credentials(creds_hash)
    self.credentials = creds_hash.to_json
  end

  def mark_synced!
    update!(last_synced_at: Time.current)
  end

  def sync_due?
    return true if last_synced_at.nil?
    last_synced_at < sync_frequency_minutes.minutes.ago
  end

  # Get Anthropic API key from database (for project) or fall back to ENV
  def self.anthropic_api_key(project: nil)
    if project
      integration = project.integrations.find_by(source_type: :anthropic, enabled: true)
      key = integration&.parsed_credentials&.dig("api_key")
      return key if key.present?
    end

    ENV["ANTHROPIC_API_KEY"]
  end

  private

  def generate_webhook_secret
    self.webhook_secret ||= SecureRandom.hex(32)
  end
end
