# frozen_string_literal: true

module Integrations
  class JiraClient < BaseClient
    PRIORITY_MAPPING = {
      "Highest" => :p1,
      "High" => :p2,
      "Medium" => :p3,
      "Low" => :p4,
      "Lowest" => :p4
    }.freeze

    def test_connection
      response = make_request("/rest/api/3/myself")

      if response.success?
        data = JSON.parse(response.body)
        { success: true, message: "Connected as #{data['displayName']} (#{data['emailAddress']})" }
      else
        { success: false, message: "Connection failed: #{response.status}" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      issues = fetch_issues
      created_count = 0
      updated_count = 0

      issues.each do |issue|
        result = sync_issue(issue)
        case result
        when :created then created_count += 1
        when :updated then updated_count += 1
        end
      end

      if import_comments?
        issues.each do |issue|
          sync_comments(issue)
        end
      end

      integration.mark_synced!
      { success: true, created: created_count, updated: updated_count }
    rescue => e
      { success: false, message: e.message }
    end

    def process_webhook(payload)
      event_type = payload["webhookEvent"]

      case event_type
      when "jira:issue_created", "jira:issue_updated"
        sync_issue(payload["issue"])
      when "comment_created", "comment_updated"
        sync_comment_from_webhook(payload)
      else
        Rails.logger.info("Jira: Unhandled webhook event type: #{event_type}")
      end

      { success: true }
    rescue => e
      Rails.logger.error("Jira webhook processing failed: #{e.message}")
      { success: false, message: e.message }
    end

    private

    def api_url
      "#{site_url}/rest/api/3"
    end

    def site_url
      credentials["site_url"]
    end

    def email
      credentials["email"]
    end

    def api_token
      credentials["api_token"]
    end

    def project_keys
      credentials["project_keys"] || []
    end

    def issue_types
      credentials["issue_types"] || []
    end

    def jql_filter
      credentials["jql_filter"]
    end

    def import_comments?
      credentials["import_comments"] == true
    end

    def make_request(path, method: :get, body: nil)
      url = path.start_with?("http") ? path : "#{site_url}#{path}"

      Faraday.send(method, url) do |req|
        req.headers["Authorization"] = "Basic #{Base64.strict_encode64("#{email}:#{api_token}")}"
        req.headers["Content-Type"] = "application/json"
        req.headers["Accept"] = "application/json"
        req.body = body.to_json if body
      end
    end

    def fetch_issues
      jql = build_jql
      response = make_request("/rest/api/3/search?jql=#{CGI.escape(jql)}&maxResults=100")

      return [] unless response.success?

      data = JSON.parse(response.body)
      data["issues"] || []
    end

    def build_jql
      parts = []

      if jql_filter.present?
        return jql_filter
      end

      if project_keys.any?
        parts << "project IN (#{project_keys.map { |k| "'#{k}'" }.join(', ')})"
      end

      if issue_types.any?
        parts << "issuetype IN (#{issue_types.map { |t| "'#{t}'" }.join(', ')})"
      end

      if integration.last_synced_at
        parts << "updated >= '#{integration.last_synced_at.strftime('%Y-%m-%d %H:%M')}'"
      else
        parts << "created >= -7d"
      end

      parts << "ORDER BY updated DESC"
      parts.join(" AND ")
    end

    def sync_issue(issue)
      issue_key = issue["key"]
      fields = issue["fields"]

      existing = Feedback.find_by_external_id("jira", issue_key)

      content = build_content(fields)
      priority = map_priority(fields.dig("priority", "name"))

      if existing
        existing.update!(
          title: fields["summary"],
          content: content,
          priority: priority,
          raw_data: issue
        )
        :updated
      else
        Feedback.create!(
          source: :jira,
          source_external_id: issue_key,
          title: fields["summary"],
          content: content,
          author_name: fields.dig("reporter", "displayName"),
          author_email: fields.dig("reporter", "emailAddress"),
          priority: priority,
          raw_data: issue
        )
        :created
      end
    end

    def build_content(fields)
      parts = []

      if fields["description"].present?
        description = extract_text_from_adf(fields["description"])
        parts << description
      end

      if fields["labels"]&.any?
        parts << "Labels: #{fields['labels'].join(', ')}"
      end

      if fields.dig("issuetype", "name")
        parts << "Type: #{fields['issuetype']['name']}"
      end

      parts.join("\n\n")
    end

    def extract_text_from_adf(adf)
      return adf if adf.is_a?(String)
      return "" unless adf.is_a?(Hash)

      content = adf["content"] || []
      content.map { |node| extract_node_text(node) }.join("\n")
    end

    def extract_node_text(node)
      return "" unless node.is_a?(Hash)

      case node["type"]
      when "text"
        node["text"] || ""
      when "paragraph", "heading"
        (node["content"] || []).map { |n| extract_node_text(n) }.join
      else
        (node["content"] || []).map { |n| extract_node_text(n) }.join
      end
    end

    def map_priority(jira_priority)
      PRIORITY_MAPPING[jira_priority] || :unset
    end

    def sync_comments(issue)
      issue_key = issue["key"]
      response = make_request("/rest/api/3/issue/#{issue_key}/comment")

      return unless response.success?

      data = JSON.parse(response.body)
      comments = data["comments"] || []

      comments.each do |comment|
        sync_comment(issue_key, comment)
      end
    end

    def sync_comment(issue_key, comment)
      comment_id = "#{issue_key}-comment-#{comment['id']}"

      return if Feedback.find_by_external_id("jira", comment_id)

      body = extract_text_from_adf(comment["body"])
      return if body.blank?

      Feedback.create!(
        source: :jira,
        source_external_id: comment_id,
        title: "Comment on #{issue_key}",
        content: body,
        author_name: comment.dig("author", "displayName"),
        author_email: comment.dig("author", "emailAddress"),
        raw_data: comment
      )
    end

    def sync_comment_from_webhook(payload)
      issue_key = payload.dig("issue", "key")
      comment = payload["comment"]

      return unless issue_key && comment

      sync_comment(issue_key, comment)
    end
  end
end
