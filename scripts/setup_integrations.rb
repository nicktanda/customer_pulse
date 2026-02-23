# Setup script for Customer Pulse integrations
# Run with: bin/rails runner scripts/setup_integrations.rb
#
# Required environment variables:
#   LINEAR_API_KEY
#   SLACK_BOT_TOKEN
#   JIRA_SITE_URL
#   JIRA_EMAIL
#   JIRA_API_TOKEN
#   GOOGLE_SPREADSHEET_ID
#   GOOGLE_SHEET_NAME
#   GOOGLE_CREDENTIALS_JSON (or set in file)

puts "Setting up integrations..."

# Linear
if ENV['LINEAR_API_KEY'].present?
  Integration.find_by(name: 'Linear Production')&.tap do |i|
    i.update_credentials({
      'api_key' => ENV['LINEAR_API_KEY']
    })
    i.save!
    puts "✓ Linear Production configured"
  end
else
  puts "⚠ LINEAR_API_KEY not set, skipping Linear"
end

# Slack
if ENV['SLACK_BOT_TOKEN'].present?
  Integration.find_by(name: 'Slack')&.tap do |i|
    i.update_credentials({
      'bot_token' => ENV['SLACK_BOT_TOKEN'],
      'channels' => ENV.fetch('SLACK_CHANNELS', '').split(','),
      'keywords' => ['feedback', 'bug', 'issue', 'problem', 'feature', 'request']
    })
    i.save!
    puts "✓ Slack configured"
  end
else
  puts "⚠ SLACK_BOT_TOKEN not set, skipping Slack"
end

# Jira
if ENV['JIRA_API_TOKEN'].present?
  Integration.find_by(name: 'Jira Feedback')&.tap do |i|
    i.update_credentials({
      'site_url' => ENV['JIRA_SITE_URL'],
      'email' => ENV['JIRA_EMAIL'],
      'api_token' => ENV['JIRA_API_TOKEN'],
      'project_keys' => ENV.fetch('JIRA_PROJECT_KEYS', '').split(','),
      'issue_types' => [],
      'import_comments' => true
    })
    i.save!
    puts "✓ Jira Feedback configured"
  end
else
  puts "⚠ JIRA_API_TOKEN not set, skipping Jira"
end

# Google Forms
if ENV['GOOGLE_SPREADSHEET_ID'].present?
  Integration.find_by(name: 'Google Forms')&.tap do |i|
    google_creds = if ENV['GOOGLE_CREDENTIALS_JSON'].present?
      JSON.parse(ENV['GOOGLE_CREDENTIALS_JSON'])
    else
      puts "⚠ GOOGLE_CREDENTIALS_JSON not set"
      nil
    end

    i.update_credentials({
      'spreadsheet_id' => ENV['GOOGLE_SPREADSHEET_ID'],
      'sheet_name' => ENV.fetch('GOOGLE_SHEET_NAME', 'Form Responses 1'),
      'google_credentials' => google_creds,
      'column_mapping' => {
        'timestamp' => 0,
        'email' => 1,
        'title' => 2,
        'content' => 3,
        'author_name' => 4
      }
    })
    i.save!
    puts "✓ Google Forms configured"
  end
else
  puts "⚠ GOOGLE_SPREADSHEET_ID not set, skipping Google Forms"
end

puts "\nSetup complete!"
puts "\nTo test connections, run:"
puts "  bin/rails runner scripts/test_integrations.rb"
