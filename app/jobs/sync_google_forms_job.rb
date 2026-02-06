class SyncGoogleFormsJob
  include Sidekiq::Job

  sidekiq_options queue: :default, retry: 3

  def perform(integration_id = nil)
    integrations = if integration_id
      Integration.google_forms.enabled.where(id: integration_id)
    else
      Integration.google_forms.enabled.needs_sync
    end

    integrations.each do |integration|
      sync_integration(integration)
    end
  end

  private

  def sync_integration(integration)
    client = Integrations::GoogleFormsClient.new(integration)
    result = client.sync

    if result[:success]
      Rails.logger.info(
        "SyncGoogleFormsJob: Synced #{integration.name}, created #{result[:created]} items"
      )
    else
      Rails.logger.error(
        "SyncGoogleFormsJob: Failed to sync #{integration.name}: #{result[:message]}"
      )
    end
  rescue => e
    Rails.logger.error("SyncGoogleFormsJob: Error syncing #{integration.name}: #{e.message}")
  end
end
