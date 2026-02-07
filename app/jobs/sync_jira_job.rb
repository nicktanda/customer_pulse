# frozen_string_literal: true

class SyncJiraJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(integration_id = nil)
    integrations = if integration_id
      Integration.where(id: integration_id, source_type: :jira, enabled: true)
    else
      Integration.where(source_type: :jira).needs_sync
    end

    integrations.find_each do |integration|
      sync_integration(integration)
    end
  end

  private

  def sync_integration(integration)
    client = Integrations::JiraClient.new(integration)
    result = client.sync

    if result[:success]
      Rails.logger.info(
        "SyncJiraJob: #{integration.name} - " \
        "Created: #{result[:created]}, Updated: #{result[:updated] || 0}"
      )
    else
      Rails.logger.error(
        "SyncJiraJob: #{integration.name} failed - #{result[:message]}"
      )
    end
  rescue => e
    Rails.logger.error(
      "SyncJiraJob: #{integration.name} exception - #{e.message}"
    )
  end
end
