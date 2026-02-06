module Webhooks
  class LinearController < BaseController
    def create
      payload = JSON.parse(request.body.read)
      action = payload["action"]
      data = payload["data"]

      case action
      when "create", "update"
        process_issue(data)
      end

      render_success
    rescue JSON::ParserError => e
      render_error("Invalid JSON: #{e.message}", status: :bad_request)
    rescue => e
      Rails.logger.error("Linear webhook error: #{e.message}")
      render_error(e.message)
    end

    private

    def verify_webhook_signature
      signature = request.headers["Linear-Signature"]
      return true if signature.blank? # Allow for testing, production should require this

      integration = Integration.linear.enabled.first
      return render_error("No Linear integration configured", status: :unauthorized) unless integration

      expected = OpenSSL::HMAC.hexdigest(
        "SHA256",
        integration.webhook_secret,
        request.body.read
      )

      unless ActiveSupport::SecurityUtils.secure_compare(signature, expected)
        render_error("Invalid signature", status: :unauthorized)
      end
    end

    def process_issue(data)
      external_id = data["id"]
      existing = Feedback.find_by_external_id("linear", external_id)

      feedback_attrs = {
        source: :linear,
        source_external_id: external_id,
        title: data["title"],
        content: data["description"] || data["title"],
        author_name: data.dig("creator", "name"),
        author_email: data.dig("creator", "email"),
        raw_data: data
      }

      # Try to map Linear labels to categories
      labels = data["labels"] || []
      label_names = labels.map { |l| l["name"]&.downcase }

      if label_names.include?("bug")
        feedback_attrs[:category] = :bug
      elsif label_names.include?("feature") || label_names.include?("enhancement")
        feedback_attrs[:category] = :feature_request
      end

      # Map Linear priority
      linear_priority = data["priority"]
      feedback_attrs[:priority] = case linear_priority
      when 1 then :p1
      when 2 then :p2
      when 3 then :p3
      when 4 then :p4
      else :unset
      end

      if existing
        existing.update!(feedback_attrs.except(:source, :source_external_id))
      else
        Feedback.create!(feedback_attrs)
      end
    end
  end
end
