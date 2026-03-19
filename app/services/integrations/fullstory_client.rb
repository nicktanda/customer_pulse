# frozen_string_literal: true

module Integrations
  class FullstoryClient < BaseClient
    API_URL = "https://api.fullstory.com"

    def test_connection
      response = make_request("/v2/users", method: :get)

      if response.success?
        { success: true, message: "Connected to FullStory" }
      else
        error = parse_error(response)
        { success: false, message: "Connection failed: #{error}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      # Fetch sessions with notes/feedback
      sessions = fetch_sessions
      created_count = 0

      sessions.each do |session|
        result = sync_session(session)
        created_count += 1 if result == :created
      end

      integration.mark_synced!
      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def api_key
      credentials["api_key"]
    end

    def org_id
      credentials["org_id"]
    end

    def make_request(path, method: :get, body: nil)
      url = "#{API_URL}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Basic #{Base64.strict_encode64("#{api_key}:")}"
        req.headers["Content-Type"] = "application/json"
        req.headers["Accept"] = "application/json"
        req.body = body.to_json if body
      end
    end

    def parse_error(response)
      data = JSON.parse(response.body) rescue {}
      data["message"] || data["error"] || response.status
    end

    def fetch_sessions
      response = make_request("/v2/sessions", method: :post, body: {
        filter: "event.type == 'note'",
        limit: 50
      })

      return [] unless response.success?

      data = JSON.parse(response.body)
      data["sessions"] || []
    end

    def sync_session(session)
      session_id = session["sessionId"] || session["id"]
      external_id = "fullstory-#{session_id}"

      return :skipped if Feedback.find_by_external_id("fullstory", external_id)

      Feedback.create!(
        source: :fullstory,
        source_external_id: external_id,
        title: "FullStory Session: #{session_id.to_s.truncate(20)}",
        content: build_session_content(session),
        author_email: session.dig("user", "email"),
        author_name: session.dig("user", "displayName"),
        raw_data: session
      )

      :created
    end

    def build_session_content(session)
      parts = []
      parts << "Session URL: #{session['playbackUrl']}" if session["playbackUrl"]
      parts << "User: #{session.dig('user', 'email')}" if session.dig("user", "email")
      parts << "Duration: #{session['duration']}ms" if session["duration"]
      parts << "Page Count: #{session['pageCount']}" if session["pageCount"]

      if session["notes"]&.any?
        parts << "\nNotes:"
        session["notes"].each { |note| parts << "- #{note['body']}" }
      end

      parts.join("\n")
    end
  end
end
