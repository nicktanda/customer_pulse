# frozen_string_literal: true

module Integrations
  class ZendeskClient < BaseClient
    def test_connection
      response = make_request("/api/v2/users/me.json")

      if response.success?
        data = JSON.parse(response.body)
        user = data["user"]
        { success: true, message: "Connected as #{user['name']} (#{user['email']})" }
      else
        error = parse_error(response)
        { success: false, message: "Connection failed: #{error}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      # Fetch recent tickets
      tickets = fetch_tickets
      created_count = 0

      tickets.each do |ticket|
        result = sync_ticket(ticket)
        created_count += 1 if result == :created
      end

      integration.mark_synced!
      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def subdomain
      credentials["subdomain"]
    end

    def email
      credentials["email"]
    end

    def api_token
      credentials["api_token"]
    end

    def api_url
      "https://#{subdomain}.zendesk.com"
    end

    def make_request(path, method: :get, body: nil)
      url = "#{api_url}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Basic #{Base64.strict_encode64("#{email}/token:#{api_token}")}"
        req.headers["Content-Type"] = "application/json"
        req.headers["Accept"] = "application/json"
        req.body = body.to_json if body
      end
    end

    def parse_error(response)
      data = JSON.parse(response.body) rescue {}
      data["error"] || data.dig("error", "message") || response.status
    end

    def fetch_tickets
      # Fetch tickets updated in the last sync period
      query = if integration.last_synced_at
        "type:ticket updated>#{integration.last_synced_at.strftime('%Y-%m-%d')}"
      else
        "type:ticket created>#{7.days.ago.strftime('%Y-%m-%d')}"
      end

      response = make_request("/api/v2/search.json?query=#{CGI.escape(query)}")

      return [] unless response.success?

      data = JSON.parse(response.body)
      data["results"] || []
    end

    def sync_ticket(ticket)
      ticket_id = ticket["id"]
      external_id = "zendesk-#{ticket_id}"

      return :skipped if Feedback.find_by_external_id("zendesk", external_id)

      # Fetch ticket comments for full content
      comments_response = make_request("/api/v2/tickets/#{ticket_id}/comments.json")
      comments = if comments_response.success?
        JSON.parse(comments_response.body)["comments"] || []
      else
        []
      end

      content = build_ticket_content(ticket, comments)
      priority = map_priority(ticket["priority"])

      Feedback.create!(
        source: :zendesk,
        source_external_id: external_id,
        title: ticket["subject"] || "Zendesk Ticket ##{ticket_id}",
        content: content,
        author_email: ticket.dig("via", "source", "from", "address"),
        author_name: ticket.dig("via", "source", "from", "name"),
        priority: priority,
        raw_data: ticket
      )

      :created
    end

    def build_ticket_content(ticket, comments)
      parts = []
      parts << ticket["description"] if ticket["description"].present?

      if ticket["tags"]&.any?
        parts << "\nTags: #{ticket['tags'].join(', ')}"
      end

      if comments.length > 1
        parts << "\n--- Comments ---"
        comments[1..].each do |comment|
          author = comment.dig("author", "name") || "Unknown"
          parts << "\n[#{author}]: #{comment['body']}"
        end
      end

      parts.join("\n")
    end

    def map_priority(zendesk_priority)
      case zendesk_priority
      when "urgent" then :p1
      when "high" then :p2
      when "normal" then :p3
      when "low" then :p4
      else :unset
      end
    end
  end
end
