# frozen_string_literal: true

module Webhooks
  class JiraController < BaseController
    def create
      payload = JSON.parse(request.body.read)
      event_type = payload["webhookEvent"]

      Rails.logger.info("Jira webhook received: #{event_type}")

      integration = find_integration
      unless integration
        render_success
        return
      end

      client = Integrations::JiraClient.new(integration)
      result = client.process_webhook(payload)

      if result[:success]
        render_success
      else
        render_error(result[:message])
      end
    rescue JSON::ParserError => e
      render_error("Invalid JSON: #{e.message}", status: :bad_request)
    rescue => e
      Rails.logger.error("Jira webhook error: #{e.message}")
      render_error(e.message)
    end

    private

    def verify_webhook_signature
      signature = request.headers["X-Hub-Signature"] || request.headers["X-Atlassian-Webhook-Signature"]
      return true if signature.blank?

      integration = find_integration
      return render_error("No Jira integration configured", status: :unauthorized) unless integration
      return true if integration.webhook_secret.blank?

      body = request.body.read
      request.body.rewind

      expected = "sha256=#{OpenSSL::HMAC.hexdigest('SHA256', integration.webhook_secret, body)}"

      unless ActiveSupport::SecurityUtils.secure_compare(signature, expected)
        render_error("Invalid signature", status: :unauthorized)
      end
    end

    def find_integration
      Integration.jira.enabled.first
    end
  end
end
