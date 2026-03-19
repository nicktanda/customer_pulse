# frozen_string_literal: true

module Integrations
  class IntercomClient < BaseClient
    API_URL = "https://api.intercom.io"

    def test_connection
      response = make_request("/me")

      if response.success?
        data = JSON.parse(response.body)
        { success: true, message: "Connected as #{data['name']} (#{data['email']})" }
      else
        error = parse_error(response)
        { success: false, message: "Connection failed: #{error}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      # Fetch conversations with tags indicating feedback
      conversations = fetch_conversations
      created_count = 0

      conversations.each do |conversation|
        result = sync_conversation(conversation)
        created_count += 1 if result == :created
      end

      integration.mark_synced!
      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def access_token
      credentials["access_token"]
    end

    def make_request(path, method: :get, body: nil)
      url = "#{API_URL}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Bearer #{access_token}"
        req.headers["Content-Type"] = "application/json"
        req.headers["Accept"] = "application/json"
        req.headers["Intercom-Version"] = "2.10"
        req.body = body.to_json if body
      end
    end

    def parse_error(response)
      data = JSON.parse(response.body) rescue {}
      data.dig("errors", 0, "message") || data["message"] || response.status
    end

    def fetch_conversations
      response = make_request("/conversations", method: :get)

      return [] unless response.success?

      data = JSON.parse(response.body)
      data["conversations"] || []
    end

    def sync_conversation(conversation)
      conversation_id = conversation["id"]
      external_id = "intercom-#{conversation_id}"

      return :skipped if Feedback.find_by_external_id("intercom", external_id)

      # Fetch full conversation details
      details_response = make_request("/conversations/#{conversation_id}")
      return :skipped unless details_response.success?

      details = JSON.parse(details_response.body)
      content = build_conversation_content(details)

      contact = details.dig("source", "author") || {}

      Feedback.create!(
        source: :intercom,
        source_external_id: external_id,
        title: details.dig("source", "subject") || "Intercom Conversation #{conversation_id}",
        content: content,
        author_email: contact["email"],
        author_name: contact["name"],
        raw_data: details
      )

      :created
    end

    def build_conversation_content(conversation)
      parts = []

      # Add initial message
      if conversation.dig("source", "body")
        parts << conversation.dig("source", "body")
      end

      # Add conversation parts (messages)
      conversation["conversation_parts"]&.dig("conversation_parts")&.each do |part|
        next unless part["body"].present?
        author = part.dig("author", "name") || "Unknown"
        parts << "\n[#{author}]: #{part['body']}"
      end

      parts.join("\n")
    end
  end
end
