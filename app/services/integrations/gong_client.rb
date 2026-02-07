# frozen_string_literal: true

module Integrations
  class GongClient < BaseClient
    API_BASE_URL = "https://api.gong.io/v2"

    def test_connection
      response = make_request("/users")

      if response.success?
        data = JSON.parse(response.body)
        user_count = data["users"]&.count || 0
        { success: true, message: "Connected to Gong workspace (#{user_count} users)" }
      else
        { success: false, message: "Connection failed: #{response.status}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      calls = fetch_calls
      created_count = 0

      calls.each do |call|
        next unless should_import_call?(call)

        result = process_call(call)
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

    def api_secret
      credentials["api_secret"]
    end

    def workspace_id
      credentials["workspace_id"]
    end

    def call_types
      credentials["call_types"] || []
    end

    def minimum_duration
      (credentials["minimum_duration"] || 60).to_i
    end

    def make_request(path, method: :get, body: nil)
      url = "#{API_BASE_URL}#{path}"
      auth = Base64.strict_encode64("#{api_key}:#{api_secret}")

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Basic #{auth}"
        req.headers["Content-Type"] = "application/json"
        req.body = body.to_json if body
      end
    end

    def fetch_calls
      from_time = if integration.last_synced_at
        integration.last_synced_at.iso8601
      else
        7.days.ago.iso8601
      end

      body = {
        filter: {
          fromDateTime: from_time,
          toDateTime: Time.current.iso8601
        },
        contentSelector: {
          exposedFields: {
            parties: true,
            content: {
              pointsOfInterest: true,
              trackers: true,
              topics: true
            }
          }
        }
      }

      if workspace_id.present?
        body[:filter][:workspaceId] = workspace_id
      end

      response = make_request("/calls/extensive", method: :post, body: body)

      return [] unless response.success?

      data = JSON.parse(response.body)
      data["calls"] || []
    end

    def should_import_call?(call)
      duration = call["metaData"]["duration"].to_i
      return false if duration < minimum_duration

      if call_types.any?
        call_type = call["metaData"]["direction"]
        return false unless call_types.include?(call_type)
      end

      true
    end

    def process_call(call)
      call_id = call["metaData"]["id"]
      external_id = "gong-#{call_id}"

      existing = Feedback.find_by_external_id("gong", external_id)
      return :exists if existing

      content = build_call_content(call)

      Feedback.create!(
        source: :gong,
        source_external_id: external_id,
        title: build_call_title(call),
        content: content,
        author_name: extract_participants(call),
        raw_data: call
      )

      :created
    end

    def build_call_title(call)
      meta = call["metaData"]
      title = meta["title"] || "Gong Call"
      date = Time.parse(meta["started"]).strftime("%Y-%m-%d") rescue "Unknown date"
      "#{title} (#{date})"
    end

    def build_call_content(call)
      parts = []

      meta = call["metaData"]
      parts << "Duration: #{format_duration(meta['duration'].to_i)}"
      parts << "Direction: #{meta['direction']}" if meta["direction"]

      if call["content"].present?
        content = call["content"]

        if content["topics"]&.any?
          parts << "\nTopics Discussed:"
          content["topics"].each do |topic|
            parts << "- #{topic['name']}"
          end
        end

        if content["pointsOfInterest"]&.any?
          parts << "\nKey Moments:"
          content["pointsOfInterest"].each do |poi|
            parts << "- [#{poi['type']}] #{poi['text']}" if poi["text"]
          end
        end

        if content["trackers"]&.any?
          parts << "\nTracked Items:"
          content["trackers"].each do |tracker|
            parts << "- #{tracker['name']}: #{tracker['count']} mentions"
          end
        end
      end

      transcript = fetch_transcript(meta["id"])
      if transcript.present?
        parts << "\nTranscript Highlights:"
        parts << transcript
      end

      parts.join("\n")
    end

    def fetch_transcript(call_id)
      response = make_request("/calls/#{call_id}/transcript")

      return nil unless response.success?

      data = JSON.parse(response.body)
      sentences = data["transcript"]&.first(20) || []

      sentences.map do |s|
        speaker = s["speakerName"] || "Unknown"
        text = s["sentences"]&.map { |sent| sent["text"] }&.join(" ")
        "#{speaker}: #{text}"
      end.join("\n")
    rescue
      nil
    end

    def extract_participants(call)
      parties = call["parties"] || []
      external = parties.select { |p| p["affiliation"] == "External" }

      if external.any?
        external.map { |p| p["name"] || p["emailAddress"] }.compact.first(3).join(", ")
      else
        parties.map { |p| p["name"] || p["emailAddress"] }.compact.first(2).join(", ")
      end
    end

    def format_duration(seconds)
      minutes = seconds / 60
      remaining_seconds = seconds % 60
      "#{minutes}m #{remaining_seconds}s"
    end
  end
end
