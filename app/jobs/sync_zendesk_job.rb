class SyncZendeskJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(integration_id = nil)
    integrations = if integration_id
      Integration.zendesk.enabled.where(id: integration_id)
    else
      Integration.zendesk.enabled.needs_sync
    end

    integrations.each do |integration|
      sync_integration(integration)
    end
  end

  private

  def sync_integration(integration)
    client = Integrations::ZendeskClient.new(integration)
    result = client.sync

    if result[:success]
      Rails.logger.info(
        "SyncZendeskJob: Synced #{integration.name}, created #{result[:created]} items"
      )
    else
      Rails.logger.error(
        "SyncZendeskJob: Failed to sync #{integration.name}: #{result[:message]}"
      )
    end
  rescue => e
    Rails.logger.error("SyncZendeskJob: Error syncing #{integration.name}: #{e.message}")
  end
end
