module Integrations
  class SlackClient < BaseClient
    API_URL = "https://slack.com/api"

    def test_connection
      response = api_request("auth.test")

      if response["ok"]
        { success: true, message: "Connected to workspace: #{response['team']}" }
      else
        { success: false, message: response["error"] || "Unknown error" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      # Slack primarily uses webhooks/events API
      # This method can be used to fetch recent messages from configured channels
      channels = credentials["channels"] || []
      created_count = 0

      channels.each do |channel_id|
        messages = fetch_channel_history(channel_id)

        messages.each do |message|
          next if message["bot_id"].present?
          next unless should_capture_message?(message)

          external_id = "#{channel_id}-#{message['ts']}"
          next if Feedback.find_by_external_id("slack", external_id)

          text = message["text"] || ""
          Feedback.create!(
            source: :slack,
            source_external_id: external_id,
            title: text.truncate(100),
            content: text,
            author_name: message["user"],
            raw_data: message
          )
          created_count += 1
        end
      end

      integration.mark_synced!
      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def api_request(method, params = {})
      response = Faraday.post("#{API_URL}/#{method}") do |req|
        req.headers["Authorization"] = "Bearer #{credentials['bot_token']}"
        req.headers["Content-Type"] = "application/json"
        req.body = params.to_json
      end

      JSON.parse(response.body)
    end

    def fetch_channel_history(channel_id)
      oldest = integration.last_synced_at&.to_i || 24.hours.ago.to_i

      response = api_request("conversations.history", {
        channel: channel_id,
        oldest: oldest.to_s,
        limit: 100
      })

      response["ok"] ? response["messages"] : []
    end

    def should_capture_message?(message)
      text = message["text"]&.downcase || ""
      keywords = credentials["keywords"] || %w[feedback bug issue problem feature request]
      keywords.any? { |keyword| text.include?(keyword.downcase) }
    end
  end
end
