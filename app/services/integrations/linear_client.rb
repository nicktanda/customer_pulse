module Integrations
  class LinearClient < BaseClient
    API_URL = "https://api.linear.app/graphql"

    def test_connection
      response = make_request(test_query)

      if response["data"]&.dig("viewer", "id")
        { success: true, message: "Connected as #{response['data']['viewer']['name']}" }
      else
        { success: false, message: response["errors"]&.first&.dig("message") || "Unknown error" }
      end
    rescue => e
      { success: false, message: e.message }
    end

    def sync
      # Linear primarily uses webhooks, but we can fetch recent issues if needed
      response = make_request(recent_issues_query)

      issues = response.dig("data", "issues", "nodes") || []
      created_count = 0

      issues.each do |issue|
        next if Feedback.find_by_external_id("linear", issue["id"])

        Feedback.create!(
          source: :linear,
          source_external_id: issue["id"],
          title: issue["title"],
          content: issue["description"] || issue["title"],
          author_name: issue.dig("creator", "name"),
          author_email: issue.dig("creator", "email"),
          raw_data: issue
        )
        created_count += 1
      end

      integration.mark_synced!
      { success: true, created: created_count }
    rescue => e
      { success: false, message: e.message }
    end

    private

    def make_request(query)
      response = Faraday.post(API_URL) do |req|
        req.headers["Authorization"] = credentials["api_key"]
        req.headers["Content-Type"] = "application/json"
        req.body = { query: query }.to_json
      end

      JSON.parse(response.body)
    end

    def test_query
      <<~GRAPHQL
        query {
          viewer {
            id
            name
            email
          }
        }
      GRAPHQL
    end

    def recent_issues_query
      <<~GRAPHQL
        query {
          issues(first: 50, orderBy: createdAt) {
            nodes {
              id
              title
              description
              priority
              createdAt
              creator {
                id
                name
                email
              }
              labels {
                nodes {
                  id
                  name
                }
              }
            }
          }
        }
      GRAPHQL
    end
  end
end
