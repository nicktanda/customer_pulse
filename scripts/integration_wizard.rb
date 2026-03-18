#!/usr/bin/env ruby
# Interactive Integration Setup Wizard for Customer Pulse
# Run with: bin/rails runner scripts/integration_wizard.rb
#
# This wizard walks you through setting up each integration step by step,
# tests the connections, and saves the credentials securely.

require "io/console"
require "faraday"
require "json"

class IntegrationWizard
  INTEGRATIONS = %w[linear slack jira google_forms].freeze

  def initialize
    @results = {}
  end

  def run
    print_header

    if Integration.exists?
      if confirm?("\nExisting integrations found. Clear them and start fresh?")
        Integration.destroy_all
        puts "  Cleared all integrations.\n"
      end
    end

    INTEGRATIONS.each do |integration|
      puts "\n" + "=" * 60
      if confirm?("Set up #{integration.titleize} integration?")
        send("setup_#{integration}")
      else
        puts "  Skipped."
      end
    end

    print_summary
  end

  private

  # ============================================================
  # LINEAR
  # ============================================================
  def setup_linear
    puts <<~INSTRUCTIONS

    LINEAR SETUP
    ────────────────────────────────────────────────────────────
    1. Go to: https://linear.app/settings/api
    2. Click "Create key"
    3. Give it a name (e.g., "Customer Pulse")
    4. Copy the API key (starts with "lin_api_")

    Required scopes: read access to issues and teams
    INSTRUCTIONS

    api_key = prompt_secret("Enter your Linear API key")
    return skip("No API key provided") if api_key.blank?

    puts "\n  Testing connection..."
    result = test_linear(api_key)

    if result[:success]
      puts "  ✓ Connected as: #{result[:user]}"
      puts "  ✓ Team found: #{result[:team]}"

      integration = Integration.find_or_create_by!(source_type: :linear) do |i|
        i.name = "Linear"
      end
      integration.update!(name: "Linear", enabled: true)
      integration.update_credentials({ "api_key" => api_key })
      integration.save!

      @results[:linear] = { success: true, message: "Connected as #{result[:user]}" }
      puts "  ✓ Saved!"
    else
      puts "  ✗ Connection failed: #{result[:error]}"
      @results[:linear] = { success: false, message: result[:error] }
    end
  end

  def test_linear(api_key)
    query = <<~GRAPHQL
      query {
        viewer { id name email }
        teams(first: 1) { nodes { id name } }
      }
    GRAPHQL

    response = Faraday.post("https://api.linear.app/graphql") do |req|
      req.headers["Authorization"] = api_key
      req.headers["Content-Type"] = "application/json"
      req.body = { query: query }.to_json
    end

    data = JSON.parse(response.body)

    if data["data"]&.dig("viewer", "id")
      {
        success: true,
        user: data["data"]["viewer"]["name"],
        team: data["data"]["teams"]["nodes"].first&.dig("name") || "No teams found"
      }
    else
      { success: false, error: data["errors"]&.first&.dig("message") || "Unknown error" }
    end
  rescue => e
    { success: false, error: e.message }
  end

  # ============================================================
  # SLACK
  # ============================================================
  def setup_slack
    puts <<~INSTRUCTIONS

    SLACK SETUP
    ────────────────────────────────────────────────────────────
    1. Go to: https://api.slack.com/apps
    2. Click "Create New App" → "From scratch"
    3. Name it (e.g., "Customer Pulse") and select your workspace
    4. Go to "OAuth & Permissions" in the sidebar
    5. Under "Bot Token Scopes", add these scopes:
       • channels:history  (read messages)
       • channels:read     (list channels)
       • chat:write        (post messages - for seeding test data)
    6. Click "Install to Workspace" at the top
    7. Copy the "Bot User OAuth Token" (starts with "xoxb-")
    INSTRUCTIONS

    bot_token = prompt_secret("Enter your Slack Bot Token")
    return skip("No token provided") if bot_token.blank?

    puts "\n  Testing connection..."
    result = test_slack(bot_token)

    if result[:success]
      puts "  ✓ Connected to workspace: #{result[:team]}"
      puts "  ✓ Available channels: #{result[:channels].take(5).join(', ')}#{result[:channels].length > 5 ? '...' : ''}"

      # Ask which channels to monitor
      puts "\n  Enter channel IDs to monitor (comma-separated), or leave blank for all:"
      puts "  Tip: You can find channel IDs by right-clicking a channel → View channel details"
      channels_input = prompt("Channel IDs (or blank)")
      channels = channels_input.split(",").map(&:strip).reject(&:blank?)

      # Ask for keywords
      default_keywords = %w[feedback bug issue problem feature request]
      puts "\n  Keywords to filter messages (comma-separated):"
      puts "  Default: #{default_keywords.join(', ')}"
      keywords_input = prompt("Keywords (or blank for defaults)")
      keywords = keywords_input.blank? ? default_keywords : keywords_input.split(",").map(&:strip)

      integration = Integration.find_or_create_by!(source_type: :slack) do |i|
        i.name = "Slack"
      end
      integration.update!(name: "Slack", enabled: true)
      integration.update_credentials({
        "bot_token" => bot_token,
        "channels" => channels,
        "keywords" => keywords
      })
      integration.save!

      @results[:slack] = { success: true, message: "Connected to #{result[:team]}" }
      puts "  ✓ Saved!"
    else
      puts "  ✗ Connection failed: #{result[:error]}"
      @results[:slack] = { success: false, message: result[:error] }
    end
  end

  def test_slack(bot_token)
    # Test auth
    auth_response = Faraday.post("https://slack.com/api/auth.test") do |req|
      req.headers["Authorization"] = "Bearer #{bot_token}"
      req.headers["Content-Type"] = "application/json"
    end
    auth_data = JSON.parse(auth_response.body)

    return { success: false, error: auth_data["error"] } unless auth_data["ok"]

    # List channels
    channels_response = Faraday.get("https://slack.com/api/conversations.list") do |req|
      req.headers["Authorization"] = "Bearer #{bot_token}"
      req.params["types"] = "public_channel"
      req.params["limit"] = 20
    end
    channels_data = JSON.parse(channels_response.body)

    channels = channels_data["ok"] ? channels_data["channels"].map { |c| "##{c['name']}" } : []

    { success: true, team: auth_data["team"], channels: channels }
  rescue => e
    { success: false, error: e.message }
  end

  # ============================================================
  # JIRA
  # ============================================================
  def setup_jira
    puts <<~INSTRUCTIONS

    JIRA SETUP
    ────────────────────────────────────────────────────────────
    1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
    2. Click "Create API token"
    3. Give it a name (e.g., "Customer Pulse")
    4. Copy the token immediately (you won't see it again)

    You'll also need:
    • Your Jira site URL (e.g., https://yourcompany.atlassian.net)
    • Your Atlassian account email
    INSTRUCTIONS

    site_url = prompt("Enter your Jira site URL (e.g., https://company.atlassian.net)")
    return skip("No site URL provided") if site_url.blank?

    # Clean up URL
    site_url = site_url.strip.chomp("/")
    site_url = "https://#{site_url}" unless site_url.start_with?("http")

    email = prompt("Enter your Atlassian email")
    return skip("No email provided") if email.blank?

    api_token = prompt_secret("Enter your Jira API token")
    return skip("No token provided") if api_token.blank?

    puts "\n  Testing connection..."
    result = test_jira(site_url, email, api_token)

    if result[:success]
      puts "  ✓ Connected as: #{result[:user]}"
      puts "  ✓ Available projects: #{result[:projects].take(5).join(', ')}#{result[:projects].length > 5 ? '...' : ''}"

      # Ask which projects to monitor
      puts "\n  Enter project keys to monitor (comma-separated), or leave blank for all:"
      projects_input = prompt("Project keys (e.g., PROJ,FEED)")
      project_keys = projects_input.split(",").map(&:strip).reject(&:blank?)

      integration = Integration.find_or_create_by!(source_type: :jira) do |i|
        i.name = "Jira"
      end
      integration.update!(name: "Jira", enabled: true)
      integration.update_credentials({
        "site_url" => site_url,
        "email" => email,
        "api_token" => api_token,
        "project_keys" => project_keys,
        "issue_types" => [],
        "import_comments" => true
      })
      integration.save!

      @results[:jira] = { success: true, message: "Connected as #{result[:user]}" }
      puts "  ✓ Saved!"
    else
      puts "  ✗ Connection failed: #{result[:error]}"
      @results[:jira] = { success: false, message: result[:error] }
    end
  end

  def test_jira(site_url, email, api_token)
    auth = Base64.strict_encode64("#{email}:#{api_token}")

    # Test auth
    user_response = Faraday.get("#{site_url}/rest/api/3/myself") do |req|
      req.headers["Authorization"] = "Basic #{auth}"
      req.headers["Accept"] = "application/json"
    end

    return { success: false, error: "HTTP #{user_response.status}" } unless user_response.success?

    user_data = JSON.parse(user_response.body)

    # List projects
    projects_response = Faraday.get("#{site_url}/rest/api/3/project") do |req|
      req.headers["Authorization"] = "Basic #{auth}"
      req.headers["Accept"] = "application/json"
    end

    projects = projects_response.success? ? JSON.parse(projects_response.body).map { |p| p["key"] } : []

    { success: true, user: user_data["displayName"], projects: projects }
  rescue => e
    { success: false, error: e.message }
  end

  # ============================================================
  # GOOGLE FORMS/SHEETS
  # ============================================================
  def setup_google_forms
    puts <<~INSTRUCTIONS

    GOOGLE FORMS/SHEETS SETUP
    ────────────────────────────────────────────────────────────
    This integration reads responses from a Google Sheet (typically
    linked to a Google Form).

    STEP 1: Create a Service Account
    1. Go to: https://console.cloud.google.com/apis/credentials
    2. Create a project if you don't have one
    3. Click "Create Credentials" → "Service Account"
    4. Name it (e.g., "customer-pulse")
    5. Click "Create and Continue" (skip optional steps)
    6. Click on the service account → "Keys" tab
    7. Add Key → Create new key → JSON
    8. Save the downloaded JSON file

    STEP 2: Enable the Sheets API
    1. Go to: https://console.cloud.google.com/apis/library/sheets.googleapis.com
    2. Click "Enable"

    STEP 3: Share your spreadsheet
    1. Open your Google Sheet
    2. Click "Share"
    3. Add the service account email (from the JSON file, ends in @...iam.gserviceaccount.com)
    4. Give it "Editor" access (needed for the seed script)
    INSTRUCTIONS

    puts "\n  Enter the path to your service account JSON file:"
    json_path = prompt("JSON file path")

    if json_path.blank?
      return skip("No JSON file provided")
    end

    json_path = File.expand_path(json_path.strip)

    unless File.exist?(json_path)
      puts "  ✗ File not found: #{json_path}"
      return skip("File not found")
    end

    begin
      google_creds = JSON.parse(File.read(json_path))
      puts "  ✓ Loaded credentials for: #{google_creds['client_email']}"
    rescue JSON::ParserError => e
      puts "  ✗ Invalid JSON: #{e.message}"
      return skip("Invalid JSON file")
    end

    spreadsheet_id = prompt("Enter your Google Spreadsheet ID (from the URL)")
    if spreadsheet_id.blank?
      return skip("No spreadsheet ID provided")
    end

    # Extract ID if full URL was pasted
    if spreadsheet_id.include?("spreadsheets/d/")
      spreadsheet_id = spreadsheet_id.match(/spreadsheets\/d\/([^\/]+)/)[1]
    end

    sheet_name = prompt("Enter the sheet/tab name (default: 'Form Responses 1')")
    sheet_name = "Form Responses 1" if sheet_name.blank?

    puts "\n  Testing connection..."
    result = test_google_sheets(google_creds, spreadsheet_id)

    if result[:success]
      puts "  ✓ Connected to spreadsheet: #{result[:title]}"
      puts "  ✓ Available sheets: #{result[:sheets].join(', ')}"

      puts "\n  Column mapping - enter column numbers (0-indexed):"
      puts "  Leave blank to use defaults: timestamp=0, email=1, title=2, content=3, author_name=4"

      use_defaults = confirm?("Use default column mapping?")

      column_mapping = if use_defaults
        { "timestamp" => 0, "email" => 1, "title" => 2, "content" => 3, "author_name" => 4 }
      else
        {
          "timestamp" => prompt("Timestamp column (default: 0)").then { |v| v.blank? ? 0 : v.to_i },
          "email" => prompt("Email column (default: 1)").then { |v| v.blank? ? 1 : v.to_i },
          "title" => prompt("Title column (default: 2)").then { |v| v.blank? ? 2 : v.to_i },
          "content" => prompt("Content column (default: 3)").then { |v| v.blank? ? 3 : v.to_i },
          "author_name" => prompt("Author name column (default: 4)").then { |v| v.blank? ? 4 : v.to_i }
        }
      end

      integration = Integration.find_or_create_by!(source_type: :google_forms) do |i|
        i.name = "Google Forms"
      end
      integration.update!(name: "Google Forms", enabled: true)
      integration.update_credentials({
        "spreadsheet_id" => spreadsheet_id,
        "sheet_name" => sheet_name,
        "google_credentials" => google_creds,
        "column_mapping" => column_mapping,
        "last_synced_row" => 1
      })
      integration.save!

      @results[:google_forms] = { success: true, message: "Connected to #{result[:title]}" }
      puts "  ✓ Saved!"
    else
      puts "  ✗ Connection failed: #{result[:error]}"
      @results[:google_forms] = { success: false, message: result[:error] }
    end
  end

  def test_google_sheets(google_creds, spreadsheet_id)
    require "google/apis/sheets_v4"
    require "googleauth"

    service = Google::Apis::SheetsV4::SheetsService.new
    service.authorization = Google::Auth::ServiceAccountCredentials.make_creds(
      json_key_io: StringIO.new(google_creds.to_json),
      scope: Google::Apis::SheetsV4::AUTH_SPREADSHEETS_READONLY
    )

    spreadsheet = service.get_spreadsheet(spreadsheet_id)
    sheets = spreadsheet.sheets.map { |s| s.properties.title }

    { success: true, title: spreadsheet.properties.title, sheets: sheets }
  rescue Google::Apis::ClientError => e
    { success: false, error: "Google API error: #{e.message}" }
  rescue => e
    { success: false, error: e.message }
  end

  # ============================================================
  # HELPERS
  # ============================================================
  def print_header
    puts <<~HEADER

    ╔══════════════════════════════════════════════════════════╗
    ║         CUSTOMER PULSE INTEGRATION WIZARD                ║
    ╠══════════════════════════════════════════════════════════╣
    ║  This wizard will help you set up your integrations.     ║
    ║  You'll need API keys/tokens from each service.          ║
    ║                                                          ║
    ║  Credentials are stored encrypted in the database.       ║
    ╚══════════════════════════════════════════════════════════╝
    HEADER
  end

  def print_summary
    puts "\n"
    puts "=" * 60
    puts "SETUP SUMMARY"
    puts "=" * 60

    INTEGRATIONS.each do |integration|
      result = @results[integration.to_sym]
      if result.nil?
        puts "  #{integration.titleize.ljust(15)} ○ Skipped"
      elsif result[:success]
        puts "  #{integration.titleize.ljust(15)} ✓ #{result[:message]}"
      else
        puts "  #{integration.titleize.ljust(15)} ✗ #{result[:message]}"
      end
    end

    enabled_count = Integration.enabled.count
    puts "\n  #{enabled_count} integration(s) enabled and ready."

    if enabled_count > 0
      puts "\n  Next steps:"
      puts "    1. Test connections:  bin/rails runner scripts/test_integrations.rb"
      puts "    2. Seed test data:    bin/rails runner scripts/seed_linear.rb"
      puts "    3. Run sync:          bin/rails runner 'Integrations::LinearClient.new(Integration.find_by(source_type: :linear)).sync'"
    end
    puts
  end

  def prompt(label)
    print "  #{label}: "
    gets&.strip || ""
  end

  def prompt_secret(label)
    print "  #{label}: "
    response = $stdin.noecho(&:gets)&.strip || ""
    puts # newline after hidden input
    response
  end

  def confirm?(question)
    print "  #{question} [y/N]: "
    response = gets&.strip&.downcase
    %w[y yes].include?(response)
  end

  def skip(reason)
    puts "  Skipped: #{reason}"
    nil
  end
end

# Run the wizard
IntegrationWizard.new.run
