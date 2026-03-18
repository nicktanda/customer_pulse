# Posts test messages to Slack for testing the integration
# Run with: bin/rails runner scripts/seed_slack.rb
#
# Options:
#   COUNT=10 bin/rails runner scripts/seed_slack.rb       # Post 10 messages (default: 5)
#   CHANNEL=C12345 bin/rails runner scripts/seed_slack.rb # Post to specific channel

require "faraday"
require "json"

# Messages containing keywords that the Slack client filters for:
# feedback, bug, issue, problem, feature, request
SAMPLE_MESSAGES = [
  "Hey team, got some feedback from a customer - they said the new dashboard is confusing and hard to navigate.",
  "Bug report: The export function is timing out for large datasets. Anyone else seeing this issue?",
  "Feature request from sales: Can we add a way to bulk-assign tags? They're spending hours doing it manually.",
  "Just got off a call with Acme Corp. They have a problem with the API response times. Sometimes waiting 30+ seconds.",
  "Customer feedback: They love the new search feature! But they're requesting fuzzy matching for typos.",
  "Seeing a weird bug in production - users are getting logged out randomly. No pattern I can see.",
  "The mobile team flagged an issue with push notifications not working on Android 14.",
  "Feature request: Multiple users asking for dark mode. Can we prioritize this?",
  "Got feedback that our onboarding emails are going to spam. We should look into our email reputation.",
  "Critical bug: Payment processing is failing intermittently. Already escalated to the payments team.",
  "User feedback from the beta group: The new UI is much faster, but they're having trouble finding settings.",
  "Problem with the search - it's not returning results for exact matches. Very frustrating for users.",
  "Feature request from enterprise client: They need SAML SSO before they can roll out to their org.",
  "Bug in the reporting module - charts show wrong dates when crossing timezone boundaries.",
  "Feedback from support: Customers are confused by the difference between 'archive' and 'delete'.",
  "Issue with webhooks - some events are being delivered multiple times. Causing duplicate data.",
  "Request from marketing: Can we add UTM tracking to all outbound links?",
  "Bug report: The calendar widget doesn't handle daylight saving time correctly.",
  "Customer feedback: They want keyboard shortcuts for power users. Tab navigation isn't enough.",
  "Problem: Large file uploads fail silently. No error message, just nothing happens.",
].freeze

class SlackSeeder
  API_URL = "https://slack.com/api"

  def initialize(integration)
    @integration = integration
    @credentials = integration.parsed_credentials
  end

  def seed(count, channel_override = nil)
    channel = channel_override || find_channel
    unless channel
      puts "Error: No channel found to post to"
      puts "Either set CHANNEL env var or configure channels in the integration"
      return
    end

    puts "Posting #{count} test messages to Slack channel #{channel}..."

    count.times do |i|
      message = SAMPLE_MESSAGES[i % SAMPLE_MESSAGES.length]
      result = post_message(channel, message)

      if result[:success]
        puts "  ✓ Posted: #{message.truncate(50)}"
      else
        puts "  ✗ Failed: #{result[:error]}"
      end

      sleep 1 # Slack rate limits are strict
    end

    puts "\nDone! Run 'bin/rails runner scripts/test_integrations.rb' to verify, then sync to pull the data."
  end

  private

  def find_channel
    # Use configured channel, env override, or find first available
    configured = @credentials["channels"]&.first
    return configured if configured

    # List channels and use first one
    response = api_request("conversations.list", { types: "public_channel", limit: 1 })
    return nil unless response["ok"]

    channel = response["channels"]&.first
    puts "Using channel: ##{channel['name']}" if channel
    channel&.dig("id")
  end

  def post_message(channel, text)
    response = api_request("chat.postMessage", {
      channel: channel,
      text: text,
      unfurl_links: false,
      unfurl_media: false
    })

    if response["ok"]
      { success: true, ts: response["ts"] }
    else
      { success: false, error: response["error"] }
    end
  end

  def api_request(method, params = {})
    response = Faraday.post("#{API_URL}/#{method}") do |req|
      req.headers["Authorization"] = "Bearer #{@credentials['bot_token']}"
      req.headers["Content-Type"] = "application/json"
      req.body = params.to_json
    end

    JSON.parse(response.body)
  end
end

# Main execution
integration = Integration.find_by(source_type: :slack, enabled: true)

unless integration
  puts "No enabled Slack integration found."
  puts "Run 'bin/rails runner scripts/setup_integrations.rb' first."
  exit 1
end

count = (ENV["COUNT"] || 5).to_i
channel = ENV["CHANNEL"]
SlackSeeder.new(integration).seed(count, channel)
