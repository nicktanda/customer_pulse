# frozen_string_literal: true

module Integrations
  class SentryClient < BaseClient
    API_URL = "https://sentry.io/api/0"

    def test_connection
      response = make_request("/organizations/#{organization_slug}/")

      if response.success?
        data = JSON.parse(response.body)
        { success: true, message: "Connected to organization: #{data['name']}" }
      else
        error = parse_error(response)
        { success: false, message: "Connection failed: #{error}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      projects = fetch_projects
      created_count = 0

      projects.each do |project|
        # Sync issues
        issues = fetch_issues(project["slug"])
        issues.each do |issue|
          result = sync_issue(issue, project)
          created_count += 1 if result == :created
        end

        # Sync user feedback
        feedbacks = fetch_user_feedback(project["slug"])
        feedbacks.each do |feedback|
          result = sync_user_feedback(feedback, project)
          created_count += 1 if result == :created
        end
      end

      integration.mark_synced!
      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def auth_token
      credentials["auth_token"]
    end

    def organization_slug
      credentials["organization_slug"]
    end

    def project_slugs
      slugs = credentials["project_slugs"]
      return nil if slugs.blank?
      slugs.split(",").map(&:strip).reject(&:blank?)
    end

    def make_request(path, method: :get)
      url = "#{API_URL}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Bearer #{auth_token}"
        req.headers["Content-Type"] = "application/json"
        req.headers["Accept"] = "application/json"
      end
    end

    def parse_error(response)
      data = JSON.parse(response.body) rescue {}
      data["detail"] || data["error"] || response.status
    end

    def fetch_projects
      # If specific projects are configured, filter to those
      response = make_request("/organizations/#{organization_slug}/projects/")

      return [] unless response.success?

      data = JSON.parse(response.body)

      if project_slugs.present?
        data.select { |p| project_slugs.include?(p["slug"]) }
      else
        data
      end
    end

    def fetch_issues(project_slug)
      # Fetch recent unresolved issues
      query = if integration.last_synced_at
        "lastSeen:>#{integration.last_synced_at.strftime('%Y-%m-%dT%H:%M:%S')}"
      else
        "lastSeen:>#{7.days.ago.strftime('%Y-%m-%dT%H:%M:%S')}"
      end

      response = make_request(
        "/projects/#{organization_slug}/#{project_slug}/issues/?query=#{CGI.escape(query)}&statsPeriod=14d"
      )

      return [] unless response.success?

      JSON.parse(response.body)
    end

    def fetch_user_feedback(project_slug)
      response = make_request("/projects/#{organization_slug}/#{project_slug}/user-feedback/")

      return [] unless response.success?

      JSON.parse(response.body)
    end

    def sync_issue(issue, project)
      issue_id = issue["id"]
      external_id = "sentry-issue-#{issue_id}"

      return :skipped if Feedback.find_by_external_id("sentry", external_id)

      content = build_issue_content(issue, project)
      priority = map_priority(issue)

      Feedback.create!(
        source: :sentry,
        source_external_id: external_id,
        title: issue["title"] || "Sentry Issue ##{issue_id}",
        content: content,
        author_email: nil,
        author_name: nil,
        priority: priority,
        category: :bug,
        raw_data: issue
      )

      :created
    end

    def sync_user_feedback(feedback, project)
      feedback_id = feedback["id"]
      external_id = "sentry-feedback-#{feedback_id}"

      return :skipped if Feedback.find_by_external_id("sentry", external_id)

      content = build_user_feedback_content(feedback, project)

      Feedback.create!(
        source: :sentry,
        source_external_id: external_id,
        title: "User Feedback: #{feedback['event']['eventID'][0..7]}",
        content: content,
        author_email: feedback["email"],
        author_name: feedback["name"],
        priority: :unset,
        raw_data: feedback
      )

      :created
    end

    def build_issue_content(issue, project)
      parts = []
      parts << "Project: #{project['name']}"
      parts << "Type: #{issue['type']}"
      parts << "Status: #{issue['status']}"
      parts << ""
      parts << issue["culprit"] if issue["culprit"].present?
      parts << ""
      parts << "Events: #{issue['count']}"
      parts << "Users affected: #{issue['userCount']}"

      if issue["metadata"].present?
        if issue["metadata"]["value"].present?
          parts << ""
          parts << "Error: #{issue['metadata']['value']}"
        end
      end

      if issue["shortId"].present?
        parts << ""
        parts << "Short ID: #{issue['shortId']}"
      end

      parts.join("\n")
    end

    def build_user_feedback_content(feedback, project)
      parts = []
      parts << "Project: #{project['name']}"
      parts << ""
      parts << feedback["comments"] if feedback["comments"].present?

      if feedback["event"].present?
        parts << ""
        parts << "Related Event: #{feedback['event']['eventID']}"
      end

      parts.join("\n")
    end

    def map_priority(issue)
      # Map based on user count and event frequency
      user_count = issue["userCount"].to_i
      event_count = issue["count"].to_i

      if user_count >= 100 || event_count >= 1000
        :p1
      elsif user_count >= 50 || event_count >= 500
        :p2
      elsif user_count >= 10 || event_count >= 100
        :p3
      else
        :p4
      end
    end
  end
end
