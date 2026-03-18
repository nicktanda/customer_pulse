# Creates test issues in Linear for testing the integration
# Run with: bin/rails runner scripts/seed_linear.rb
#
# Options:
#   COUNT=10 bin/rails runner scripts/seed_linear.rb  # Create 10 issues (default: 5)

require "faraday"
require "json"

SAMPLE_FEEDBACK = [
  { title: "App crashes when uploading large files", description: "When I try to upload a file larger than 50MB, the app freezes and then crashes. This happens consistently on both Chrome and Firefox.", priority: 1 },
  { title: "Feature request: Dark mode support", description: "Would love to have a dark mode option. I work late at night and the bright interface is hard on my eyes. Many competitors already have this.", priority: 3 },
  { title: "Search results are slow to load", description: "Searching for items takes 5-10 seconds to return results. This used to be much faster. Started noticing this about a week ago.", priority: 2 },
  { title: "Cannot export data to CSV", description: "The export button doesn't work. I click it and nothing happens. I need this for my monthly reports.", priority: 2 },
  { title: "Mobile app login issues", description: "Getting 'invalid credentials' error on mobile even though the same login works on desktop. Have tried reinstalling the app.", priority: 1 },
  { title: "Dashboard graphs not rendering", description: "The analytics dashboard shows blank spaces where charts should be. Console shows JavaScript errors.", priority: 2 },
  { title: "Would be great to have Slack integration", description: "Our team lives in Slack. It would be amazing if we could get notifications and updates directly in our Slack channels.", priority: 4 },
  { title: "Duplicate notifications being sent", description: "I'm receiving 2-3 copies of every email notification. This started after the last update.", priority: 2 },
  { title: "API rate limits too restrictive", description: "We're hitting rate limits during normal usage. Current limit of 100 requests/minute is too low for our use case.", priority: 3 },
  { title: "Onboarding flow is confusing", description: "New users are getting lost in the setup process. The steps aren't clear and there's no progress indicator.", priority: 3 },
  { title: "Data sync between devices not working", description: "Changes made on my laptop don't appear on my phone until I manually refresh. Real-time sync seems broken.", priority: 2 },
  { title: "Need bulk edit functionality", description: "Managing hundreds of items one by one is painful. Please add the ability to select multiple items and edit them at once.", priority: 3 },
  { title: "Performance degradation with large datasets", description: "Once we have more than 10,000 records, the entire app becomes sluggish. Pagination doesn't seem to help.", priority: 1 },
  { title: "Keyboard shortcuts not working on Firefox", description: "All the keyboard shortcuts work fine on Chrome but none of them work on Firefox. This is affecting our power users.", priority: 3 },
  { title: "Session timeout too short", description: "Getting logged out after just 15 minutes of inactivity. This is frustrating when switching between tasks.", priority: 4 },
].freeze

class LinearSeeder
  API_URL = "https://api.linear.app/graphql"

  def initialize(integration)
    @integration = integration
    @credentials = integration.parsed_credentials
  end

  def seed(count)
    team_id = fetch_team_id
    unless team_id
      puts "Error: Could not find a team in Linear"
      return
    end

    puts "Creating #{count} test issues in Linear..."

    count.times do |i|
      sample = SAMPLE_FEEDBACK[i % SAMPLE_FEEDBACK.length]
      result = create_issue(team_id, sample)

      if result[:success]
        puts "  ✓ Created: #{sample[:title].truncate(50)}"
      else
        puts "  ✗ Failed: #{result[:error]}"
      end

      sleep 0.5 # Rate limiting
    end

    puts "\nDone! Run 'bin/rails runner scripts/test_integrations.rb' to verify, then sync to pull the data."
  end

  private

  def fetch_team_id
    query = <<~GRAPHQL
      query {
        teams(first: 1) {
          nodes {
            id
            name
          }
        }
      }
    GRAPHQL

    response = make_request(query)
    team = response.dig("data", "teams", "nodes", 0)
    puts "Using team: #{team['name']}" if team
    team&.dig("id")
  end

  def create_issue(team_id, data)
    mutation = <<~GRAPHQL
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
          }
        }
      }
    GRAPHQL

    variables = {
      input: {
        teamId: team_id,
        title: data[:title],
        description: data[:description],
        priority: data[:priority]
      }
    }

    response = make_request(mutation, variables)

    if response.dig("data", "issueCreate", "success")
      { success: true, issue: response.dig("data", "issueCreate", "issue") }
    else
      { success: false, error: response["errors"]&.first&.dig("message") || "Unknown error" }
    end
  end

  def make_request(query, variables = nil)
    body = { query: query }
    body[:variables] = variables if variables

    response = Faraday.post(API_URL) do |req|
      req.headers["Authorization"] = @credentials["api_key"]
      req.headers["Content-Type"] = "application/json"
      req.body = body.to_json
    end

    JSON.parse(response.body)
  end
end

# Main execution
integration = Integration.find_by(source_type: :linear, enabled: true)

unless integration
  puts "No enabled Linear integration found."
  puts "Run 'bin/rails runner scripts/setup_integrations.rb' first."
  exit 1
end

count = (ENV["COUNT"] || 5).to_i
LinearSeeder.new(integration).seed(count)
