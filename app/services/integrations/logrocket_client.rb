# frozen_string_literal: true

module Integrations
  class LogrocketClient < BaseClient
    API_URL = "https://api.logrocket.com/v1"

    def test_connection
      response = make_request("/orgs/#{app_id}/apps")

      if response.success?
        { success: true, message: "Connected to LogRocket app: #{app_id}" }
      else
        { success: false, message: "Connection failed: #{response.status}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      # Fetch recent sessions with feedback/issues
      sessions = fetch_sessions_with_feedback
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

    def app_id
      credentials["app_id"]
    end

    def api_key
      credentials["api_key"]
    end

    def make_request(path, method: :get, body: nil)
      url = "#{API_URL}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Bearer #{api_key}"
        req.headers["Content-Type"] = "application/json"
        req.headers["Accept"] = "application/json"
        req.body = body.to_json if body
      end
    end

    def fetch_sessions_with_feedback
      # LogRocket API to fetch sessions - adjust based on actual API
      response = make_request("/orgs/#{app_id}/sessions", method: :get)

      return [] unless response.success?

      data = JSON.parse(response.body)
      data["sessions"] || []
    end

    def sync_session(session)
      session_id = session["id"]
      external_id = "logrocket-#{session_id}"

      return :skipped if Feedback.find_by_external_id("logrocket", external_id)

      # Extract feedback-relevant data from session
      content = build_session_content(session)

      Feedback.create!(
        source: :logrocket,
        source_external_id: external_id,
        title: "LogRocket Session: #{session['userEmail'] || session_id.truncate(20)}",
        content: content,
        author_email: session["userEmail"],
        author_name: session["userName"],
        raw_data: session
      )

      :created
    end

    def build_session_content(session)
      parts = []
      parts << "Session URL: #{session['sessionUrl']}" if session["sessionUrl"]
      parts << "User: #{session['userEmail']}" if session["userEmail"]
      parts << "Duration: #{session['duration']}s" if session["duration"]
      parts << "Errors: #{session['errorCount']}" if session["errorCount"]
      parts << "Rage Clicks: #{session['rageClickCount']}" if session["rageClickCount"]

      if session["notes"]&.any?
        parts << "\nNotes:"
        session["notes"].each { |note| parts << "- #{note}" }
      end

      parts.join("\n")
    end
  end
end
