# Creates test issues in Jira for testing the integration
# Run with: bin/rails runner scripts/seed_jira.rb
#
# Options:
#   COUNT=10 bin/rails runner scripts/seed_jira.rb  # Create 10 issues (default: 5)

require "faraday"
require "json"
require "base64"

SAMPLE_ISSUES = [
  { summary: "Users unable to reset password", description: "Multiple users reporting that the password reset email never arrives. Checked spam folders, nothing there.", type: "Bug", priority: "High" },
  { summary: "Add SSO support for enterprise customers", description: "Enterprise clients are requesting SAML/SSO integration. This is blocking several large deals.", type: "Story", priority: "High" },
  { summary: "Improve error messages for API failures", description: "Current error messages are too generic. Users can't tell what went wrong or how to fix it.", type: "Improvement", priority: "Medium" },
  { summary: "Memory leak in background job processor", description: "The worker processes gradually consume more memory until they crash. Happens every 24-48 hours.", type: "Bug", priority: "Highest" },
  { summary: "Add webhook support for third-party integrations", description: "Partners want to receive real-time updates via webhooks instead of polling our API.", type: "Story", priority: "Medium" },
  { summary: "Documentation is outdated", description: "API docs reference deprecated endpoints. New developers are getting confused.", type: "Task", priority: "Low" },
  { summary: "Mobile app crashes on iOS 17", description: "Since the iOS 17 update, the app crashes immediately on launch for some users.", type: "Bug", priority: "Highest" },
  { summary: "Implement audit logging", description: "For compliance, we need to log all user actions with timestamps and IP addresses.", type: "Story", priority: "High" },
  { summary: "Search indexing is delayed", description: "New content takes 10-15 minutes to appear in search results. Users expect near real-time.", type: "Bug", priority: "Medium" },
  { summary: "Add bulk import from CSV", description: "Customers migrating from other platforms need to import thousands of records. Manual entry isn't feasible.", type: "Story", priority: "Medium" },
  { summary: "Two-factor authentication not working", description: "TOTP codes are being rejected even when entered immediately. Time sync issue?", type: "Bug", priority: "High" },
  { summary: "Create admin dashboard for usage analytics", description: "Admins need to see usage patterns, active users, and feature adoption metrics.", type: "Story", priority: "Low" },
  { summary: "File upload timeout on slow connections", description: "Users on slower internet connections get timeout errors when uploading files over 5MB.", type: "Bug", priority: "Medium" },
  { summary: "Add support for custom fields", description: "Different customers want to track different metadata. Need configurable custom fields.", type: "Story", priority: "Medium" },
  { summary: "Email notifications have broken formatting", description: "HTML emails render incorrectly in Outlook. Tables are misaligned and images don't load.", type: "Bug", priority: "Low" },
].freeze

class JiraSeeder
  def initialize(integration)
    @integration = integration
    @credentials = integration.parsed_credentials
  end

  def seed(count)
    project_key = fetch_project_key
    unless project_key
      puts "Error: Could not find a project in Jira"
      return
    end

    issue_types = fetch_issue_types(project_key)
    puts "Creating #{count} test issues in Jira project #{project_key}..."

    count.times do |i|
      sample = SAMPLE_ISSUES[i % SAMPLE_ISSUES.length]
      issue_type = find_issue_type(issue_types, sample[:type])

      result = create_issue(project_key, sample, issue_type)

      if result[:success]
        puts "  ✓ Created #{result[:key]}: #{sample[:summary].truncate(40)}"
      else
        puts "  ✗ Failed: #{result[:error]}"
      end

      sleep 0.3 # Rate limiting
    end

    puts "\nDone! Run 'bin/rails runner scripts/test_integrations.rb' to verify, then sync to pull the data."
  end

  private

  def site_url
    @credentials["site_url"]
  end

  def auth_header
    "Basic #{Base64.strict_encode64("#{@credentials['email']}:#{@credentials['api_token']}")}"
  end

  def fetch_project_key
    # Use configured project or fetch first available
    configured_keys = @credentials["project_keys"]
    return configured_keys.first if configured_keys&.any?

    response = make_request("/rest/api/3/project")
    return nil unless response.success?

    projects = JSON.parse(response.body)
    project = projects.first
    puts "Using project: #{project['name']} (#{project['key']})" if project
    project&.dig("key")
  end

  def fetch_issue_types(project_key)
    response = make_request("/rest/api/3/project/#{project_key}")
    return [] unless response.success?

    project = JSON.parse(response.body)
    project["issueTypes"] || []
  end

  def find_issue_type(types, preferred_name)
    # Try to find matching type, fall back to first available
    types.find { |t| t["name"].downcase == preferred_name.downcase } ||
      types.find { |t| t["name"] == "Task" } ||
      types.first
  end

  def create_issue(project_key, data, issue_type)
    body = {
      fields: {
        project: { key: project_key },
        summary: data[:summary],
        description: build_adf_description(data[:description]),
        issuetype: { id: issue_type["id"] }
      }
    }

    # Add priority if the field is available
    body[:fields][:priority] = { name: data[:priority] } if data[:priority]

    response = make_request("/rest/api/3/issue", method: :post, body: body)

    if response.success?
      issue = JSON.parse(response.body)
      { success: true, key: issue["key"] }
    else
      error = JSON.parse(response.body) rescue { "errorMessages" => [response.body] }
      { success: false, error: error["errorMessages"]&.join(", ") || error.to_s }
    end
  end

  def build_adf_description(text)
    {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: text }
          ]
        }
      ]
    }
  end

  def make_request(path, method: :get, body: nil)
    url = "#{site_url}#{path}"

    Faraday.send(method, url) do |req|
      req.headers["Authorization"] = auth_header
      req.headers["Content-Type"] = "application/json"
      req.headers["Accept"] = "application/json"
      req.body = body.to_json if body
    end
  end
end

# Main execution
integration = Integration.find_by(source_type: :jira, enabled: true)

unless integration
  puts "No enabled Jira integration found."
  puts "Run 'bin/rails runner scripts/setup_integrations.rb' first."
  exit 1
end

count = (ENV["COUNT"] || 5).to_i
JiraSeeder.new(integration).seed(count)
