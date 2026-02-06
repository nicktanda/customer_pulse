class Integration < ApplicationRecord
  # Encrypted credentials using Lockbox
  has_encrypted :credentials

  # Enums
  enum :source_type, { linear: 0, google_forms: 1, slack: 2, custom: 3 }

  # Validations
  validates :name, presence: true
  validates :source_type, presence: true

  # Scopes
  scope :enabled, -> { where(enabled: true) }
  scope :needs_sync, -> {
    enabled.where(
      "last_synced_at IS NULL OR last_synced_at < NOW() - (sync_frequency_minutes || ' minutes')::interval"
    )
  }

  # Generate a webhook secret if not present
  before_create :generate_webhook_secret

  def parsed_credentials
    return {} if credentials.blank?
    JSON.parse(credentials)
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

  private

  def generate_webhook_secret
    self.webhook_secret ||= SecureRandom.hex(32)
  end
end
