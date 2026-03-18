#!/usr/bin/env ruby
# Integration Status Dashboard for Customer Pulse
# Run with: bin/rails runner scripts/integration_status.rb
#
# Shows status of all integrations with quick links to manage them.

require "faraday"
require "json"

class IntegrationDashboard
  WORKSPACE_LINKS = {
    linear: {
      settings: "https://linear.app/settings/api",
      issues: ->(creds) { "https://linear.app" }
    },
    slack: {
      settings: "https://api.slack.com/apps",
      workspace: ->(creds) { "https://app.slack.com" }
    },
    jira: {
      settings: ->(creds) { "#{creds['site_url']}/secure/admin" rescue "https://id.atlassian.com/manage-profile/security/api-tokens" },
      projects: ->(creds) { "#{creds['site_url']}/jira/projects" rescue nil }
    },
    google_forms: {
      settings: "https://console.cloud.google.com/apis/credentials",
      spreadsheet: ->(creds) { "https://docs.google.com/spreadsheets/d/#{creds['spreadsheet_id']}" rescue nil }
    },
    gong: {
      settings: "https://app.gong.io/settings/api"
    },
    excel_online: {
      settings: "https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps"
    }
  }.freeze

  def run
    print_header
    print_integrations
    print_quick_actions
  end

  private

  def print_header
    puts <<~HEADER

    ╔══════════════════════════════════════════════════════════════════════╗
    ║              CUSTOMER PULSE INTEGRATION DASHBOARD                    ║
    ╚══════════════════════════════════════════════════════════════════════╝
    HEADER
  end

  def print_integrations
    integrations = Integration.order(:source_type)

    if integrations.empty?
      puts "  No integrations configured yet."
      puts "  Run: bin/rails runner scripts/integration_wizard.rb"
      return
    end

    integrations.each do |integration|
      print_integration(integration)
    end
  end

  def print_integration(integration)
    creds = integration.parsed_credentials
    links = WORKSPACE_LINKS[integration.source_type.to_sym] || {}

    status_icon = integration.enabled? ? "●" : "○"
    status_color = integration.enabled? ? "\e[32m" : "\e[90m" # green or gray
    reset = "\e[0m"

    puts "\n┌─────────────────────────────────────────────────────────────────────"
    puts "│ #{status_color}#{status_icon}#{reset} #{integration.name.upcase} (#{integration.source_type})"
    puts "├─────────────────────────────────────────────────────────────────────"

    # Status
    puts "│  Status:      #{integration.enabled? ? '✓ Enabled' : '○ Disabled'}"

    # Last sync
    if integration.last_synced_at
      ago = time_ago_in_words(integration.last_synced_at)
      puts "│  Last Sync:   #{integration.last_synced_at.strftime('%Y-%m-%d %H:%M')} (#{ago})"
    else
      puts "│  Last Sync:   Never"
    end

    # Sync frequency
    if integration.sync_frequency_minutes
      puts "│  Frequency:   Every #{integration.sync_frequency_minutes} minutes"
    end

    # Connection test
    print "│  Connection:  "
    result = test_connection(integration)
    if result[:success]
      puts "✓ #{result[:message]}"
    else
      puts "✗ #{result[:message]}"
    end

    # Integration-specific details
    print_integration_details(integration, creds)

    # Links
    puts "│"
    puts "│  Quick Links:"

    links.each do |name, url_or_proc|
      url = url_or_proc.is_a?(Proc) ? url_or_proc.call(creds) : url_or_proc
      puts "│    → #{name.to_s.titleize}: #{url}" if url
    end

    puts "└─────────────────────────────────────────────────────────────────────"
  end

  def print_integration_details(integration, creds)
    case integration.source_type.to_sym
    when :linear
      puts "│  API Key:     #{mask_key(creds['api_key'])}"

    when :slack
      puts "│  Bot Token:   #{mask_key(creds['bot_token'])}"
      channels = creds['channels'] || []
      puts "│  Channels:    #{channels.any? ? channels.join(', ') : '(all)'}"
      keywords = creds['keywords'] || []
      puts "│  Keywords:    #{keywords.join(', ')}"

    when :jira
      puts "│  Site URL:    #{creds['site_url']}"
      puts "│  Email:       #{creds['email']}"
      puts "│  API Token:   #{mask_key(creds['api_token'])}"
      projects = creds['project_keys'] || []
      puts "│  Projects:    #{projects.any? ? projects.join(', ') : '(all)'}"

    when :google_forms
      puts "│  Spreadsheet: #{creds['spreadsheet_id']}"
      puts "│  Sheet:       #{creds['sheet_name']}"
      if creds['google_credentials']
        email = creds['google_credentials']['client_email'] rescue nil
        puts "│  Service Acc: #{email}" if email
      end
      puts "│  Last Row:    #{creds['last_synced_row'] || 1}"
    end
  end

  def test_connection(integration)
    client_class = case integration.source_type.to_sym
    when :linear then Integrations::LinearClient
    when :slack then Integrations::SlackClient
    when :jira then Integrations::JiraClient
    when :google_forms then Integrations::GoogleFormsClient
    else nil
    end

    return { success: false, message: "No client available" } unless client_class

    client_class.new(integration).test_connection
  rescue => e
    { success: false, message: e.message }
  end

  def print_quick_actions
    puts <<~ACTIONS

    ════════════════════════════════════════════════════════════════════════
    QUICK ACTIONS
    ════════════════════════════════════════════════════════════════════════

      Setup/Reconfigure:
        bin/rails runner scripts/integration_wizard.rb

      Test All Connections:
        bin/rails runner scripts/test_integrations.rb

      Seed Test Data:
        bin/rails runner scripts/seed_linear.rb
        bin/rails runner scripts/seed_jira.rb
        bin/rails runner scripts/seed_slack.rb
        bin/rails runner scripts/seed_google_sheets.rb

      Manual Sync:
        bin/rails runner 'Integration.enabled.each { |i| puts i.name; Integrations::LinearClient.new(i).sync if i.linear? }'

      Toggle Integration:
        bin/rails runner 'Integration.find_by(source_type: :slack).update!(enabled: false)'

    ACTIONS
  end

  def mask_key(key)
    return "(not set)" if key.blank?
    return key if key.length < 10
    "#{key[0..7]}...#{key[-4..]}"
  end

  def time_ago_in_words(time)
    seconds = Time.current - time
    case seconds
    when 0..59 then "just now"
    when 60..3599 then "#{(seconds / 60).to_i} minutes ago"
    when 3600..86399 then "#{(seconds / 3600).to_i} hours ago"
    else "#{(seconds / 86400).to_i} days ago"
    end
  end
end

IntegrationDashboard.new.run
