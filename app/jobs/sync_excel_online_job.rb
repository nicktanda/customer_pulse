# frozen_string_literal: true

class SyncExcelOnlineJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3

  def perform(integration_id = nil)
    integrations = if integration_id
      Integration.where(id: integration_id, source_type: :excel_online, enabled: true)
    else
      Integration.excel_online.needs_sync
    end

    integrations.each do |integration|
      sync_integration(integration)
    end
  end

  private

  def sync_integration(integration)
    client = Integrations::ExcelOnlineClient.new(integration)
    result = client.sync

    if result[:success]
      Rails.logger.info(
        "SyncExcelOnlineJob: #{integration.name} - Created: #{result[:created]}"
      )
    else
      Rails.logger.error(
        "SyncExcelOnlineJob: #{integration.name} failed - #{result[:message]}"
      )
    end
  rescue => e
    Rails.logger.error(
      "SyncExcelOnlineJob: #{integration.name} exception - #{e.message}"
    )
  end
end
