module Webhooks
  class SlackController < BaseController
    def create
      payload = parse_payload

      # Handle URL verification challenge
      if payload["type"] == "url_verification"
        return render json: { challenge: payload["challenge"] }
      end

      # Handle event callbacks
      if payload["type"] == "event_callback"
        process_event(payload["event"])
      end

      render_success
    rescue JSON::ParserError => e
      render_error("Invalid JSON: #{e.message}", status: :bad_request)
    rescue => e
      Rails.logger.error("Slack webhook error: #{e.message}")
      render_error(e.message)
    end

    private

    def verify_webhook_signature
      timestamp = request.headers["X-Slack-Request-Timestamp"]
      signature = request.headers["X-Slack-Signature"]

      # Skip verification in development/test without signing secret
      signing_secret = ENV["SLACK_SIGNING_SECRET"]
      return true if signing_secret.blank?

      # Check timestamp to prevent replay attacks
      if (Time.now.to_i - timestamp.to_i).abs > 300
        return render_error("Request too old", status: :unauthorized)
      end

      sig_basestring = "v0:#{timestamp}:#{request.body.read}"
      request.body.rewind

      computed_signature = "v0=" + OpenSSL::HMAC.hexdigest(
        "SHA256",
        signing_secret,
        sig_basestring
      )

      unless ActiveSupport::SecurityUtils.secure_compare(signature, computed_signature)
        render_error("Invalid signature", status: :unauthorized)
      end
    end

    def parse_payload
      content_type = request.content_type
      if content_type&.include?("application/json")
        JSON.parse(request.body.read)
      else
        # Handle form-encoded payload (slash commands)
        JSON.parse(params[:payload] || "{}")
      end
    end

    def process_event(event)
      case event["type"]
      when "message"
        process_message(event)
      when "reaction_added"
        process_reaction(event)
      end
    end

    def process_message(event)
      # Skip bot messages
      return if event["bot_id"].present?

      # Check for feedback keywords or emoji
      text = event["text"] || ""
      return unless should_capture_feedback?(text)

      external_id = "#{event["channel"]}-#{event["ts"]}"
      return if Feedback.find_by_external_id("slack", external_id)

      Feedback.create!(
        source: :slack,
        source_external_id: external_id,
        title: text.truncate(100),
        content: text,
        author_name: event["user"],
        raw_data: event
      )
    end

    def process_reaction(event)
      # Capture messages that get :feedback: reaction
      return unless event["reaction"] == "feedback"

      # Would need to fetch the original message via Slack API
      # This is a simplified implementation
      Rails.logger.info("Feedback reaction added to message: #{event["item"]}")
    end

    def should_capture_feedback?(text)
      keywords = %w[feedback bug issue problem feature request suggestion]
      text_lower = text.downcase
      keywords.any? { |keyword| text_lower.include?(keyword) }
    end
  end
end
