class SyncIntercomJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(integration_id = nil)
    integrations = if integration_id
      Integration.intercom.enabled.where(id: integration_id)
    else
      Integration.intercom.needs_sync
    end

    integrations.each do |integration|
      sync_integration(integration)
    end
  end

  private

  def sync_integration(integration)
    client = Integrations::IntercomClient.new(integration)
    result = client.sync

    if result[:success]
      Rails.logger.info(
        "SyncIntercomJob: Synced #{integration.name}, created #{result[:created]} items"
      )
    else
      Rails.logger.error(
        "SyncIntercomJob: Failed to sync #{integration.name}: #{result[:message]}"
      )
    end
  rescue => e
    Rails.logger.error("SyncIntercomJob: Error syncing #{integration.name}: #{e.message}")
  end
end
